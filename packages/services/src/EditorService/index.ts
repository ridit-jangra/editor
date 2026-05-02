import { Service } from "../service";
import { type EventEmitter } from "../emitter";
import { type LspService } from "../LspService";
import { type FileSystemService } from "../FileSystemService";
import { type StorageService } from "../StorageService";
import { type ExplorerService } from "../ExplorerService";
import { type IEditor, type EditorInfo, type EditorId } from "./types";
import {
  MonacoEditor,
  type MonacoEditorOptions,
  type MonacoWorkerFactories,
} from "./default-editors/monaco";
import { TabService } from "../TabService";
import { ThemeService } from "../ThemeService";

export type { EditorId, EditorInfo, IEditor };
export type { MonacoEditorOptions as EditorOptions };
export type { MonacoWorkerFactories };

export type EditorRequiredServices = {
  lspService?: LspService;
  fileSystem: FileSystemService;
  storageService: StorageService;
  explorerService: ExplorerService;
  themeService?: ThemeService;
};

export type EditorServiceOptions = {
  services: EditorRequiredServices;
  editorConfig?: MonacoEditorOptions;
  workerFactories?: MonacoWorkerFactories;
  theme?: "Dark" | "Light";
};

export class EditorService extends Service {
  private editors = new Map<EditorId, IEditor>();
  private active: IEditor | null = null;
  private container: HTMLElement | null = null;
  private tabService?: TabService;
  readonly monaco: MonacoEditor;

  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly options: EditorServiceOptions,
  ) {
    super("EditorService");

    const { explorerService, fileSystem, lspService, themeService } =
      options.services;

    this.monaco = new MonacoEditor(eventEmitter, {
      lspService,
      fileSystem,
      explorerService,
      themService: themeService,
      editorConfig: options.editorConfig,
      workerFactories: options.workerFactories,
      theme: options.theme,
      disableBuiltinTs:
        lspService?.config.disableInBuiltTypescriptWorker ?? false,
    });

    this._register(this.monaco);
  }

  override start(window: any): void {
    this.eventEmitter.on("editor:openFile", async (path: string) => {
      await this.open(path);
    });
  }

  async mount(container: HTMLElement, tabService?: TabService): Promise<void> {
    this.container = container;
    container.style.position = "relative";

    this.tabService = tabService;

    for (const editor of this.editors.values()) {
      const slot = this._make_slot(editor.info.id);
      container.appendChild(slot);
      await editor.mount(slot);
    }

    const defaultSlot = this._slot_of(this.monaco)!;
    defaultSlot.style.display = "block";
    defaultSlot.style.opacity = "1";
    this.active = this.monaco;

    this.eventEmitter.on("tab:click", async (id: string) => {
      const tab = this.tabService?.getTabs().find((t) => t.id === id);
      if (!tab) return;
      await this.open(tab.path);
    });

    this.eventEmitter.on("tab:removeTab", async (_id: string) => {
      // TODO
    });
  }

  register(editor: IEditor): this {
    if (this.container) {
      console.warn(
        `[EditorService] register("${editor.info.id}") called after mount() — slot will not be created`,
      );
    }
    this._register(editor);
    return this;
  }

  getInfo(id: EditorId): EditorInfo {
    const editor = this.editors.get(id);
    if (!editor) throw new Error(`[EditorService] Unknown editor id: "${id}"`);
    return editor.info;
  }

  listEditors(): EditorInfo[] {
    return [...this.editors.values()].map((e) => e.info);
  }

  resolve(filePath: string): IEditor | null {
    const name = filePath.split("/").pop() ?? filePath;

    for (const editor of this.editors.values()) {
      if (editor.info.filenames?.includes(name)) return editor;
    }

    for (const editor of this.editors.values()) {
      const hit = editor.info.extensions
        .slice()
        .sort((a, b) => b.length - a.length)
        .find((ext) => filePath.endsWith(ext));
      if (hit) return editor;
    }

    return [...this.editors.values()].find((e) => e.info.isFallback) ?? null;
  }

  async open(filePath: string): Promise<void> {
    const next = this.resolve(filePath);

    if (!next) {
      console.warn(`[EditorService] No editor found for "${filePath}"`);
      return;
    }

    if (this.active !== next) await this._switch_to(next);
    await next.open(filePath);

    this.eventEmitter.emit("tab:openTab", filePath);
  }

  async switchTo(id: EditorId): Promise<void> {
    const editor = this.editors.get(id);
    if (!editor) throw new Error(`[EditorService] Unknown editor id: "${id}"`);
    await this._switch_to(editor);
  }

  show(id: EditorId) {
    if (!this.container) return;
    const editor = this.editors.get(id);
    if (!editor) throw new Error(`[EditorService] Unknown editor id: "${id}"`);
    const slot = this._slot_of(editor);
    if (slot) {
      slot.style.display = "block";
      slot.style.opacity = "1";
    }
    editor.show();
  }

  hide() {
    if (!this.container) return;
    this.editors.forEach((editor) => editor.hide());
  }

  private _register(editor: IEditor): void {
    if (this.editors.has(editor.info.id)) {
      console.warn(
        `[EditorService] "${editor.info.id}" already registered — overwriting`,
      );
    }
    this.editors.set(editor.info.id, editor);
  }

  private async _switch_to(next: IEditor): Promise<void> {
    if (this.active === next) return;

    if (this.active) {
      const slot = this._slot_of(this.active);
      if (slot) await _fade_out(slot);
      this.active.hide();
    }

    next.show();
    const slot = this._slot_of(next);
    if (slot) await _fade_in(slot);

    this.active = next;
  }

  private _make_slot(id: EditorId): HTMLDivElement {
    const el = document.createElement("div");
    el.dataset.editorSlot = id;
    el.style.cssText =
      "width:100%;height:100%;display:none;opacity:0;position:absolute;inset:0;";
    return el;
  }

  private _slot_of(editor: IEditor): HTMLElement | null {
    return (
      this.container?.querySelector<HTMLElement>(
        `[data-editor-slot="${CSS.escape(editor.info.id)}"]`,
      ) ?? null
    );
  }
}

function _fade_out(el: HTMLElement, ms = 120): Promise<void> {
  return new Promise((resolve) => {
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = "0";
    setTimeout(resolve, ms);
  });
}

function _fade_in(el: HTMLElement, ms = 120): Promise<void> {
  el.style.display = "block";
  el.style.opacity = "0";
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = "1";
      setTimeout(resolve, ms);
    });
  });
}
