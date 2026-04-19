import type { Client } from "@ridit/relay";
import type { editor } from "monaco-editor";
import { createClient } from "./client";
import { Service } from "../service";
import type { EventEmitter } from "../emitter";
import { LSP_START_SERVER } from "../channels";

export type LspServiceOptions = {
  disableInBuiltTypescriptWorker?: boolean;
  defaultWorkspaceFolder?: string;
  port?: number;
};

export class LspService extends Service {
  private editor: editor.IStandaloneCodeEditor | null = null;
  private client: Client | null = null;
  private defaultWorkspaceFolder: string | undefined = undefined;
  private port: number | undefined = undefined;
  public config: LspServiceOptions;

  constructor(
    private eventEmitter: EventEmitter,
    {
      disableInBuiltTypescriptWorker = false,
      defaultWorkspaceFolder,
      port = 2138,
    }: LspServiceOptions,
  ) {
    super("LspService");

    this.defaultWorkspaceFolder = defaultWorkspaceFolder;
    this.port = port;
    this.config = {
      defaultWorkspaceFolder,
      disableInBuiltTypescriptWorker,
      port,
    };
  }

  override async start(
    window: any,
    monaco: any,
    editor: editor.IStandaloneCodeEditor,
  ) {
    this.create(monaco);

    await this.startClient();
    this.startServer();

    this.editor = editor;
  }
  override async stop() {
    await this.stopClient();
  }

  private startServer() {
    this.eventEmitter.emit(LSP_START_SERVER);
  }
  private async startClient() {
    if (!this.client) {
      console.error(
        "[LspService]: No client found, use create() method to create the client.",
      );
      return;
    }

    await this.client.start(this.defaultWorkspaceFolder, this.port);
  }

  private async stopClient() {
    if (!this.client) {
      console.error(
        "[LspService]: No client found, use create() method to create the client.",
      );
      return;
    }

    await this.client.dispose();
  }

  private create(monaco: any) {
    this.client = createClient(monaco);
  }

  updateClientConfiguration(workspaceFolderPath: string) {
    if (!this.client) {
      console.error(
        "[LspService]: No client found, use create() method to create the client.",
      );
      return;
    }

    this.client.updateWorkspaceRoot(workspaceFolderPath);
  }
  editServices(services: string[]) {}

  addServer() {}
  removeServer() {}
  getAllServers() {}
}
