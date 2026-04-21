import { Service } from "../service";
import { RealFileSystemService } from "../RealFileSystemService";
import { virtualFileSystems } from "../filesystem";
import {
  normalize,
  VirtualFileSystemService,
} from "../VirtualFileSystemService";
import { EventEmitter } from "../emitter";

export type FileSystemServiceOptions = {
  mode: "real" | "virtual";
  name?: string; // required when mode is "virtual"
};

export interface IFileSystem {
  exists: (path: string) => Promise<boolean>;
  stat: (path: string) => Promise<any>;
  readdir: (path: string) => Promise<any[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content?: string) => Promise<void>;
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  rm: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  rename: (oldPath: string, newPath: string) => Promise<void>;
  getRootStructure: (path: string) => Promise<any>;
  readTree: (path: string) => Promise<any>;
}

export class FileSystemService extends Service implements IFileSystem {
  private fs: IFileSystem;

  constructor(
    private eventEmitter: EventEmitter,
    private window: any,
    { mode, name }: FileSystemServiceOptions,
  ) {
    super("FileSystemService");

    if (mode === "virtual") {
      if (!name) throw new Error("name is required for virtual file system");
      const fs = virtualFileSystems.get(name);
      if (!fs) {
        this.fs = new VirtualFileSystemService(eventEmitter, { name });
      } else {
        this.fs = fs;
      }
    } else {
      this.fs = new RealFileSystemService(window);
    }
  }

  readFile(path: string) {
    return this.fs.readFile(normalize(path));
  }

  readdir(path: string) {
    return this.fs.readdir(normalize(path));
  }

  stat(path: string) {
    return this.fs.stat(normalize(path));
  }

  exists(path: string) {
    return this.fs.exists(normalize(path));
  }

  mkdir(path: string, options = {}) {
    return this.fs.mkdir(normalize(path), options);
  }

  writeFile(path: string, content = "") {
    return this.fs.writeFile(normalize(path), content);
  }

  rm(path: string, options = {}) {
    return this.fs.rm(normalize(path), options);
  }

  rename(oldPath: string, newPath: string) {
    return this.fs.rename(normalize(oldPath), normalize(newPath));
  }

  readTree(path: string) {
    return this.fs.readTree(normalize(path));
  }

  getRootStructure(path: string) {
    return this.fs.getRootStructure(normalize(path));
  }
}
