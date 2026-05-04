import { BrowserWindow, ipcMain } from "electron";
import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { Server } from "@ridit/relay/server";

import fs from "fs";
import path, { join } from "path";

import {
  FS_EXISTS,
  FS_SAVE_AS,
  FS_READDIR,
  FS_STAT,
  FS_READ_FILE_TEXT,
  FS_CREATE_DIR,
  FS_REMOVE,
  FS_WRITE_FILE_TEXT,
  FS_RENAME,
  FS_READ_BASE_64,
  FS_RELATIVE,
  FS_OPEN,
  LSP_START_SERVER,
  LSP_REGISTER_SERVER,
  LSP_STOP_SERVER,
  EXPLORER_GET_ROOT_STRUCTURE,
  EXPLORER_GET_CHILD_STRUCTURE,
  STORAGE_GET,
  STORAGE_SET,
  STORAGE_CREATE_IF_NOT_EXISTS,
  FS_GLOB,
} from "../channels";
import { resolve_pylsp, resolve_python } from "../LspService/utils";
import { IFolderStructure } from "../../../ui/src/components/VirtualTree/types";
import { Node } from "../VirtualFileSystemService";
import { StorageService } from "./storage";

export type CreateWindowOptions = {
  titlebarWindowControls?: "inline" | "separate";
  preload: string;
  icon?: string;
};

async function get_root_structure(
  folder_path: string,
): Promise<IFolderStructure> {
  try {
    const entries = fs.readdirSync(folder_path, {
      withFileTypes: true,
      recursive: false,
    });

    const structure: Node[] = [];

    for (const entry of entries) {
      const full_path = path.join(folder_path, entry.name);

      structure.push({
        id: full_path,
        type: entry.isDirectory() ? "folder" : "file",
        name: entry.name,
        path: full_path,
        child: [],
      });
    }

    return {
      root: { name: path.basename(folder_path) },
      path: folder_path,
      structure,
    };
  } catch {
    return {
      root: { name: path.basename(folder_path) },
      path: folder_path,
      structure: [],
    };
  }
}

async function get_child_structure(path: string): Promise<Node[]> {
  // if (node.type !== "folder") return [];

  try {
    const entries = fs.readdirSync(path, {
      withFileTypes: true,
      recursive: false,
    });

    const child_nodes: Node[] = [];

    for (const entry of entries) {
      const full_path = join(path, entry.name);

      child_nodes.push({
        id: full_path,
        type: entry.isDirectory() ? "folder" : "file",
        name: entry.name,
        path: full_path,
        // child_nodes: [],
        child: [],
      });
    }

    return child_nodes;
  } catch {
    return [];
  }
}

export type MainProcessServiceOptions = {};

export class MainProcessService extends Service {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    super("MainProcessService");

