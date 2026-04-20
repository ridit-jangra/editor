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
  LSP_START_SERVER,
  LSP_STOP_SERVER,
  LSP_REGISTER_SERVER,
} from "../channels";

export class PreloadService extends Service {
  constructor() {
    super("PreloadService");
  }

  override start(contextBridge: any, ipcRenderer: any): void {
    const fsBridge: IFileSystem = {
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

    const lspBridge = {
      registerServer: (def: any) =>
        ipcRenderer.invoke(LSP_REGISTER_SERVER, def),
      startServer: (port: number) => ipcRenderer.invoke(LSP_START_SERVER, port),
      stopServer: () => ipcRenderer.invoke(LSP_STOP_SERVER),
    };

    contextBridge.exposeInMainWorld("fs", fsBridge);
    contextBridge.exposeInMainWorld("lsp", lspBridge);
  }
}
