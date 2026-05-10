import type { EditorService } from "../../../../services/src/EditorService";
import type { FileSystemService } from "../../../../services/src/FileSystemService";
import type { ExplorerService } from "../../../../services/src/ExplorerService";

export type ToolContext = {
  fileSystem: FileSystemService;
  editorService: EditorService;
  explorerService: ExplorerService;
};
