import { type LanguageModel, type ToolSet } from "ai";
import { Service } from "../../../services/src/service";
import type { EditorService } from "../../../services/src/EditorService";
import type { FileSystemService } from "../../../services/src/FileSystemService";
import type { StorageService } from "../../../services/src/StorageService";
import type { ExplorerService } from "../../../services/src/ExplorerService";
import type { LspService } from "../../../services/src/LspService";
import type { EventEmitter } from "../../../services/src/emitter";

import { runLLM, buildProvider, type ProviderConfig } from "@ridit/ai/ai";
import { createMemoryTools } from "@ridit/ai/tools";
import { type Store, type Session } from "@ridit/ai/utils";

import { buildStore } from "./_store";
import { buildSystemPrompt } from "./_prompts/system";
import { createToolSet } from "./_tools";

export type AIServiceOptions = {
  services: {
    editorService: EditorService;
    fileSystem: FileSystemService;
    storageService: StorageService;
    explorerService: ExplorerService;
    lspService?: LspService;
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
  private readonly explorerService: ExplorerService;
  private readonly lspService: LspService | undefined;
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
    this.lspService = services.lspService;
    this.explorerService = services.explorerService;
  }

  getOrCreateStore(): Store {
    if (this.store !== null) return this.store;
    this.store = buildStore(this.storageService);
    return this.store;
  }

  async createProvider(config: ProviderConfig & { default?: boolean }) {
    const provider = buildProvider(config);
    await this.storageService.set(
      `ai-provider-${config.provider}-${config.model}`,
      provider,
      "ai",
    );
    if (config.default === true) this.defaultProvider = provider;
    return provider;
  }

  async getProvider(
    providerType: ProviderConfig["provider"],
    model: string,
  ): Promise<LanguageModel | null> {
    return this.storageService.get(
      `ai-provider-${providerType}-${model}`,
      "ai",
    );
  }

  createTools(): ToolSet {
    return createToolSet({
      fileSystem: this.fileSystem,
      editorService: this.editorService,
      explorerService: this.explorerService,
    });
  }

  async chat({
    prompt,
    withMemory,
    provider,
  }: ChatOptions): Promise<{ text: string; session: Session }> {
    const _provider = this.defaultProvider ?? provider;
    if (!_provider) throw new Error("[AIService] No provider configured.");

    const memoryTools = withMemory
      ? createMemoryTools(this.getOrCreateStore())
      : {};

    const tools: ToolSet = { ...memoryTools, ...this.createTools() };

    const cwd = this.explorerService.structure?.path ?? "";
    const system = buildSystemPrompt(cwd);

    return runLLM({
      prompt,
      provider: _provider,
      system,
      tools,
      onToolResult: ({ toolName, input, output }) => {
        console.log(
          `[AIService][${toolName}] input=${JSON.stringify(input)} output=${JSON.stringify(output)}`,
        );
      },
    });
  }
}
