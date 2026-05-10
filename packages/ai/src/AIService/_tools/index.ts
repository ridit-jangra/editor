import { type ToolSet } from "ai";
import { ThinkTool } from "@ridit/ai/tools";
import type { ToolContext } from "./types";

import {
  createFileReadTool,
  createMultiFileReadTool,
  createFileExistsTool,
  createFileSearchTool,
  createGlobTool,
  createDirectoryListTool,
  createDirectoryTreeTool,
} from "./fs-read.tools";

import {
  createFileWriteTool,
  createFileReplaceTool,
  createFileAppendTool,
  createFileRenameTool,
  createFileDeleteTool,
} from "./fs-write.tools";

import {
  createEditorOpenFileTool,
  createEditorGetCurrentFileTool,
  createEditorGetCursorPositionTool,
  createEditorGetSelectionTool,
  createEditorDiagnosticsTool,
  createEditorInsertAtCursorTool,
  createEditorReplaceSelectionTool,
  createEditorReplaceFileContentTool,
} from "./editor.tools";

export type { ToolContext };

export function createToolSet(ctx: ToolContext): ToolSet {
  return {
    ThinkTool,

    FileReadTool: createFileReadTool(ctx),
    MultiFileReadTool: createMultiFileReadTool(ctx),
    FileExistsTool: createFileExistsTool(ctx),
    FileSearchTool: createFileSearchTool(ctx),
    GlobTool: createGlobTool(ctx),
    DirectoryListTool: createDirectoryListTool(ctx),
    DirectoryTreeTool: createDirectoryTreeTool(ctx),

    FileWriteTool: createFileWriteTool(ctx),
    FileReplaceTool: createFileReplaceTool(ctx),
    FileAppendTool: createFileAppendTool(ctx),
    FileRenameTool: createFileRenameTool(ctx),
    FileDeleteTool: createFileDeleteTool(ctx),

    EditorGetCurrentFileTool: createEditorGetCurrentFileTool(ctx),
    EditorGetCursorPositionTool: createEditorGetCursorPositionTool(ctx),
    EditorGetSelectionTool: createEditorGetSelectionTool(ctx),
    EditorDiagnosticsTool: createEditorDiagnosticsTool(ctx),

    EditorOpenFileTool: createEditorOpenFileTool(ctx),
    EditorInsertAtCursorTool: createEditorInsertAtCursorTool(ctx),
    EditorReplaceSelectionTool: createEditorReplaceSelectionTool(ctx),
    EditorReplaceFileContentTool: createEditorReplaceFileContentTool(ctx),
  } as ToolSet;
}
