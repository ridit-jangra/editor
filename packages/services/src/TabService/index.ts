import { EventEmitter } from "../emitter";
import { Service } from "../service";

export type Tab = {
  id: string; // used to track in storage
  name: string;
  path: string;
  editor: `${string}/${string}`; // example: @ridit/image-editor or @milo/font-viewer,
};

const genID: () => string = () => {
  return crypto.randomUUID();
};

export class TabService extends Service {
  private tabs: Tab[] = [];

  constructor(
    private eventEmitter: EventEmitter,
    private on: {
      onTabUpdate?: (tabs: Tab[]) => void;
    },
  ) {
    super("TabService");
  }

  override start(): void {
    this.eventEmitter.on("tab:openTab", (path: string) => {
      return this.addTab(path);
    });
    this.eventEmitter.on("tab:removeTab", (id: string) => {
      this.removeTab(id);
    });
  }

  addTab(path: string) {
    const existing = this.tabs.find((t) => t.path === path);
    if (existing) return existing;

    const id = genID();
    const newTab: Tab = {
      id,
      path,
      name: path,
      editor: "@ridit/monaco",
    };

    this.tabs.push(newTab);
    this.on.onTabUpdate?.(this.tabs);

    return newTab;
  }

  removeTab(id: string) {
    const newTabs = this.tabs.filter((t) => t.id !== id);

    this.tabs = newTabs;

    this.on.onTabUpdate?.(this.tabs);
  }

  getTabs() {
    return this.tabs;
  }
}
