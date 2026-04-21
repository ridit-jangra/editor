import { Node } from "../../../../services/src/VirtualFileSystemService";

export type { Node };

export interface IRootNode {
  name: string;
}

export interface IFolderStructure {
  root: IRootNode;
  path: string;
  structure: Node[];
}

export interface IChildStructure {
  path: string;
  id: string;
  child_nodes: Node[];
}

export type TWatchEvent =
  | { type: "add" | "remove" | "change"; path: string; isDir: boolean }
  | { type: "rename"; from: string; to: string; isDir: boolean };
