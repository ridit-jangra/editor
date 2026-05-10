import { tool } from "ai";
import { z } from "zod";
import { dirname } from "../../../../services/src/VirtualFileSystemService/utils";
import type { ToolContext } from "./types";

export function createFileWriteTool({
  fileSystem,
  explorerService,
}: ToolContext) {
  return tool({
    title: "FileWrite",
    description:
      `Write (or overwrite) a file on the filesystem.\n\n` +
      `cwd: ${explorerService.structure?.path ?? ""}\n\n` +
      `Path resolution:\n` +
      `- Absolute path → used as-is\n` +
      `- Relative path → resolved against cwd\n\n` +
      `If overwriting an existing file, read it with FileRead first. ` +
      `For small targeted edits prefer FileReplace over FileWrite.`,
    inputSchema: z.object({
      path: z.string().describe("Absolute file path to write to"),
      content: z.string().describe("Content to write"),
    }),
    execute: async ({ path, content }) => {
      try {
        await fileSystem.mkdir(dirname(path), { recursive: true });
        await fileSystem.writeFile(path, content);
        return { success: true, path };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createFileReplaceTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileReplace",
    description:
      "Replace a specific string or block of text inside a file. " +
      "Safer than FileWrite for targeted changes — will not touch surrounding content. " +
      "old_str must match exactly (including whitespace) and appear exactly once. " +
      "Fails if old_str is not found or is ambiguous.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path of the file to edit"),
      old_str: z
        .string()
        .describe("Exact string to find (must be unique in the file)"),
      new_str: z.string().describe("Replacement string"),
    }),
    execute: async ({ path, old_str, new_str }) => {
      try {
        const content = await fileSystem.readFile(path);
        const occurrences = content.split(old_str).length - 1;

        if (occurrences === 0) {
          return {
            success: false,
            error:
              "old_str not found in file. Check whitespace and indentation.",
          };
        }
        if (occurrences > 1) {
          return {
            success: false,
            error:
              `old_str appears ${occurrences} times — it must be unique. ` +
              "Add more surrounding context to make it unambiguous.",
          };
        }

        const updated = content.replace(old_str, new_str);
        await fileSystem.writeFile(path, updated);
        return { success: true, path };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createFileAppendTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileAppend",
    description:
      "Append text to the end of an existing file. " +
      "Creates the file if it doesn't exist. " +
      "Useful for adding lines to a config, log, or list file.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path of the file"),
      content: z.string().describe("Text to append"),
      newline: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Ensure a newline separates the appended content from existing content (default: true)",
        ),
    }),
    execute: async ({ path, content, newline }) => {
      try {
        let existing = "";
        const exists = await fileSystem.exists(path);
        if (exists) {
          existing = await fileSystem.readFile(path);
        }

        const separator =
          newline && existing.length > 0 && !existing.endsWith("\n")
            ? "\n"
            : "";
        await fileSystem.writeFile(path, existing + separator + content);
        return { success: true, path };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createFileRenameTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileRename",
    description:
      "Rename or move a file or directory to a new path. " +
      "Creates the destination parent directory if needed.",
    inputSchema: z.object({
      old_path: z
        .string()
        .describe("Current absolute path of the file/directory"),
      new_path: z.string().describe("New absolute path (rename destination)"),
    }),
    execute: async ({ old_path, new_path }) => {
      try {
        await fileSystem.mkdir(dirname(new_path), { recursive: true });
        await fileSystem.rename(old_path, new_path);
        return { success: true, old_path, new_path };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createFileDeleteTool({ fileSystem }: ToolContext) {
  return tool({
    title: "FileDelete",
    description:
      "Delete a file or directory. " +
      "Set recursive=true to delete a non-empty directory and all its contents. " +
      "This is permanent — confirm with the user before calling unless explicitly asked.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to delete"),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, deletes directories and their contents recursively",
        ),
    }),
    execute: async ({ path, recursive }) => {
      try {
        await fileSystem.rm(path, { recursive: recursive ?? false });
        return { success: true, path };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
