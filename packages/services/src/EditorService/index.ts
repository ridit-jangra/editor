import editor_worker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import json_worker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import css_worker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import html_worker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import ts_worker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

import { StandaloneServices } from "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices?internal";
import { ITextModelService } from "monaco-editor/esm/vs/editor/common/services/resolverService?internal";
import * as monaco from "monaco-editor";
import { Service } from "../service";
import { path_to_language } from "./utils";
import { EventEmitter } from "../emitter";
import { LspService } from "../LspService";
import { FileSystemService } from "../FileSystemService";
import { normalize } from "../VirtualFileSystemService";
import { ExplorerService } from "../ExplorerService";
import { StorageService } from "../StorageService";

export type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;

export type EditorDomElement = HTMLElement | string;

export type EditorServiceOptions = {
  LspService?: LspService;
  fileSystem: FileSystemService;
  storageService: StorageService;
  explorerService: ExplorerService;
  editorConfig?: EditorOptions;
  theme?: "Dark" | "Light";
};

export class EditorService extends Service {
  private models: any[] = [];
  private active_model: any | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private lspServer: LspService | undefined = undefined;
  private editorConfig: EditorOptions | undefined = undefined;
  private fileSystem: FileSystemService;
  private explorerService: ExplorerService;
  private window: any;
  private theme: "Dark" | "Light" | undefined = undefined;

  constructor(
    private eventEmiiter: EventEmitter,
    {
      LspService,
      editorConfig,
      fileSystem,
      theme,
      explorerService,
    }: EditorServiceOptions,
  ) {
    super("EditorService");

    this.lspServer = LspService;
    this.editorConfig = editorConfig;
    this.fileSystem = fileSystem;
    this.explorerService = explorerService;
    this.theme = theme;
  }

  override start(window: any): void {
    const disableInBuiltTypescriptWorker = this.lspServer
      ? this.lspServer.config.disableInBuiltTypescriptWorker
      : false;

    window.MonacoEnvironment = {
      getWorker(_: unknown, label: string) {
        if (label === "json") return new json_worker();
        if (label === "css" || label === "scss" || label === "less")
          return new css_worker();
        if (label === "html" || label === "handlebars" || label === "razor")
          return new html_worker();
        if (label === "typescript" || label === "javascript")
          if (disableInBuiltTypescriptWorker) return new Worker(new URL(""));
          else return new ts_worker();
        return new editor_worker();
      },
    };

    this.window = window;
    if (this.lspServer) window.monaco = monaco;
  }

