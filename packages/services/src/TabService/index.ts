import { EditorService } from "../EditorService";
import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { StorageService } from "../StorageService";
import { basename } from "../VirtualFileSystemService/utils";

export type Tab = {
  id: string; // used to track in storage
  name: string;
  path: string;
  editor: `${string}/${string}`; // example: @ridit/image-editor or @milo/font-viewer,
  active: boolean;
};

const genID: () => string = () => {
  return crypto.randomUUID();
};

export type TabServiceOptions = {
  services: {
    storageService: StorageService;
    editorService: EditorService;
  };
};

export class TabService extends Service {
  private tabs: Tab[] = [];

  constructor(
    private eventEmitter: EventEmitter,
    private on: {
      onTabUpdate?: (tabs: Tab[]) => void;
    },
    private options: TabServiceOptions,
  ) {
    super("TabService");
  }

  override async start(): Promise<void> {
    this.eventEmitter.on("tab:openTab", async (path: string) => {
      this.addTab(path);
      await this.saveTabsToStore();
      this.hideOrShowEditor();
    });
    this.eventEmitter.on("tab:removeTab", async (id: string) => {
      this.removeTab(id);
      await this.saveTabsToStore();
      this.hideOrShowEditor();
    });

    const storedTabs = await this.getTabsFromStore();
    if (storedTabs && storedTabs.length > 0) {
      this.tabs = storedTabs;
      this.on.onTabUpdate?.(this.tabs);

      const active = this.tabs.find((t) => t.active) ?? this.tabs[0]!;
      active.active = true;

      await this.options.services.editorService.open(active.path);
    }
  }

  hideOrShowEditor() {
    if (this.tabs.length === 0) {
      console.log("[TabService] hiding editors; reason: tabs.length = 0");
      this.options.services.editorService.hide();
    } else {
      const active = this.tabs.find((t) => t.active);
      if (!active) return;
      this.options.services.editorService.show(active.editor);
    }
  }

  addTab(path: string) {
    const existing = this.tabs.find((t) => t.path === path);
    if (existing) {
      this.setActive(existing.id);
      return existing;
    }

    this.tabs.forEach((t) => (t.active = false));

    const newTab: Tab = {
      id: genID(),
      path,
      name: basename(path),
      editor: "@ridit/monaco",
      active: true,
    };

    this.tabs.push(newTab);
    this.on.onTabUpdate?.(this.tabs);
    return newTab;
  }

  removeTab(id: string) {
    const closing = this.tabs.find((t) => t.id === id);
    const wasActive = closing?.active ?? false;

    this.tabs = this.tabs.filter((t) => t.id !== id);

    if (wasActive && this.tabs.length > 0) {
      const next = this.tabs[this.tabs.length - 1]!;
      next.active = true;
      this.options.services.editorService.open(next.path);
    }

    this.on.onTabUpdate?.(this.tabs);
  }

  setActive(id: string) {
    this.tabs.forEach((t) => {
      t.active = t.id === id;
    });

    this.on.onTabUpdate?.(this.tabs);
  }

  getTabs() {
    return this.tabs;
  }

  saveTabsToStore() {
    return this.options.services.storageService.set(
      "editor-tabs",
      this.tabs,
      "tabs",
    );
  }

  getTabsFromStore() {
    return this.options.services.storageService.get("editor-tabs", "tabs");
  }
}
