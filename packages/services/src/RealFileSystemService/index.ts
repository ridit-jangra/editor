import { ipcRenderer } from "electron";
import { Service } from "../service";
import { IFileSystem } from "../FileSystemService";

import {
  FS_EXISTS,
  FS_STAT,
  FS_READDIR,
  FS_READ_FILE_TEXT,
  FS_WRITE_FILE_TEXT,
  FS_CREATE_DIR,
  FS_REMOVE,
  FS_RENAME,
  FS_READ_BASE_64,
  FS_RELATIVE,
  FS_SAVE_AS,
  FS_OPEN,
} from "../channels";

export class RealFileSystemService extends Service implements IFileSystem {
  constructor() {
    super("RealFileSystemService");
  }

  override start(window: any): void {
    window.fs = this;
  }

  exists(path: string): Promise<boolean> {
    return ipcRenderer.invoke(FS_EXISTS, path);
  }

  stat(path: string): Promise<any> {
    return ipcRenderer.invoke(FS_STAT, path);
  }

  readdir(path: string): Promise<any[]> {
    return ipcRenderer.invoke(FS_READDIR, path);
  }

  readFile(path: string): Promise<string> {
    return ipcRenderer.invoke(FS_READ_FILE_TEXT, path);
  }

  writeFile(path: string, content: string = ""): Promise<void> {
    return ipcRenderer.invoke(FS_WRITE_FILE_TEXT, path, content);
  }

  mkdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    return ipcRenderer.invoke(FS_CREATE_DIR, path, options);
  }

  rm(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    return ipcRenderer.invoke(FS_REMOVE, path, options);
  }

  rename(oldPath: string, newPath: string): Promise<void> {
    return ipcRenderer.invoke(FS_RENAME, oldPath, newPath);
  }

  readBase64(path: string): Promise<string> {
    return ipcRenderer.invoke(FS_READ_BASE_64, path);
  }

  relative(from: string, to: string): Promise<string> {
    return ipcRenderer.invoke(FS_RELATIVE, from, to);
  }

  saveAs(path: string, content: string): Promise<void> {
    return ipcRenderer.invoke(FS_SAVE_AS, path, content);
  }

  open(path: string): Promise<Buffer> {
    return ipcRenderer.invoke(FS_OPEN, path);
  }
}