  public async mount(
    document: any,
    domElement: EditorDomElement,
    theme: "Dark" | "Light",
  ): Promise<void> {
    const el = this.resolveElement(document, domElement);

    this.theme = theme;

    if (!el) {
      console.warn("[EditorService] Mount element not found");
      return;
    }

    this.editor = monaco.editor.create(el, {
      language: "plaintext",
      theme: this.theme === "Dark" ? "vs-dark" : "vs-light",

      selectionHighlight: true,
      renderLineHighlight: "all",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 15,
      folding: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "expand",
      fixedOverflowWidgets: true,
      largeFileOptimizations: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      codeLens: true,
      fontLigatures: true,
      bracketPairColorization: { enabled: true },
      wordBasedSuggestions: "off",
      smoothScrolling: true,

      ...this.editorConfig,
    });

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(false);
    monaco.languages.typescript.typescriptDefaults.setMaximumWorkerIdleTime(-1);
    monaco.languages.typescript.javascriptDefaults.setMaximumWorkerIdleTime(-1);
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    });
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
      noSuggestionDiagnostics: true,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
      noSuggestionDiagnostics: true,
    });
    (monaco.languages.typescript as any).typescriptDefaults._onDidChange.fire();
    monaco.languages.registerCompletionItemProvider("typescript", {
      provideCompletionItems: () => ({ suggestions: [] }),
    });

    try {
      const svc = StandaloneServices.get(ITextModelService) as any;

      if (!svc) {
        return;
      }

      if (svc.__meridia_patched) {
        return;
      }

      svc.__meridia_patched = true;
      const original = svc.createModelReference.bind(svc);

      svc.createModelReference = async (resource: monaco.Uri) => {
        if (!monaco.editor.getModel(resource)) {
          try {
            const fsPath =
              resource.fsPath ||
              decodeURIComponent(resource.path).replace(/^\//, "");

            const content = await this.fileSystem.readFile(fsPath);
            monaco.editor.createModel(
              content,
              path_to_language(fsPath, monaco),
              resource,
            );
          } catch (e) {}
        }
        return original(resource);
      };
    } catch (e) {}

    async function get_or_create_model(
      path: string,
      fileSystem: FileSystemService,
    ): Promise<monaco.editor.ITextModel> {
      const uri = monaco.Uri.file(path);
      let model = monaco.editor.getModel(uri);

      if (!model) {
        const content = await fileSystem.readFile(path);

        model = monaco.editor.createModel(content, undefined, uri);
      }

      return model;
    }

    function resolve_file_uri(url: string, workspace_path: string): string {
      let path = url.replace(/^file:\/\/\/?/, "");

      path = path.replace(/\\/g, "/");
      workspace_path = workspace_path.replace(/\\/g, "/");

      if (
        path.startsWith("./") ||
        path.startsWith("../") ||
        !path.startsWith("/")
      ) {
        const base = workspace_path.replace(/\/+$/, "");
        const parts = base.split("/");
        const rel_parts = path.replace(/^\.\//, "").split("/");

        for (const part of rel_parts) {
          if (part === "..") parts.pop();
          else if (part !== ".") parts.push(part);
        }

        return parts.join("/");
      }

      return path;
    }

    monaco.editor.registerLinkOpener({
      open: async (resource) => {
        const url = resource.toString();

        if (url.startsWith("file://")) {
          const tree = this.explorerService.structure!;

          if (!tree) {
            const model = await this.create_model(url);
            await this.set_model_active(model.uri);
            return true;
          }

          const resolved = resolve_file_uri(url, tree.path);
          const model = await this.create_model(resolved);
          await this.set_model_active(model.uri);
          return true;
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
          // window.shell.open_external(url);
          return true;
        }

        return false;
      },
    });

    const fileSystem = this.fileSystem;

    monaco.editor.registerEditorOpener({
      openCodeEditor: async (_, resource, selectionOrPosition) => {
        const path = resource.fsPath;

        const model = await get_or_create_model(path, fileSystem);

        await this.set_model_active(model.uri.fsPath);

        if (selectionOrPosition) {
          setTimeout(() => {
            const editor = monaco.editor
              .getEditors()
              .find((e) => e.getModel() === model);
            if (!editor) return;

            if ("lineNumber" in selectionOrPosition) {
              editor.setPosition(selectionOrPosition);
              editor.revealPositionInCenter(selectionOrPosition);
            } else {
              editor.setSelection(selectionOrPosition);
              editor.revealRangeInCenter(selectionOrPosition);
            }
          }, 50);
        }

        return true;
      },
    });

    if (this.lspServer)
      this.lspServer.start(window, this.window.monaco, this.editor);
  }

  private resolveElement(
    root: Document,
    domElement: EditorDomElement,
  ): HTMLElement | null {
    if (domElement instanceof HTMLElement) {
      return domElement;
    }

    if (domElement.startsWith(".")) {
      return root.querySelector(domElement);
    }

    if (domElement.startsWith("#")) {
      return root.getElementById(domElement);
    }

    return null;
  }

  public async create_model(file_path: string) {
    const uri = monaco.Uri.file(normalize(file_path));
    const content = (await this.fileSystem.readFile(file_path)) ?? "";

    const existing = monaco.editor.getModel(uri);
    const model =
      existing ??
      monaco.editor.createModel(
        content,
        path_to_language(file_path, monaco),
        uri,
      );
    // if (existing && existing.getValue() !== content) existing.setValue(content);

    const entry = {
      uri: file_path,
      model,
      dispose: () => model.dispose(),
      cursor_position: { line: 1, col: 1 },
      selection: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
    };

    if (!this.models.find((m) => m.uri === file_path)) {
      this.models.push(entry);
    }

    return entry;
  }

  public add_model(model: any): void {
    this.models.push(model);
  }

  public async set_model_active(uri: string): Promise<void> {
    const model = this.models.find((m) => m.uri === uri);
    if (!model) return;

    this.active_model = model;
    this.editor!.setModel(model.model);

    if (model.selection) {
      const s = model.selection;
      this.editor!.setSelection(
        new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
      );
      this.editor!.revealRangeInCenter(
        new monaco.Range(s.startLine, s.startCol, s.endLine, s.endCol),
      );
    } else {
      const pos = model.cursor_position ?? { line: 1, col: 1 };
      this.editor!.setPosition({ lineNumber: pos.line, column: pos.col });
      this.editor!.revealPositionInCenter({
        lineNumber: pos.line,
        column: pos.col,
      });
    }

    this.editor!.focus();
  }

  public dispose_model(uri: string): void {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;
    const model = this.models[index] as any;
    model.dispose();
    this.models.splice(index, 1);
  }
}
