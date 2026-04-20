import type { Client, Server } from "@ridit/relay";
import type { editor } from "monaco-editor";
import { createClient } from "./client";
import { Service } from "../service";
import type { EventEmitter } from "../emitter";

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
  private window: any;
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
    this.window = window;
    this.editor = editor;

    this.create(monaco);

    await this.startServer();
    await this.startClient();
  }
  override async stop() {
    await this.stopClient();
  }

  private async startServer() {
    await this.window.lsp.startServer(this.port);
  }
  private async startClient() {
    if (!this.client) {
      console.error(
        "[LspService]: No client found, use create() method to create the client.",
      );
      return;
    }

    this.client.register({ languageId: "python", extensions: ["py"] });

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
}
