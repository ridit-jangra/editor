import * as monaco from "monaco-editor";

import { path_to_language } from "../utils";
import { type EventEmitter } from "../../emitter";
import { type LspService } from "../../LspService";
import { type FileSystemService } from "../../FileSystemService";
import { type ExplorerService } from "../../ExplorerService";
import { normalize } from "../../VirtualFileSystemService/utils";
import {
  STATUSBAR_SET_FILENAME,
  STATUSBAR_SET_INDENTATION,
  STATUSBAR_SET_LANGUAGE,
  STATUSBAR_SET_LINE_COL,
} from "../../emitter/channels";
import { type EditorInfo, type IEditor } from "../types";
import { ThemeService } from "../../ThemeService";

export type MonacoEditorOptions =
  monaco.editor.IStandaloneEditorConstructionOptions;

export type MonacoEditorConfig = {
  lspService?: LspService;
  fileSystem: FileSystemService;
  disableBuiltinTs: boolean;
  explorerService: ExplorerService;
  themService?: ThemeService;
  editorConfig?: MonacoEditorOptions;
  theme?: "Dark" | "Light";
  workerFactories?: MonacoWorkerFactories;
  interalServices?: MonacoInternalServicesFactories;
};

export interface ModelEntry {
  uri: string;
  model: monaco.editor.ITextModel;
  dispose: () => void;
  cursor_position: { line: number; col: number };
  selection: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  };
}

export type MonacoWorkerFactories = {
  editor: new () => Worker;
  json?: new () => Worker;
  css?: new () => Worker;
  html?: new () => Worker;
  typescript?: new () => Worker;
};

export type MonacoInternalServicesFactories = {
  standaloneServices: () => any;
  ITextModelService: () => any;
};

export class MonacoEditor implements IEditor {
  readonly info: EditorInfo = {
    id: "@ridit/monaco",
    displayName: "Monaco Editor",
    extensions: [
      ".html",
      ".htm",
      ".css",
      ".scss",
      ".less",

      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".mjs",
      ".cjs",

      ".json",
      ".jsonc",
      ".yaml",
      ".yml",
      ".toml",
      ".xml",

      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".rs",
      ".go",
      ".py",
      ".rb",
      ".java",
      ".kt",
      ".swift",
      ".cs",
      ".php",

      ".sh",
      ".bash",
      ".zsh",
      ".fish",
      ".ps1",

      ".md",
      ".mdx",
      ".txt",
      ".csv",
      ".env",

      ".sql",
    ],
    filenames: [
      "Makefile",
      "Dockerfile",
      ".gitignore",
      ".gitattributes",
      ".editorconfig",
    ],
    isFallback: true,
  };

  private models: ModelEntry[] = [];
  private active_model: ModelEntry | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private container: HTMLElement | null = null;

  private readonly lspService: LspService | undefined;
  private readonly themeService: ThemeService | undefined;
  private readonly editorConfig: MonacoEditorOptions | undefined;
  private readonly fileSystem: FileSystemService;
  private readonly explorerService: ExplorerService;
  private readonly theme: "Dark" | "Light" | undefined;
  private readonly eventEmitter: EventEmitter;
  private readonly disableBuiltinTs: boolean;
  private readonly workerFactories: MonacoWorkerFactories | undefined;
  private readonly internalServices:
    | MonacoInternalServicesFactories
    | undefined;

