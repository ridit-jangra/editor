import { Service } from "../service";
import { IFileSystem } from "../FileSystemService";

declare global {
  interface Window {
    fs: IFileSystem;
  }
}

export class RealFileSystemService extends Service implements IFileSystem {
  constructor(private window: any) {
    super("RealFileSystemService");
  }

  exists(path: string): Promise<boolean> {
    return this.window.fs.exists(path);
  }

  stat(path: string): Promise<any> {
    return this.window.fs.stat(path);
  }

  readFile(path: string) {
    return this.window.fs.readFile(path);
  }
  writeFile(path: string, content = "") {
    return this.window.fs.writeFile(path, content);
  }
  mkdir(path: string, options = {}) {
    return this.window.fs.mkdir(path, options);
  }
  rm(path: string, options = {}) {
    return this.window.fs.rm(path, options);
  }
  rename(old: string, next: string) {
    return this.window.fs.rename(old, next);
  }
  readdir(path: string) {
    return this.window.fs.readdir(path);
  }
  readTree(path: string) {
    return this.window.fs.readTree(path);
  }
  getRootStructure(path: string) {
    return this.window.fs.getRootStructure(path);
  }
  // readBase64(path: string) {
  //   return this.window.fs.readBase64(path);
  // }
  // relative(from: string, to: string) {
  //   return this.window.fs.relative(from, to);
  // }
  // saveAs(path: string, content: string) {
  //   return this.window.fs.saveAs(path, content);
  // }
  // open(path: string) {
  //   return this.window.fs.open(path);
  // }
}
