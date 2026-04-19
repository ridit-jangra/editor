import { EventEmitter } from "../emitter";
import { virtualFileSystems } from "../filesystem";
import { IFileSystem } from "../FileSystemService";
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

export class VirtualFileSystemService extends Service implements IFileSystem {
  private fileSystem: FileSystem = { nodes: [] };
  private fileSystemName: string;

  constructor(
    private eventEmitter: EventEmitter,
    { name }: FileSystemOptions,
  ) {
    super("VirtualFileSystemService");

    this.fileSystemName = name;

    if (virtualFileSystems.has(name)) {
      console.warn(`[VirtualFileSystem]: ${name} already exists.`);
      return;
    }

    virtualFileSystems.set(name, this);
  }

  writeFile(path: string, content: string = ""): Promise<void> {
    if (this.fileSystem.nodes.some((n) => n.path === path)) {
      throw new Error(`File already exists at path: ${path}`);
    }

    this.fileSystem.nodes.push({
      name: path.split("/").pop()!,
      type: "file",
      path,
      content,
    });

    return Promise.resolve();
  }

  mkdir(
    path: string,
    { recursive }: { recursive?: boolean } = {},
  ): Promise<void> {
    if (recursive) {
      const parts = path.split("/").filter(Boolean);
      let current = "";
      for (const part of parts) {
        current += "/" + part;
        if (!this.fileSystem.nodes.some((n) => n.path === current)) {
          this.fileSystem.nodes.push({
            name: part,
            type: "folder",
            path: current,
          });
        }
      }
      return Promise.resolve();
    }

    if (this.fileSystem.nodes.some((n) => n.path === path)) {
      throw new Error(`Directory already exists at path: ${path}`);
    }

    this.fileSystem.nodes.push({
      name: path.split("/").pop()!,
      type: "folder",
      path,
    });

    return Promise.resolve();
  }

  readFile(path: string): Promise<string> {
    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) {
      throw new Error(`No file found at path: ${path}`);
    }
    if (node.type !== "file") {
      throw new Error(`Path is a directory, not a file: ${path}`);
    }
    return Promise.resolve(node.content ?? "");
  }

  readdir(path: string): Promise<Node[]> {
    const dir = this.fileSystem.nodes.find(
      (n) => n.path === path && n.type === "folder",
    );
    if (!dir) {
      throw new Error(`No directory found at path: ${path}`);
    }

    const children = this.fileSystem.nodes.filter((n) => {
      if (!n.path.startsWith(path + "/")) return false;
      const remainder = n.path.slice(path.length + 1);
      return !remainder.includes("/");
    });

    return Promise.resolve(children);
  }

  stat(path: string): Promise<Node> {
    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) {
      throw new Error(`No node found at path: ${path}`);
    }
    return Promise.resolve({ ...node });
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.fileSystem.nodes.some((n) => n.path === path));
  }

  rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.fileSystem.nodes.some((n) => n.path === oldPath)) {
      throw new Error(`No node found at path: ${oldPath}`);
    }
    if (this.fileSystem.nodes.some((n) => n.path === newPath)) {
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

    return Promise.resolve();
  }

  update({ path, newNode }: EditNodeOptions): Promise<Node> {
    const index = this.fileSystem.nodes.findIndex((n) => n.path === path);
    if (index === -1) {
      throw new Error(`No node found at path: ${path}`);
    }

    this.fileSystem.nodes[index] = {
      ...this.fileSystem.nodes[index]!,
      ...newNode,
    };

    return Promise.resolve({ ...this.fileSystem.nodes[index]! });
  }

  rm(path: string, { recursive }: { recursive?: boolean } = {}): Promise<void> {
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

    return Promise.resolve();
  }
}
