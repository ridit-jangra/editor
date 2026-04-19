import editor_worker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import json_worker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import css_worker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import html_worker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import ts_worker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

import * as monaco from "monaco-editor";
import { Service } from "../service";
import { path_to_language } from "./utils";
import { EventEmitter } from "../emitter";
import { LspService } from "../LspService";
import { FileSystemService } from "../FileSystemService";

export type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;

export type EditorDomElement = HTMLElement | string;

export type EditorServiceOptions = {
  LspService?: LspService;
  fileSystem?: FileSystemService;
  editorConfig?: EditorOptions;
  domElement?: EditorDomElement;
};

export class EditorService extends Service {
  private models: any[] = [];
  private active_model: any | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private lspServer: LspService | undefined = undefined;
  private editorConfig: EditorOptions | undefined = undefined;
  private domElement: EditorDomElement;
  private fileSystem: FileSystemService | undefined = undefined;

  constructor(
    private eventEmiiter: EventEmitter,
    {
      LspService,
      editorConfig,
      domElement = ".editor",
      fileSystem,
    }: EditorServiceOptions,
  ) {
    super("EditorService");

    this.lspServer = LspService;
    this.editorConfig = editorConfig;
    this.domElement = domElement;
    this.fileSystem = fileSystem;
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

    if (this.lspServer) window.monaco = monaco;
  }

  public async mount(document: any): Promise<void> {
    const el = this.resolveElement(document);

    if (!el) {
      console.warn("[EditorService] Mount element not found");
      return;
    }

    this.editor = monaco.editor.create(el, {
      language: "plaintext",
      theme: "theme",

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

    if (this.lspServer) this.lspServer.start(window, monaco, this.editor);
  }

  private resolveElement(root: Document): HTMLElement | null {
    if (this.domElement instanceof HTMLElement) {
      return this.domElement;
    }

    if (this.domElement.startsWith(".")) {
      return root.querySelector(this.domElement);
    }

    if (this.domElement.startsWith("#")) {
      return root.getElementById(this.domElement);
    }

    return null;
  }

  public async create_model(file_path: string) {
    const uri = monaco.Uri.file(file_path);

    const content = "";

    const existing = monaco.editor.getModel(uri);
    const model =
      existing ??
      monaco.editor.createModel(
        content,
        path_to_language(file_path, monaco),
        uri,
      );
    if (existing && existing.getValue() !== content) existing.setValue(content);

    return {
      uri: file_path,
      model,
      dispose: () => model.dispose(),
      cursor_position: { line: 1, col: 1 },
      selection: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
    };
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
