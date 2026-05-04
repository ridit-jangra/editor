import { Service } from "../../../services/src/service";
import { tool, type LanguageModel, type ToolSet } from "ai";
import type { EditorService } from "../../../services/src/EditorService";
import type { FileSystemService } from "../../../services/src/FileSystemService";
import { z } from "zod";
import {
  runLLM,
  buildProvider,
  getModel,
  type ProviderConfig,
  type ProviderType,
} from "@ridit/ai/ai";
import { createMemoryTools, ThinkTool } from "@ridit/ai/tools";
import { createStore, type Session, type Store } from "@ridit/ai/utils";
import type { EventEmitter } from "../../../services/src/emitter";
import type { StorageService } from "../../../services/src/StorageService";
import { dirname } from "../../../services/src/VirtualFileSystemService/utils";

export type AIServiceOptions = {
  services: {
    editorService: EditorService;
    fileSystem: FileSystemService;
    storageService: StorageService;
  };
};

export type ChatOptions = {
  prompt: string;
  withMemory?: boolean;
  provider?: LanguageModel;
};

export class AIService extends Service {
  private readonly editorService: EditorService;
  private readonly fileSystem: FileSystemService;
  private readonly storageService: StorageService;

  private defaultProvider: LanguageModel | null = null;
  private store: Store | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    { services }: AIServiceOptions,
  ) {
    super("AIService");

    this.editorService = services.editorService;
    this.fileSystem = services.fileSystem;
    this.storageService = services.storageService;
  }

  getOrCreateStore() {
    if (this.store !== null) return this.store;
    const storageService = this.storageService;

    const store = createStore({
      session: {
        list: async () => {
          return await this.storageService.get("ai-sessions", "ai");
        },
        async load(id) {
          const sessions = await this.list();
          return sessions.find((s) => s.id === id) ?? null;
        },
        async save(session) {
          const sessions = await this.list();
          const newSessions = [...sessions, session];

          await storageService.set("ai-sessions", newSessions, "ai");
        },
      },
      memory: {
        list: async (): Promise<string[]> => {
          const memories: Record<string, string> | null =
            await this.storageService.get("ai-memory", "ai");
          return memories ? Object.keys(memories) : [];
        },

        async read(name: string): Promise<string | null> {
          const memories: Record<string, string> | null =
            await storageService.get("ai-memory", "ai");
          if (!memories) return null;
          return memories[name] ?? null;
        },

        async write(name: string, content: string): Promise<void> {
          const memories: Record<string, string> =
            (await storageService.get("ai-memory", "ai")) ?? {};
          memories[name] = content;
          await storageService.set("ai-memory", memories, "ai");
        },
      },
    });

    this.store = store;

    return store;
  }

  async createProvider(
    config: ProviderConfig & {
      default?: boolean;
    },
  ) {
    const provider = buildProvider(config);
    await this.storageService.set(
      `ai-provider-${config.provider}-${config.model}`,
      provider,
      "ai",
    );

    if (config.default && config.default === true)
      this.defaultProvider = provider;

    return provider;
  }

  async getProvider(
    providerType: ProviderConfig["provider"],
    model: string,
  ): Promise<LanguageModel | null> {
    const provider = await this.storageService.get(
      `ai-provider-${providerType}-${model}`,
      "ai",
    );

    return provider;
  }

  async createTools(): Promise<ToolSet> {
    const FileWriteTool = tool({
      title: "FileWrite",
      description:
        "Write a file to the local filesystem." +
        "\n\n" +
        `Write a file to the local filesystem. Overwrites the existing file if there is one.

Path resolution rules:
- If an absolute path is provided, use it as-is
- If a relative path is provided, resolve it against the current working directory

Before using this tool:

1. If overwriting an existing file, use ReadFile first to understand its contents.
   If creating a new file, skip this step.`,
      inputSchema: z.object({
        path: z.string().describe("The absolute file path to write to"),
        content: z.string().describe("The content to write to the file"),
      }),
      execute: async ({ path, content }) => {
        try {
          await this.fileSystem.mkdir(dirname(path), { recursive: true });
          await this.fileSystem.writeFile(path, content);
          return { success: true, path, content };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    });

    const MAX_LINES_TO_READ = 2000;
    const MAX_LINE_LENGTH = 2000;

    const FileReadTool = tool({
      title: "FileRead",
      description:
        "Read a file from the local filesystem." +
        "\n\n" +
        `Reads a file from the local filesystem. The path parameter must be an absolute path, not a relative path. By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file. You can optionally specify line_start and line_end (1-indexed, inclusive) to read a specific range — e.g. line_start=10, line_end=50 reads lines 10 to 50. Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated.`,
      inputSchema: z.object({
        path: z.string().describe("The absolute file path to read"),
        line_start: z
          .number()
          .optional()
          .describe("Line number to start reading from (1-indexed)"),
        line_end: z
          .number()
          .optional()
          .describe("Line number to stop reading at (inclusive)"),
      }),
      execute: async ({ path, line_start, line_end }) => {
        try {
          const raw = await this.fileSystem.readFile(path);
          let lines = raw.split("\n");
          const totalLines = lines.length;

          const start = line_start ? line_start - 1 : 0;
          const end = line_end ?? Math.min(lines.length, MAX_LINES_TO_READ);

          lines = lines
            .slice(start, end)
            .map((line) =>
              line.length > MAX_LINE_LENGTH
                ? line.slice(0, MAX_LINE_LENGTH) + " [truncated]"
                : line,
            );

          const content = lines
            .map((line, i) => `${String(start + i + 1).padStart(6)}\t${line}`)
            .join("\n");

          return { success: true, content, totalLines };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    });

    const GlobTool = tool({
      title: "Glob",
      description: "Find files matching a glob pattern in the filesystem.",
      inputSchema: z.object({
        pattern: z
          .string()
          .describe("Glob pattern e.g. '**/*.ts' or 'src/**/*.json'"),
        cwd: z
          .string()
          .optional()
          .describe("Directory to search in. Defaults to root."),
      }),
      execute: async ({ pattern, cwd }) => {
        try {
          const files = await this.fileSystem.glob(pattern, { cwd });
          return { success: true, files };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    });

    const tools = {
      ThinkTool,
      FileWriteTool,
      FileReadTool,
      GlobTool,
    } as ToolSet;

    return tools;
  }

  async chat({
    prompt,
    withMemory,
    provider,
  }: ChatOptions): Promise<{ text: string; session: Session }> {
    const memoryTools = withMemory
      ? createMemoryTools(this.getOrCreateStore())
      : {};

    const _provider = this.defaultProvider ?? provider;

    if (!_provider) throw new Error("[AIService] No provider found");

    const tools = { ...memoryTools, ...(await this.createTools()) };

    const result = await runLLM({
      prompt: prompt,
      provider: _provider,
      tools,
      onToolResult: (toolResult) => {
        console.log(
          `[AIService]:[Tool Result]:[${toolResult.toolName}]:[input: ${JSON.stringify(toolResult.input)}]:[output: ${JSON.stringify(toolResult.output)}]`,
        );
      },
    });

    return result;
  }
}
