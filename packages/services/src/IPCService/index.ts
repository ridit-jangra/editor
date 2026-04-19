import { ipcMain } from "electron";
import { EventEmitter } from "../emitter";
import { Service } from "../service";

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
} from "../channels";

export type IPCServiceOptions = {};

export class IPCService extends Service {
  constructor(private eventEmitter: EventEmitter) {
    super("IPCService");
  }

  override start(ipc: typeof ipcMain): void {
    ipc.handle(FS_EXISTS, (_event, filePath: string) => {
      return fs.existsSync(filePath);
    });

    ipc.handle(FS_STAT, (_event, filePath: string) => {
      const stat = fs.statSync(filePath);
      return {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
        ctime: stat.ctime,
      };
    });

    ipc.handle(FS_READDIR, (_event, filePath: string) => {
      return fs.readdirSync(filePath, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        path: path.join(filePath, entry.name),
      }));
    });

    ipc.handle(FS_READ_FILE_TEXT, (_event, filePath: string) => {
      return fs.readFileSync(filePath, "utf-8");
    });

    ipc.handle(
      FS_WRITE_FILE_TEXT,
      (_event, filePath: string, content: string) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf-8");
      },
    );

    ipc.handle(FS_CREATE_DIR, (_event, filePath: string) => {
      fs.mkdirSync(filePath, { recursive: true });
    });

    ipc.handle(
      FS_REMOVE,
      (_event, filePath: string, options: { recursive?: boolean } = {}) => {
        fs.rmSync(filePath, { recursive: options.recursive ?? false });
      },
    );

    ipc.handle(FS_RENAME, (_event, oldPath: string, newPath: string) => {
      fs.renameSync(oldPath, newPath);
    });

    ipc.handle(FS_READ_BASE_64, (_event, filePath: string) => {
      return fs.readFileSync(filePath).toString("base64");
    });

    ipc.handle(FS_RELATIVE, (_event, from: string, to: string) => {
      return path.relative(from, to);
    });

    ipc.handle(FS_SAVE_AS, (_event, filePath: string, content: string) => {
      fs.writeFileSync(filePath, content, "utf-8");
    });

    ipc.handle(FS_OPEN, (_event, filePath: string) => {
      return fs.readFileSync(filePath);
    });
  }

  override stop(): void {
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
    ].forEach((channel) => ipcMain.removeHandler(channel));
  }
}
