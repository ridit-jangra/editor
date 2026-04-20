import { Service } from "../service";
import { RealFileSystemService } from "../RealFileSystemService";
import { virtualFileSystems } from "../filesystem";
import { VirtualFileSystemService } from "../VirtualFileSystemService";
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

  exists(path: string) {
    return this.fs.exists(path);
  }

  stat(path: string) {
    return this.fs.stat(path);
  }

  readdir(path: string) {
    return this.fs.readdir(path);
  }

  readFile(path: string) {
    return this.fs.readFile(path);
  }

  writeFile(path: string, content: string = "") {
    return this.fs.writeFile(path, content);
  }

  mkdir(path: string, options: { recursive?: boolean } = {}) {
    return this.fs.mkdir(path, options);
  }

  rm(path: string, options: { recursive?: boolean } = {}) {
    return this.fs.rm(path, options);
  }

  rename(oldPath: string, newPath: string) {
    return this.fs.rename(oldPath, newPath);
  }
}