  constructor(eventEmitter: EventEmitter, config: MonacoEditorConfig) {
    this.eventEmitter = eventEmitter;
    this.lspService = config.lspService;
    this.editorConfig = config.editorConfig;
    this.fileSystem = config.fileSystem;
    this.explorerService = config.explorerService;
    this.themeService = config.themService;
    this.theme = config.theme;
    this.disableBuiltinTs = config.disableBuiltinTs ?? false;
    this.workerFactories = config.workerFactories;
    this.internalServices = config.interalServices;
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;

    if (this.workerFactories) {
      setup_monaco_workers(this.workerFactories, this.disableBuiltinTs);
    }

    if (this.themeService) {
      const t = (key: Parameters<typeof this.themeService.getToken>[0]) =>
        this.themeService!.getToken(key) ?? "";

      monaco.editor.defineTheme("custom-editor-theme", {
        base: this.theme === "Dark" ? "vs-dark" : "vs",
        inherit: true,
        colors: {
          "editor.background": this.themeService.getColor("editorBg"),
          "editor.foreground": this.themeService.getColor("editorFg"),
        },
        rules: [
          { token: "", foreground: t("default") },

          { token: "keyword", foreground: t("keyword") },
          { token: "keyword.json", foreground: t("keyword.json") },
          {
            token: "keyword.typeModifier",
            foreground: t("keyword.typeModifier"),
          },

          { token: "source", foreground: t("source") },
          { token: "metadata", foreground: t("metadata") },

          { token: "number", foreground: t("number") },
          { token: "boolean", foreground: t("boolean") },

          { token: "string", foreground: t("string") },
          { token: "string.binary", foreground: t("string.binary") },
          { token: "string.escape", foreground: t("string.escape") },
          {
            token: "string.escape.alternative",
            foreground: t("string.escape.alternative"),
          },
          { token: "string.format.item", foreground: t("string.format.item") },
          { token: "string.regexp", foreground: t("string.regexp") },

          { token: "identifier", foreground: t("identifier") },
          { token: "identifier.this", foreground: t("identifier.this") },
          {
            token: "identifier.constant",
            foreground: t("identifier.constant"),
          },
          {
            token: "identifier.variable.local",
            foreground: t("identifier.variable.local"),
          },
          {
            token: "identifier.parameter",
            foreground: t("identifier.parameter"),
          },

          {
            token: "identifier.function.declaration",
            foreground: t("identifier.function.declaration"),
          },
          {
            token: "identifier.method.static",
            foreground: t("identifier.method.static"),
          },
          { token: "identifier.builtin", foreground: t("identifier.builtin") },

          { token: "identifier.type", foreground: t("identifier.type") },
          { token: "identifier.field", foreground: t("identifier.field") },
          {
            token: "identifier.field.static",
            foreground: t("identifier.field.static"),
          },
          {
            token: "identifier.interface",
            foreground: t("identifier.interface"),
          },
          {
            token: "identifier.type.class",
            foreground: t("identifier.type.class"),
          },

          { token: "comment", foreground: t("comment"), fontStyle: "italic" },
          {
            token: "comment.parameter",
            foreground: t("comment.parameter"),
            fontStyle: "italic",
          },

          { token: "punctuation", foreground: t("punctuation") },
          { token: "string.value.json", foreground: t("string") },
          { token: "string.key.json", foreground: t("identifier.field") },
          { token: "number.json", foreground: t("number") },
          { token: "keyword.json", foreground: t("keyword.json") },

          {
            token: "comment.line.json",
            foreground: t("comment"),
            fontStyle: "italic",
          },
          {
            token: "comment.block.json",
            foreground: t("comment"),
            fontStyle: "italic",
          },
          { token: "delimiter.bracket.json", foreground: t("punctuation") },
          { token: "delimiter.array.json", foreground: t("punctuation") },
          { token: "delimiter.colon.json", foreground: t("punctuation") },
          { token: "delimiter.comma.json", foreground: t("punctuation") },
          { token: "tag", foreground: t("keyword") },
          { token: "tag.html", foreground: t("keyword") },

          { token: "attribute.name", foreground: t("identifier") },
          { token: "attribute.value", foreground: t("string") },

          { token: "delimiter.angle", foreground: t("punctuation") },

          { token: "metatag", foreground: t("metadata") },

          {
            token: "comment.html",
            foreground: t("comment"),
            fontStyle: "italic",
          },
          { token: "tag", foreground: t("identifier") },

          { token: "attribute.name", foreground: t("identifier.field") },
          { token: "attribute.value", foreground: t("string") },

          { token: "number", foreground: t("number") },
          { token: "string", foreground: t("string") },

          { token: "keyword", foreground: t("keyword") },

          { token: "delimiter", foreground: t("punctuation") },

          {
            token: "comment.css",
            foreground: t("comment"),
            fontStyle: "italic",
          },
        ],
      });
    }

    this.editor = monaco.editor.create(container, {
      language: "plaintext",
      theme: this.themeService
        ? "custom-editor-theme"
        : this.theme === "Dark"
          ? "vs-dark"
          : "vs",
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

    this._patch_model_resolver();
    this._register_link_opener();
    this._register_editor_opener();
    this._bind_statusbar_events();

    this.eventEmitter.emit(STATUSBAR_SET_LINE_COL, { line: 1, col: 1 });

    if (this.lspService) {
      const w = window as any;
      w.monaco = monaco;
      this.lspService.start(w, monaco, this.editor);
    }
  }

  async open(path: string): Promise<void> {
    const model = await this.create_model(path);
    await this.set_model_active(model.uri);
  }

  show(): void {
    console.log(
      `[MonacoEditor] showing container; container: ${this.container}`,
    );
    if (this.container) this.container.style.display = "block";
    this.editor?.layout();
  }

  hide(): void {
    console.log(
      `[MonacoEditor] hiding container; container: ${this.container}`,
    );
    if (this.container) this.container.style.display = "none";
  }

  dispose(): void {
    this.models.forEach((m) => m.dispose());
    this.models = [];
    this.editor?.dispose();
    this.editor = null;
  }

  async create_model(file_path: string): Promise<ModelEntry> {
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

    const entry: ModelEntry = {
      uri: file_path,
      model,
      dispose: () => model.dispose(),
      cursor_position: { line: 1, col: 1 },
      selection: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
    };

    if (!this.models.find((m) => m.uri === file_path)) this.models.push(entry);

    return entry;
  }

  add_model(model: ModelEntry): void {
    this.models.push(model);
  }

  async set_model_active(uri: string): Promise<void> {
    const model = this.models.find((m) => m.uri === uri);
    if (!model) return;

    this.active_model = model;
    this.editor!.setModel(model.model);

    const s = model.selection;
    if (
      s.startLine !== 1 ||
      s.startCol !== 1 ||
      s.endLine !== 1 ||
      s.endCol !== 1
    ) {
      this.editor!.setSelection(
        new monaco.Selection(s.startLine, s.startCol, s.endLine, s.endCol),
      );
      this.editor!.revealRangeInCenter(
        new monaco.Range(s.startLine, s.startCol, s.endLine, s.endCol),
      );
    } else {
      const pos = model.cursor_position;
      this.editor!.setPosition({ lineNumber: pos.line, column: pos.col });
      this.editor!.revealPositionInCenter({
        lineNumber: pos.line,
        column: pos.col,
      });
    }

    this.editor!.focus();
  }

  dispose_model(uri: string): void {
    const index = this.models.findIndex((m) => m.uri === uri);
    if (index === -1) return;
    this.models[index]!.dispose();
    this.models.splice(index, 1);
  }

  get instance(): monaco.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  private _save_active_model_state() {
    if (!this.editor || !this.active_model) return;

    const position = this.editor.getPosition();
    const selection = this.editor.getSelection();

    if (position) {
      this.active_model.cursor_position = {
        line: position.lineNumber,
        col: position.column,
      };
    }

    if (selection) {
      this.active_model.selection = {
        startLine: selection.startLineNumber,
        startCol: selection.startColumn,
        endLine: selection.endLineNumber,
        endCol: selection.endColumn,
      };
    }
  }

  private _patch_model_resolver(): void {
    try {
      if (this.internalServices) {
        const StandaloneServices = this.internalServices
          .standaloneServices as any;
        const ITextModelService = this.internalServices.ITextModelService;
        const svc = StandaloneServices.get(ITextModelService) as any;
        if (!svc || svc.__meridia_patched) return;

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
            } catch {}
          }
          return original(resource);
        };
      }
    } catch {}
  }

  private _register_link_opener(): void {
    monaco.editor.registerLinkOpener({
      open: async (resource) => {
        const url = resource.toString();

        if (url.startsWith("file://")) {
          const tree = this.explorerService.structure;
          const resolved = tree
            ? resolve_file_uri(url, tree.path)
            : url.replace(/^file:\/\/\/?/, "");
          const model = await this.create_model(resolved);
          await this.set_model_active(model.uri);
          return true;
        }

        return url.startsWith("http://") || url.startsWith("https://");
      },
    });
  }

  private _register_editor_opener(): void {
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
  }

  private _bind_statusbar_events(): void {
    this.editor!.onDidChangeCursorPosition((e) => {
      this.eventEmitter.emit(STATUSBAR_SET_LINE_COL, {
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    this.editor!.onDidChangeModel((e) => {
      if (!e.newModelUrl) return;
      const model = monaco.editor.getModel(e.newModelUrl);
      if (!model) return;
      this.eventEmitter.emit(STATUSBAR_SET_LANGUAGE, model.getLanguageId());
      this.eventEmitter.emit(STATUSBAR_SET_FILENAME, e.newModelUrl.fsPath);
      this.eventEmitter.emit(
        STATUSBAR_SET_INDENTATION,
        model.getOptions().tabSize,
      );
    });

    this.editor!.onDidChangeModelLanguage((e) => {
      this.eventEmitter.emit(STATUSBAR_SET_LANGUAGE, e.newLanguage);
    });

    this.editor!.onDidChangeModelOptions((e) => {
      this.eventEmitter.emit(STATUSBAR_SET_INDENTATION, e.tabSize);
    });

    this.editor!.onDidChangeCursorPosition(() => {
      this._save_active_model_state();
    });

    this.editor!.onDidChangeCursorSelection(() => {
      this._save_active_model_state();
    });
  }

  getActiveModel(): ModelEntry | null {
    return this.active_model;
  }

  getCurrentFile(): string | null {
    return this.active_model?.uri ?? null;
  }

  getSelection() {
    if (!this.editor) return null;

    const sel = this.editor.getSelection();
    if (!sel) return null;

    const model = this.editor.getModel();
    if (!model) return null;

    return {
      startLine: sel.startLineNumber,
      startCol: sel.startColumn,
      endLine: sel.endLineNumber,
      endCol: sel.endColumn,
      text: model.getValueInRange(sel),
    };
  }

  getCursorPosition() {
    if (!this.editor) return null;

    const pos = this.editor.getPosition();
    if (!pos) return null;

    return {
      line: pos.lineNumber,
      col: pos.column,
    };
  }

  async insertAtCursor(text: string) {
    if (!this.editor) return;

    const position = this.editor.getPosition();
    if (!position) return;

    this.editor.executeEdits("ai", [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  async replaceSelection(text: string) {
    if (!this.editor) return;

    const selection = this.editor.getSelection();
    if (!selection) return;

    this.editor.executeEdits("ai", [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  async replaceFileContent(text: string) {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    const fullRange = model.getFullModelRange();

    this.editor.executeEdits("ai", [
      {
        range: fullRange,
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  revealPosition(line: number, col: number) {
    if (!this.editor) return;

    this.editor.revealPositionInCenter({
      lineNumber: line,
      column: col,
    });

    this.editor.setPosition({
      lineNumber: line,
      column: col,
    });
  }

  getDiagnostics() {
    const model = this.editor?.getModel();
    if (!model) return [];

    return monaco.editor.getModelMarkers({
      resource: model.uri,
    });
  }
}

export function setup_monaco_workers(
  factories: MonacoWorkerFactories,
  disableTs = false,
): void {
  (window as any).MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === "json" && factories.json) return new factories.json();
      if (
        (label === "css" || label === "scss" || label === "less") &&
        factories.css
      )
        return new factories.css();
      if (
        (label === "html" || label === "handlebars" || label === "razor") &&
        factories.html
      )
        return new factories.html();
      if (
        (label === "typescript" || label === "javascript") &&
        factories.typescript &&
        !disableTs
      )
        return new factories.typescript();
      return new factories.editor();
    },
  };
}

async function get_or_create_model(
  path: string,
  fileSystem: FileSystemService,
): Promise<monaco.editor.ITextModel> {
  const uri = monaco.Uri.file(path);
  const existing = monaco.editor.getModel(uri);
  if (existing) return existing;
  const content = await fileSystem.readFile(path);
  return monaco.editor.createModel(content, undefined, uri);
}

function resolve_file_uri(url: string, workspace_path: string): string {
  let path = url.replace(/^file:\/\/\/?/, "").replace(/\\/g, "/");
  workspace_path = workspace_path.replace(/\\/g, "/");

  if (
    path.startsWith("./") ||
    path.startsWith("../") ||
    !path.startsWith("/")
  ) {
    const parts = workspace_path.replace(/\/+$/, "").split("/");
    for (const part of path.replace(/^\.\//, "").split("/")) {
      if (part === "..") parts.pop();
      else if (part !== ".") parts.push(part);
    }
    return parts.join("/");
  }

  return path;
}
