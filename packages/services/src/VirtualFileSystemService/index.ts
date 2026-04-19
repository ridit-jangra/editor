import { EventEmitter } from "../emitter";
import { Service } from "../service";

export type FileSystemOptions = {
  name: string;
};

export type Node = {
  name: string;
  path: string;
  type: NodeType;
  content?: string;
  child?: Node[];
};

export type FileSystem = {
  nodes: Node[];
};

type NodeType = "folder" | "file";

type MkDirOptions = { recursive?: boolean };
type RmOptions = { recursive?: boolean };

type EditNodeOptions = {
  path: string;
  newNode: Partial<Node>;
};

export function join(...paths: string[]): string {
  const parts: string[] = [];

  for (let path of paths) {
    if (!path) continue;

    const split = path.split("/");

    for (const part of split) {
      if (!part || part === ".") continue;

      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
  }

  return "/" + parts.join("/");
}

export class VirtualFileSystemService extends Service {
  private fileSystem: FileSystem = { nodes: [] };
  private fileSystemName: string;

  constructor(
    private eventEmitter: EventEmitter,
    { name }: FileSystemOptions,
  ) {
    super("FileSystemService");

    this.fileSystemName = name;
  }

  override start(window: any): void {
    window.fs = this;
  }

  writeFile(path: string, content: string = ""): Node {
    if (this.fileSystem.nodes.some((n) => n.path === path)) {
      throw new Error(`File already exists at path: ${path}`);
    }

    const newNode: Node = {
      name: path.split("/").pop()!,
      type: "file",
      path,
      content,
    };
    this.fileSystem.nodes.push(newNode);
    return newNode;
  }

  mkdir(path: string, { recursive }: MkDirOptions = {}): Node {
    if (recursive) {
      const parts = path.split("/").filter(Boolean);
      let current = "";
      for (const part of parts) {
        current += "/" + part;
        if (!this.exists(current)) {
          this.fileSystem.nodes.push({
            name: part,
            type: "folder",
            path: current,
          });
        }
      }
      return this.fileSystem.nodes.find((n) => n.path === path)!;
    }

    if (this.fileSystem.nodes.some((n) => n.path === path)) {
      throw new Error(`Directory already exists at path: ${path}`);
    }

    const newNode: Node = {
      name: path.split("/").pop()!,
      type: "folder",
      path,
    };
    this.fileSystem.nodes.push(newNode);
    return newNode;
  }

  readFile(path: string): string {
    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) {
      throw new Error(`No file found at path: ${path}`);
    }
    if (node.type !== "file") {
      throw new Error(`Path is a directory, not a file: ${path}`);
    }
    return node.content ?? "";
  }

  readdir(path: string): Node[] {
    const dir = this.fileSystem.nodes.find(
      (n) => n.path === path && n.type === "folder",
    );
    if (!dir) {
      throw new Error(`No directory found at path: ${path}`);
    }

    return this.fileSystem.nodes.filter((n) => {
      if (!n.path.startsWith(path + "/")) return false;
      const remainder = n.path.slice(path.length + 1);
      return !remainder.includes("/");
    });
  }

  stat(path: string): Node {
    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) {
      throw new Error(`No node found at path: ${path}`);
    }
    return { ...node };
  }

  exists(path: string): boolean {
    return this.fileSystem.nodes.some((n) => n.path === path);
  }

  rename(oldPath: string, newPath: string): void {
    if (!this.exists(oldPath)) {
      throw new Error(`No node found at path: ${oldPath}`);
    }
    if (this.exists(newPath)) {
      throw new Error(`A node already exists at path: ${newPath}`);
    }

    this.fileSystem.nodes = this.fileSystem.nodes.map((n) => {
      if (n.path === oldPath) {
        return { ...n, path: newPath, name: newPath.split("/").pop()! };
      }
      if (n.path.startsWith(oldPath + "/")) {
        return { ...n, path: newPath + n.path.slice(oldPath.length) };
      }
      return n;
    });
  }

  update({ path, newNode }: EditNodeOptions): Node {
    const index = this.fileSystem.nodes.findIndex((n) => n.path === path);
    if (index === -1) {
      throw new Error(`No node found at path: ${path}`);
    }

    this.fileSystem.nodes[index] = {
      ...this.fileSystem.nodes[index]!,
      ...newNode,
    };

    return { ...this.fileSystem.nodes[index]! };
  }

  rm(path: string, { recursive }: RmOptions = {}): void {
    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) {
      throw new Error(`No node found at path: ${path}`);
    }

    if (node.type === "folder" && !recursive) {
      const hasChildren = this.fileSystem.nodes.some((n) =>
        n.path.startsWith(path + "/"),
      );
      if (hasChildren) {
        throw new Error(
          `Directory is not empty: ${path}. Use { recursive: true } to remove it.`,
        );
      }
    }

    this.fileSystem.nodes = this.fileSystem.nodes.filter(
      (n) => n.path !== path && !n.path.startsWith(path + "/"),
    );
  }
}
