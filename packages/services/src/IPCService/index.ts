import { ipcMain } from "electron";
import { EventEmitter } from "../emitter";
import { Service } from "../service";

export type IPCServiceOptions = {};

export class IPCService extends Service {
  constructor(private eventEmitter: EventEmitter) {
    super("IPCService");
  }

  override start(ipc: typeof ipcMain): void {}

  override stop(): void {}
}
