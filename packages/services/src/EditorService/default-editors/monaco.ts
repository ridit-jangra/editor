import editor_worker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import json_worker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import css_worker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import html_worker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import ts_worker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

import { StandaloneServices } from "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices?internal";
import { ITextModelService } from "monaco-editor/esm/vs/editor/common/services/resolverService?internal";
import * as monaco from "monaco-editor";

import { path_to_language } from "../utils";
import { type EventEmitter } from "../../emitter";
import { type LspService } from "../../LspService";
import { type FileSystemService } from "../../FileSystemService";
import { type ExplorerService } from "../../ExplorerService";
import { normalize } from "../../VirtualFileSystemService";
import {
  STATUSBAR_SET_FILENAME,
  STATUSBAR_SET_INDENTATION,
  STATUSBAR_SET_LANGUAGE,
  STATUSBAR_SET_LINE_COL,
} from "../../emitter/channels";
import { type EditorInfo, type IEditor } from "../types";

export type MonacoEditorOptions =
  monaco.editor.IStandaloneEditorConstructionOptions;

export type MonacoEditorConfig = {
  lspService?: LspService;
  fileSystem: FileSystemService;
  explorerService: ExplorerService;
  editorConfig?: MonacoEditorOptions;
  theme?: "Dark" | "Light";
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
  private readonly editorConfig: MonacoEditorOptions | undefined;
  private readonly fileSystem: FileSystemService;
  private readonly explorerService: ExplorerService;
  private readonly theme: "Dark" | "Light" | undefined;
  private readonly eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter, config: MonacoEditorConfig) {
    this.eventEmitter = eventEmitter;
    this.lspService = config.lspService;
    this.editorConfig = config.editorConfig;
    this.fileSystem = config.fileSystem;
    this.explorerService = config.explorerService;
    this.theme = config.theme;
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;

    this.editor = monaco.editor.create(container, {
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

    this._patch_model_resolver();
    this._register_link_opener();
    this._register_editor_opener();
    this._bind_statusbar_events();

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
    if (this.container) this.container.style.display = "block";
    this.editor?.layout();
  }

  hide(): void {
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

  private _patch_model_resolver(): void {
    try {
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
  }
}

export function setup_monaco_workers(
  disableInBuiltTypescriptWorker = false,
): void {
  (window as any).MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === "json") return new json_worker();
      if (label === "css" || label === "scss" || label === "less")
        return new css_worker();
      if (label === "html" || label === "handlebars" || label === "razor")
        return new html_worker();
      if (label === "typescript" || label === "javascript")
        return disableInBuiltTypescriptWorker
          ? new Worker(new URL(""))
          : new ts_worker();
      return new editor_worker();
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
