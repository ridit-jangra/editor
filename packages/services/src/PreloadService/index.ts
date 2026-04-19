import { Service } from "../service";
import { ipcRenderer } from "electron";
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
} from "../channels";

export class PreloadService extends Service {
  constructor() {
    super("PreloadService");
  }

  override start(): void {
    const bridge: IFileSystem = {
      exists: (path) => ipcRenderer.invoke(FS_EXISTS, path),
      stat: (path) => ipcRenderer.invoke(FS_STAT, path),
      readdir: (path) => ipcRenderer.invoke(FS_READDIR, path),
      readFile: (path) => ipcRenderer.invoke(FS_READ_FILE_TEXT, path),
      writeFile: (path, content = "") =>
        ipcRenderer.invoke(FS_WRITE_FILE_TEXT, path, content),
      mkdir: (path, options = {}) =>
        ipcRenderer.invoke(FS_CREATE_DIR, path, options),
      rm: (path, options = {}) => ipcRenderer.invoke(FS_REMOVE, path, options),
      rename: (old, next) => ipcRenderer.invoke(FS_RENAME, old, next),
    };

    const { contextBridge } = require("electron");
    contextBridge.exposeInMainWorld("fs", bridge);
  }
}
