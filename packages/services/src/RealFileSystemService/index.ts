import { Service } from "../service";
import { IFileSystem } from "../FileSystemService";

declare global {
  interface Window {
    fs: IFileSystem;
  }
}

export class RealFileSystemService extends Service implements IFileSystem {
  constructor() {
    super("RealFileSystemService");
  }

  exists(path: string): Promise<boolean> {
    return window.fs.exists(path);
  }

  stat(path: string): Promise<any> {
    return window.fs.stat(path);
  }

  // ... all other methods delegate to window.fs
  readFile(path: string) {
    return window.fs.readFile(path);
  }
  writeFile(path: string, content = "") {
    return window.fs.writeFile(path, content);
  }
  mkdir(path: string, options = {}) {
    return window.fs.mkdir(path, options);
  }
  rm(path: string, options = {}) {
    return window.fs.rm(path, options);
  }
  rename(old: string, next: string) {
    return window.fs.rename(old, next);
  }
  readdir(path: string) {
    return window.fs.readdir(path);
  }
  // readBase64(path: string) {
  //   return window.fs.readBase64(path);
  // }
  // relative(from: string, to: string) {
  //   return window.fs.relative(from, to);
  // }
  // saveAs(path: string, content: string) {
  //   return window.fs.saveAs(path, content);
  // }
  // open(path: string) {
  //   return window.fs.open(path);
  // }
}
