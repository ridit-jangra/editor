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
  EXPLORER_GET_CHILD_STRUCTURE,
  EXPLORER_GET_ROOT_STRUCTURE,
  STORAGE_GET,
  STORAGE_SET,
} from "../channels";
import type { IpcRenderer, contextBridge as contextBridgeType } from "electron";

export class PreloadService extends Service {
  constructor() {
    super("PreloadService");
  }

  override start(
    contextBridge: typeof contextBridgeType,
    ipcRenderer: IpcRenderer,
  ): void {
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
      readTree: (path) =>
        ipcRenderer.invoke(EXPLORER_GET_CHILD_STRUCTURE, path),
      getRootStructure: (path) =>
        ipcRenderer.invoke(EXPLORER_GET_ROOT_STRUCTURE, path),
    };

    const lspBridge = {
      registerServer: (def: any) =>
        ipcRenderer.invoke(LSP_REGISTER_SERVER, def),
      startServer: (port: number) => ipcRenderer.invoke(LSP_START_SERVER, port),
      stopServer: () => ipcRenderer.invoke(LSP_STOP_SERVER),
    };

    const ipcBridge = {
      invoke: (channel: string, ...args: any[]) => {
        return ipcRenderer.invoke(channel, args);
      },
      send: (channel: string, ...args: any[]) => {
        return ipcRenderer.send(channel, args);
      },
      on: (channel: string, listener: (e: any, ...args: any) => void) => {
        return ipcRenderer.on(channel, listener);
      },
      once: (channel: string, listener: (e: any, ...args: any) => void) => {
        return ipcRenderer.once(channel, listener);
      },
    };

    const storageBridge = {
      set: (key: string, value: any) => {
        return ipcRenderer.invoke(STORAGE_SET, key, value);
      },
      get: (key: string) => {
        return ipcRenderer.invoke(STORAGE_GET, key);
      },
    };

    contextBridge.exposeInMainWorld("fs", fsBridge);
    contextBridge.exposeInMainWorld("lsp", lspBridge);
    contextBridge.exposeInMainWorld("ipc", ipcBridge);
    contextBridge.exposeInMainWorld("stg", storageBridge);
  }
}
