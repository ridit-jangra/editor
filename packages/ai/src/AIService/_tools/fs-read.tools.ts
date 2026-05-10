import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";

const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;

export function createFileReadTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileRead",
    description:
      `Read a file from the local filesystem.\n\n` +
      `The path must be absolute. Reads up to ${MAX_LINES_TO_READ} lines by default. ` +
      `Use line_start / line_end (1-indexed, inclusive) to read a specific range. ` +
      `Lines longer than ${MAX_LINE_LENGTH} characters are truncated.`,
    inputSchema: z.object({
      path: z.string().describe("Absolute file path to read"),
      line_start: z
        .number()
        .optional()
        .describe("First line to read (1-indexed)"),
      line_end: z.number().optional().describe("Last line to read (inclusive)"),
    }),
    execute: async ({ path, line_start, line_end }) => {
      try {
        const raw = await fileSystem.readFile(path);
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
}

export function createMultiFileReadTool({ fileSystem }: ToolContext) {
  return tool({
    title: "MultiFileRead",
    description:
      "Read multiple files at once and return all their contents. " +
      "More efficient than calling FileRead repeatedly when you need several files.",
    inputSchema: z.object({
      paths: z
        .array(z.string())
        .min(2)
        .max(20)
        .describe("Array of absolute file paths to read (2–20 files)"),
    }),
    execute: async ({ paths }) => {
      const results: Record<
        string,
        { success: boolean; content?: string; error?: string }
      > = {};

      await Promise.all(
        paths.map(async (path) => {
          try {
            const content = await fileSystem.readFile(path);
            results[path] = { success: true, content };
          } catch (err) {
            results[path] = { success: false, error: String(err) };
          }
        }),
      );

      return { success: true, results };
    },
  });
}

export function createFileExistsTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileExists",
    description:
      "Check if a file or directory exists at the given path and return its type.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to check"),
    }),
    execute: async ({ path }) => {
      try {
        const exists = await fileSystem.exists(path);
        if (!exists) return { success: true, exists: false };

        const stat = await fileSystem.stat(path);
        return {
          success: true,
          exists: true,
          isFile: !stat.isDirectory,
          isDirectory: !!stat.isDirectory,
          size: stat.size ?? null,
          modifiedAt: stat.mtime ?? null,
        };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createFileSearchTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileSearch",
    description:
      "Search for a text pattern across multiple files (like grep). " +
      "Returns matching lines with file path and line number. " +
      "Use to find where a function is defined, where a variable is used, " +
      "or any string/regex pattern across the codebase.",
    inputSchema: z.object({
      pattern: z
        .string()
        .describe(
          "Text or regex pattern to search for (case-insensitive by default)",
        ),
      glob: z
        .string()
        .optional()
        .default("**/*")
        .describe("Glob pattern to filter which files to search"),
      cwd: z
        .string()
        .optional()
        .describe("Directory to search in. Defaults to workspace root."),
      case_sensitive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the search is case-sensitive"),
      max_results: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of matching lines to return"),
      context_lines: z
        .number()
        .optional()
        .default(2)
        .describe("Number of lines of context to show around each match"),
    }),
    execute: async ({
      pattern,
      glob,
      cwd,
      case_sensitive,
      max_results,
      context_lines,
    }) => {
      try {
        const files = await fileSystem.glob(glob ?? "**/*", { cwd });
        const regex = new RegExp(pattern, case_sensitive ? "g" : "gi");

        const results: Array<{
          file: string;
          line: number;
          match: string;
          context: string[];
        }> = [];

        for (const file of files) {
          if (results.length >= (max_results ?? 50)) break;

          let raw: string;
          try {
            raw = await fileSystem.readFile(file);
          } catch {
            continue;
          }

          const lines = raw.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= (max_results ?? 50)) break;
            regex.lastIndex = 0;

            if (regex.test(lines[i]!)) {
              const ctxStart = Math.max(0, i - (context_lines ?? 2));
              const ctxEnd = Math.min(
                lines.length - 1,
                i + (context_lines ?? 2),
              );
              const context = lines
                .slice(ctxStart, ctxEnd + 1)
                .map(
                  (l, idx) =>
                    `${String(ctxStart + idx + 1).padStart(6)}\t${
                      ctxStart + idx === i ? ">" : " "
                    } ${l}`,
                );

              results.push({
                file,
                line: i + 1,
                match: lines[i]!.trim(),
                context,
              });
            }
          }
        }

        return { success: true, totalMatches: results.length, results };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createGlobTool({ fileSystem }: ToolContext) {
  return tool({
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
        const files = await fileSystem.glob(pattern, { cwd });
        return { success: true, files };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createDirectoryListTool({ fileSystem }: ToolContext) {
  return tool({
    title: "DirectoryList",
    description:
      "List the immediate files and subdirectories inside a directory. " +
      "Use for a quick overview of a single directory's contents.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path of the directory to list"),
    }),
    execute: async ({ path }) => {
      try {
        const entries = await fileSystem.readdir(path);
        return { success: true, entries };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createDirectoryTreeTool({
  fileSystem,
  explorerService,
}: ToolContext) {
  return tool({
    title: "DirectoryTree",
    description:
      "Get a recursive tree view of a directory. " +
      "Useful for understanding project layout before making edits.",
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe(
          "Absolute path of the directory. Defaults to workspace root.",
        ),
      max_depth: z
        .number()
        .optional()
        .default(4)
        .describe("Maximum depth of the tree to display"),
    }),
    execute: async ({ path, max_depth }) => {
      try {
        const root = path ?? explorerService.structure?.path ?? "/";
        const tree = await fileSystem.readTree(root);
        const depth = max_depth ?? 4;

        const render = (node: any, indent = 0): string => {
          if (indent > depth) return "";
          const prefix = "  ".repeat(indent);
          const name = node.name ?? node.path?.split("/").pop() ?? "?";
          const isDir =
            node.type === "directory" ||
            node.isDirectory ||
            Array.isArray(node.children);
          const icon = isDir ? "📁" : "📄";
          let out = `${prefix}${icon} ${name}\n`;
          if (isDir && node.children) {
            for (const child of node.children) {
              out += render(child, indent + 1);
            }
          }
          return out;
        };

        return { success: true, tree: render(tree) };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
