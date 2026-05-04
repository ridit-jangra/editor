import { EventEmitter } from "../emitter";
import { virtualFileSystems } from "../filesystem";
import { IFileSystem } from "../FileSystemService";
import { Service } from "../service";
import { basename, join, normalize } from "./utils";

export type FileSystemOptions = {
  name: string;
};

type NodeType = "folder" | "file";

export type Node = {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  content?: string;
  child?: Node[];
};

export type FileSystem = {
  nodes: Node[];
};

type EditNodeOptions = {
  path: string;
  newNode: Partial<Node>;
};

type ReadDirOptions = {
  withFileTypes?: boolean;
  recursive?: boolean;
};

type ReadTreeOptions = {
  recursive?: boolean;
};

export class VirtualFileSystemService extends Service implements IFileSystem {
  fileSystem: FileSystem = { nodes: [] };
  private fileSystemName: string;

  constructor(
    private eventEmitter: EventEmitter,
    { name }: FileSystemOptions,
  ) {
    super("VirtualFileSystemService");

    this.fileSystemName = name;

    if (virtualFileSystems.has(name)) {
      console.warn(
        `[VirtualFileSystem]: ${name} already exists. Using existing FS.`,
      );
      this.fileSystem = virtualFileSystems.get(name)!.fileSystem;
    }

    virtualFileSystems.set(name, this);

    if (!this.fileSystem.nodes.some((n) => n.path === "/")) {
      this.insertNode({
        id: "/",
        name: "",
        path: "/",
        type: "folder",
      });
    }
  }

  async writeFile(path: string, content = ""): Promise<void> {
    path = normalize(path);

    const dir = path.split("/").slice(0, -1).join("/") || "/";

    if (!(await this.exists(dir))) {
      await this.mkdir(dir, { recursive: true });
    }

    if (await this.exists(path)) {
      throw new Error(`File already exists at path: ${path}`);
    }

    this.insertNode({
      id: path,
      name: basename(path),
      type: "file",
      path,
      content,
    });
  }

  async mkdir(
    path: string,
    { recursive }: { recursive?: boolean } = {},
  ): Promise<void> {
    path = normalize(path);

    if (await this.exists(path)) return;

    if (recursive) {
      const parts = path.split("/").filter(Boolean);
      let current = "";

      for (const part of parts) {
        current = normalize(current + "/" + part);

        if (!this.fileSystem.nodes.some((n) => n.path === current)) {
          this.insertNode({
            id: current,
            name: part,
            type: "folder",
            path: current,
          });
        }
      }

      return;
    }

    this.insertNode({
      id: path,
      name: basename(path),
      type: "folder",
      path,
    });
  }

  async readFile(path: string): Promise<string> {
    path = normalize(path);

    const node = this.fileSystem.nodes.find((n) => n.path === path);

    if (!node) throw new Error(`No file found: ${path}`);
    if (node.type !== "file") throw new Error(`Not a file: ${path}`);

    return node.content ?? "";
  }

  async readdir(path: string, options: ReadDirOptions = {}): Promise<any[]> {
    path = normalize(path);

    const { withFileTypes = false, recursive = false } = options;

    const dir = this.fileSystem.nodes.find(
      (n) => n.path === path && n.type === "folder",
    );

    if (!dir) throw new Error(`No directory found: ${path}`);

    const results: Node[] = [];

    for (const node of this.fileSystem.nodes) {
      if (!node.path.startsWith(path === "/" ? "/" : path + "/")) continue;

      const remainder = node.path.slice(path.length + (path === "/" ? 0 : 1));

      if (!recursive && remainder.includes("/")) continue;

      if (node.path !== path) results.push(node);
    }

    return withFileTypes ? results : results.map((n) => n.name);
  }

  async stat(path: string): Promise<Node> {
    path = normalize(path);

    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) throw new Error(`No node found: ${path}`);

    return { ...node };
  }

  async exists(path: string): Promise<boolean> {
    path = normalize(path);
    return this.fileSystem.nodes.some((n) => n.path === path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    oldPath = normalize(oldPath);
    newPath = normalize(newPath);

    if (!(await this.exists(oldPath))) {
      throw new Error(`No node found: ${oldPath}`);
    }

    if (await this.exists(newPath)) {
      throw new Error(`Already exists: ${newPath}`);
    }

    this.fileSystem.nodes = this.fileSystem.nodes.map((n) => {
      if (n.path === oldPath) {
        return { ...n, path: newPath, name: basename(newPath) };
      }

      if (n.path.startsWith(oldPath + "/")) {
        return {
          ...n,
          path: newPath + n.path.slice(oldPath.length),
        };
      }

      return n;
    });
  }

  async rm(
    path: string,
    { recursive }: { recursive?: boolean } = {},
  ): Promise<void> {
    path = normalize(path);

    const node = this.fileSystem.nodes.find((n) => n.path === path);
    if (!node) throw new Error(`No node found: ${path}`);

    if (node.type === "folder" && !recursive) {
      const hasChildren = this.fileSystem.nodes.some((n) =>
        n.path.startsWith(path + "/"),
      );

      if (hasChildren) {
        throw new Error(`Directory not empty: ${path}`);
      }
    }

    this.fileSystem.nodes = this.fileSystem.nodes.filter(
      (n) => n.path !== path && !n.path.startsWith(path + "/"),
    );
  }

  async update({ path, newNode }: EditNodeOptions): Promise<Node> {
    path = normalize(path);

    const index = this.fileSystem.nodes.findIndex((n) => n.path === path);
    if (index === -1) throw new Error(`No node found: ${path}`);

    this.fileSystem.nodes[index] = {
      ...this.fileSystem.nodes[index]!,
      ...newNode,
    };

    return { ...this.fileSystem.nodes[index] };
  }

  async readTree(path: string, options: ReadTreeOptions = {}) {
    path = normalize(path);

    const entries = await this.readdir(path, {
      withFileTypes: true,
      recursive: false,
    });

    return entries.map((entry) => {
      const full = join(path, entry.name);

      return {
        id: full,
        name: entry.name,
        type: entry.type,
        path: full,
        child: [],
      };
    });
  }

  async getRootStructure(path: string) {
    path = normalize(path);

    const structure = await this.readTree(path);

    return {
      root: { name: basename(path) || "/" },
      path,
      structure,
    };
  }

  async glob(pattern: string, opts?: { cwd?: string }): Promise<string[]> {
    const { minimatch } = await import("minimatch");
    const base = opts?.cwd ?? "/";
    const allFiles = await this.readTreeFlat(base);
    return allFiles.filter((f) => minimatch(f, pattern));
  }

  private async readTreeFlat(dir: string): Promise<string[]> {
    const entries = await this.readdir(dir);
    const results: string[] = [];
    for (const entry of entries) {
      const full = `${dir}/${entry.name}`.replace("//", "/");
      if (entry.isDirectory?.() || entry.type === "directory") {
        results.push(...(await this.readTreeFlat(full)));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  private insertNode(node: Node) {
    if (this.fileSystem.nodes.some((n) => n.path === node.path)) return;
    this.fileSystem.nodes.push(node);
  }
}
