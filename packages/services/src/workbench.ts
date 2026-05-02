import { EditorService } from "./EditorService";
import {
  MonacoEditorOptions,
  MonacoWorkerFactories,
} from "./EditorService/default-editors/monaco";
import { EventEmitter } from "./emitter";
import { ExplorerService } from "./ExplorerService";
import { FileSystemService } from "./FileSystemService";
import { LspService } from "./LspService";
import { StorageService } from "./StorageService";
import { ThemeService } from "./ThemeService";
import { BasicTheme, WorkbenchConfig } from "./types";
import { WorkbenchService } from "./WorkbenchService";

export type WebPresetOptions = {
  rootPath?: string;
  config?: Partial<WorkbenchConfig>;
  editorConfig?: MonacoEditorOptions;
  theme?: BasicTheme;
  storeName?: string;
  virtualFsName?: string;
  workerFactories?: MonacoWorkerFactories;
};

export type ElectronPresetOptions = {
  rootPath: string;
  lsp?: {
    disableInBuiltTypescriptWorker?: boolean;
  };
  config?: Partial<WorkbenchConfig>;
  editorConfig?: MonacoEditorOptions;
  theme?: BasicTheme;
  storeName?: string;
  workerFactories?: MonacoWorkerFactories;
};

export class Workbench {
  static async createElectron(
    opts: ElectronPresetOptions,
  ): Promise<WorkbenchService> {
    const eventEmitter = new EventEmitter();

    const storageService = new StorageService(
      window,
      "electron",
      opts.storeName ?? "workbench",
    );
    await storageService.start();

    const lspService = opts.lsp
      ? new LspService(eventEmitter, {
          disableInBuiltTypescriptWorker:
            opts.lsp.disableInBuiltTypescriptWorker ?? false,
          defaultWorkspaceFolder: opts.rootPath,
        })
      : undefined;

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: "real",
    });

    const explorerService = new ExplorerService(eventEmitter, {
      services: { fileSystem },
      rootPath: opts.rootPath,
    });

    const themeService = new ThemeService(eventEmitter);

    const editorService = new EditorService(eventEmitter, {
      services: {
        lspService,
        fileSystem,
        explorerService,
        themeService,
        storageService,
      },
      theme: opts.theme ?? "Dark",
      editorConfig: opts.editorConfig,
      workerFactories: opts.workerFactories,
    });

    return new WorkbenchService(eventEmitter, {
      services: {
        editorService,
        explorerService,
        storageService,
        themeService,
      },
      config: opts.config,
      theme: opts.theme ?? "Dark",
    });
  }

  static async createWeb(opts: WebPresetOptions = {}) {
    const eventEmitter = new EventEmitter();

    const storageService = new StorageService(
      window,
      "web",
      opts.storeName ?? "workbench",
    );
    await storageService.start();

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: "virtual",
      name: opts.virtualFsName ?? "default",
    });

    const rootPath = opts.rootPath ?? "/";

    const explorerService = new ExplorerService(eventEmitter, {
      services: { fileSystem },
      rootPath,
    });

    const themeService = new ThemeService(eventEmitter);

    const editorService = new EditorService(eventEmitter, {
      services: { fileSystem, explorerService, themeService, storageService },
      theme: opts.theme ?? "Dark",
      editorConfig: opts.editorConfig,
    });

    const workbenchService = new WorkbenchService(eventEmitter, {
      services: {
        editorService,
        explorerService,
        storageService,
        themeService,
      },
      config: opts.config,
      theme: opts.theme ?? "Dark",
    });

    return {
      workbenchService,
      editorService,
      explorerService,
      fileSystem,
      storageService,
    };
  }
}
