import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";

export function createEditorOpenFileTool({ editorService }: ToolContext) {
  return tool({
    title: "EditorOpenFile",
    description: "Open a file inside the editor by its absolute path.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path of the file to open"),
    }),
    execute: async ({ path }) => {
      try {
        await editorService.open(path);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorGetCurrentFileTool({ editorService }: ToolContext) {
  return tool({
    title: "EditorGetCurrentFile",
    description:
      "Get the absolute path of the currently active file in the editor.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return { success: true, path: editorService.getCurrentFile() };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorGetCursorPositionTool({
  editorService,
}: ToolContext) {
  return tool({
    title: "EditorGetCursorPosition",
    description:
      "Get the current cursor position (line and column) in the editor.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return { success: true, position: editorService.getCursorPosition() };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorGetSelectionTool({ editorService }: ToolContext) {
  return tool({
    title: "EditorGetSelection",
    description:
      "Get the currently selected text in the editor, including its range.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return { success: true, selection: editorService.getSelection() };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorDiagnosticsTool({ editorService }: ToolContext) {
  return tool({
    title: "EditorDiagnostics",
    description:
      "Get the current editor diagnostics (errors, warnings, hints) for the active file. " +
      "Call this after making edits to verify nothing is broken.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return { success: true, diagnostics: editorService.getDiagnostics() };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorInsertAtCursorTool({ editorService }: ToolContext) {
  return tool({
    title: "EditorInsertAtCursor",
    description: "Insert text at the current cursor position in the editor.",
    inputSchema: z.object({
      text: z.string().describe("Text to insert at the cursor"),
    }),
    execute: async ({ text }) => {
      try {
        await editorService.insertAtCursor(text);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorReplaceSelectionTool({
  editorService,
}: ToolContext) {
  return tool({
    title: "EditorReplaceSelection",
    description:
      "Replace the currently selected text in the editor with new text.",
    inputSchema: z.object({
      text: z.string().describe("Replacement text"),
    }),
    execute: async ({ text }) => {
      try {
        await editorService.replaceSelection(text);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}

export function createEditorReplaceFileContentTool({
  editorService,
}: ToolContext) {
  return tool({
    title: "EditorReplaceFileContent",
    description:
      "Replace the entire content of the currently open file in the editor. " +
      "Applied via the Monaco edit API (supports undo) without touching the filesystem directly.",
    inputSchema: z.object({
      content: z
        .string()
        .describe("The new full content to replace the file with"),
    }),
    execute: async ({ content }) => {
      try {
        await editorService.replaceFileContent(content);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
