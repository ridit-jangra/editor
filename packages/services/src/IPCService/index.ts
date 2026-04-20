import { ipcMain } from "electron";
import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { Server } from "@ridit/relay/server";

import fs from "fs";
import path from "path";

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
} from "../channels";
import { resolve_pylsp, resolve_python } from "../LspService/utils";

export type IPCServiceOptions = {};

export class IPCService extends Service {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    super("IPCService");

    this.eventEmitter = eventEmitter;
  }

  override start(ipc: typeof ipcMain): void {
    const lspServer = new Server();
    let isLspServerStarted = false;

    lspServer.register({
      languageId: "python",
      resolve: () => {
        const pythonPath = resolve_python();
        if (!pythonPath) return null;
        return resolve_pylsp(pythonPath);
      },
    });

    ipc.handle(FS_EXISTS, (_event: any, filePath: string) => {
      return fs.existsSync(filePath);
    });

    ipc.handle(FS_STAT, (_event: any, filePath: string) => {
      const stat = fs.statSync(filePath);
      return {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
        ctime: stat.ctime,
      };
    });

    ipc.handle(FS_READDIR, (_event: any, filePath: string) => {
      return fs.readdirSync(filePath, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        path: path.join(filePath, entry.name),
      }));
    });

    ipc.handle(FS_READ_FILE_TEXT, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath, "utf-8");
    });

    ipc.handle(
      FS_WRITE_FILE_TEXT,
      (_event: any, filePath: string, content: string) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf-8");
      },
    );

    ipc.handle(FS_CREATE_DIR, (_event: any, filePath: string) => {
      fs.mkdirSync(filePath, { recursive: true });
    });

    ipc.handle(
      FS_REMOVE,
      (
        _event: any,
        filePath: string,
        options: { recursive?: boolean } = {},
      ) => {
        fs.rmSync(filePath, { recursive: options.recursive ?? false });
      },
    );

    ipc.handle(FS_RENAME, (_event: any, oldPath: string, newPath: string) => {
      fs.renameSync(oldPath, newPath);
    });

    ipc.handle(FS_READ_BASE_64, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath).toString("base64");
    });

    ipc.handle(FS_RELATIVE, (_event: any, from: string, to: string) => {
      return path.relative(from, to);
    });

    ipc.handle(FS_SAVE_AS, (_event: any, filePath: string, content: string) => {
      fs.writeFileSync(filePath, content, "utf-8");
    });

    ipc.handle(FS_OPEN, (_event: any, filePath: string) => {
      return fs.readFileSync(filePath);
    });

    ipc.handle(LSP_REGISTER_SERVER, (_event, def) => {
      lspServer.register(def);
    });

    ipc.handle(LSP_START_SERVER, async (_event, port) => {
      if (isLspServerStarted) return;
      const server = lspServer.start(port);

      isLspServerStarted = true;
      return server;
    });

    ipc.handle(LSP_STOP_SERVER, () => {
      return lspServer.stop();
    });
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