    this.eventEmitter = eventEmitter;
  }

  registerIPCHandlers() {
    const lspServer = new Server();
    const storage = new StorageService();
    let isLspServerStarted = false;

    lspServer.register({
      languageId: "python",
      resolve: () => {
        const pythonPath = resolve_python();
        if (!pythonPath) return null;
        return resolve_pylsp(pythonPath);
      },
    });

    ipcMain.handle(FS_EXISTS, (_event: any, filePath: string) => {
      return fs.existsSync(filePath);
    });

    ipcMain.handle(FS_STAT, (_event: any, filePath: string) => {
      const stat = fs.statSync(filePath);
      return {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
        ctime: stat.ctime,
      };
    });

    ipcMain.handle(FS_READDIR, (_event: any, filePath: string) => {
      return fs.readdirSync(filePath, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        path: path.join(filePath, entry.name),
      }));
    });

    ipcMain.handle(FS_READ_FILE_TEXT, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath, "utf-8");
    });

    ipcMain.handle(
      FS_WRITE_FILE_TEXT,
      (_event: any, filePath: string, content: string) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf-8");
      },
    );

    ipcMain.handle(FS_CREATE_DIR, (_event: any, filePath: string) => {
      fs.mkdirSync(filePath, { recursive: true });
    });

    ipcMain.handle(
      FS_REMOVE,
      (
        _event: any,
        filePath: string,
        options: { recursive?: boolean } = {},
      ) => {
        fs.rmSync(filePath, { recursive: options.recursive ?? false });
      },
    );

    ipcMain.handle(
      FS_RENAME,
      (_event: any, oldPath: string, newPath: string) => {
        fs.renameSync(oldPath, newPath);
      },
    );

    ipcMain.handle(FS_READ_BASE_64, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath).toString("base64");
    });

    ipcMain.handle(FS_RELATIVE, (_event: any, from: string, to: string) => {
      return path.relative(from, to);
    });

    ipcMain.handle(
      FS_SAVE_AS,
      (_event: any, filePath: string, content: string) => {
        fs.writeFileSync(filePath, content, "utf-8");
      },
    );

    ipcMain.handle(FS_OPEN, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath);
    });

    ipcMain.handle(LSP_REGISTER_SERVER, (_event, def) => {
      lspServer.register(def);
    });

    ipcMain.handle(LSP_START_SERVER, async (_event, port) => {
      if (isLspServerStarted) return;
      const server = lspServer.start(port);

      isLspServerStarted = true;
      return server;
    });

    ipcMain.handle(LSP_STOP_SERVER, () => {
      return lspServer.stop();
    });

    ipcMain.handle(
      EXPLORER_GET_ROOT_STRUCTURE,
      async (_, folder_path: string) => {
        return await get_root_structure(folder_path);
      },
    );

    ipcMain.handle(EXPLORER_GET_CHILD_STRUCTURE, async (_, path: string) => {
      return await get_child_structure(path);
    });

    ipcMain.handle(STORAGE_GET, (_, key: string, storeName: string) => {
      return storage.get(key, storeName);
    });

    ipcMain.handle(
      STORAGE_SET,
      (_, key: string, value: any, storeName: string) => {
        storage.set(key, value, storeName);
        return true;
      },
    );

    ipcMain.handle(
      FS_GLOB,
      async (_event, pattern: string, opts: { cwd?: string } = {}) => {
        const { glob } = await import("glob");
        const files = await glob(pattern, {
          cwd: opts.cwd ?? "/",
          absolute: true,
          // withFileTypes: false,
        });
        return files;
      },
    );

    ipcMain.handle(STORAGE_CREATE_IF_NOT_EXISTS, (_, storeName: string) => {
      storage.createIfNotExists(storeName);
    });
  }

  createWindow({
    preload,
    icon,
    titlebarWindowControls = "inline",
  }: CreateWindowOptions) {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";

    const inset = isMac ? 75 : isWin ? 170 : 115;

    const winHeight = 21;
    const otherHeight = 31;

    const optionHeight = isWin ? winHeight : otherHeight;

    const win = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === "linux" ? { icon } : {}),
      webPreferences: {
        preload,
        // sandbox: false
      },
      ...(titlebarWindowControls === "inline"
        ? {
            titleBarOverlay: {
              // color: theme.get_color("workbench.background"),
              // symbolColor: theme.get_color("workbench.foreground"),
              height: optionHeight,
            },
            titleBarStyle: "hidden" as const,
          }
        : {}),
    });

    function updateTitlebarHeight() {
      if (!win) return;
      const zoomFactor = win.webContents.getZoomFactor();
      const clamped = Math.min(Math.max(zoomFactor, 0.75), 2.0);
      const newHeight = Math.round(optionHeight * 1.4 * clamped);
      if (!isMac) {
        win.setTitleBarOverlay({
          // color: theme.get_color("workbench.background"),
          // symbolColor: theme.get_color("workbench.foreground"),
          height: newHeight,
        });
      }
      const newInset = Math.round(inset / (clamped * 1.3));
      win.webContents.send("titlebar-insets", newInset, isMac);
    }

    ipcMain.handle("workbench.zoom", () => {
      if (!win) return;
      win.webContents.setZoomFactor(win.webContents.getZoomFactor() + 0.1);
      updateTitlebarHeight();
    });

    ipcMain.handle("workbench.zoomout", () => {
      if (!win) return;
      win.webContents.setZoomFactor(
        Math.max(0.5, win.webContents.getZoomFactor() - 0.1),
      );
      updateTitlebarHeight();
    });

    ipcMain.on("titlebar-ready", (e) => {
      if (!win) return;
      e.sender.send("titlebar-insets", inset, isMac);
      updateTitlebarHeight();
    });

    return win;
  }

  override stop(ipc: typeof ipcMain): void {
    [
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
    ].forEach((channel) => ipc.removeHandler(channel));
  }
}
