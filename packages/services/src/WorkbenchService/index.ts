import { ITheme, ThemeService } from "../ThemeService";
import { EditorService } from "../EditorService";
import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { defaultComponentClasses, type ComponentClasses } from "./components";
import { StatusbarComponent } from "./basic-components/Statusbar";
import { DarkTheme, LightTheme } from "./basic-presets/themes";
import { TitlebarComponent } from "./basic-components/Titlebar";
import { EditorComponent } from "./basic-components/Editor";
import {
  ActivityBarComponent,
  type ActivityBarConfig,
} from "./basic-components/Activitybar";
import { Splitter } from "../../../ui/src/index";
import { ExplorerService } from "../ExplorerService";
import { StorageService } from "../StorageService";
import { TabService } from "../TabService";
import { TabComponent } from "./basic-components/Tabs";

export type BasicTheme = "Dark" | "Light";

export type WorkbenchConfig = {
  fontSize: number;
  fontFamily?: string;
  sidebarWidth?: number;
  /** Layout direction of the activity bar. Default: "vertical" */
  activityBarDirection?: ActivityBarConfig["direction"];
};

export type TitlebarFactory = (classes: ComponentClasses) => {
  render(document: Document): HTMLElement;
};

export type StatusbarFactory = (
  eventEmitter: EventEmitter,
  classes: ComponentClasses,
) => {
  render(document: Document): HTMLElement;
};

export type ActivityBarFactory = (classes: ComponentClasses) => {
  register(item: ActivityBarItem): void;
  setActive(id: string): void;
  render(document: Document): {
    activityBar: HTMLElement;
    sidebar: HTMLElement;
  };
};

export type EditorAreaFactory = (classes: ComponentClasses) => {
  render(document: Document): HTMLElement;
};

export type TabBarFactory = (
  eventEmitter: EventEmitter,
  classes: ComponentClasses,
) => {
  render(document: Document): HTMLElement;
  setTabs(tabs: any[]): void;
};

export type ActivityBarItem = {
  icon: string;
  id: string;
  panel: () => HTMLElement;
  tooltip: string;
};

export type ComponentFactories = {
  titlebar?: TitlebarFactory;
  statusbar?: StatusbarFactory;
  activityBar?: ActivityBarFactory;
  editorArea?: EditorAreaFactory;
  tabBar?: TabBarFactory;
};

const basicThemeMap: Record<BasicTheme, ITheme> = {
  Dark: DarkTheme,
  Light: LightTheme,
};

const defaultConfig: WorkbenchConfig = {
  fontSize: 16,
  sidebarWidth: 20,
  activityBarDirection: "vertical",
};

export type WorkbenchRequiredServices = {
  editorService: EditorService;
  explorerService: ExplorerService;
  storageService: StorageService;
  themeService?: ThemeService;
};

export type WorkbenchOptions = {
  services: WorkbenchRequiredServices;
  theme?: BasicTheme;
  customTheme?: ITheme;
  classes?: Partial<ComponentClasses>;
  config?: Partial<WorkbenchConfig>;
  components?: ComponentFactories;
};

const makeDefaultFactories = (direction: ActivityBarConfig["direction"]) => ({
  titlebar: (classes: ComponentClasses) => new TitlebarComponent(classes),

  statusbar: (eventEmitter: EventEmitter, classes: ComponentClasses) =>
    new StatusbarComponent(eventEmitter, classes),

  activityBar: (classes: ComponentClasses) =>
    new ActivityBarComponent(classes, { direction }),

  editorArea: (classes: ComponentClasses) => new EditorComponent(classes),

  tabBar: (eventEmitter: EventEmitter, classes: ComponentClasses) =>
    new TabComponent(eventEmitter, classes),
});

export class WorkbenchService extends Service {
  private editorService: EditorService;
  private explorerService: ExplorerService;
  private storageService: StorageService;
  private tabService: TabService | null = null;
  private classes: ComponentClasses;
  private theme: ITheme;
  private themeType: BasicTheme;
  private themeService: ThemeService;
  private config: Required<WorkbenchConfig>;
  private componentFactories: Required<ComponentFactories>;
  private activityBarInstance: ReturnType<ActivityBarFactory> | null = null;
  private splitter: ReturnType<typeof Splitter> | null = null;
  private mounted = false;
  private pendingActivityBarItems: ActivityBarItem[] = [];

  constructor(
    private eventEmitter: EventEmitter,
    {
      classes,
      theme = "Dark",
      customTheme,
      config,
      services,
      components = {},
    }: WorkbenchOptions,
  ) {
    super("WorkbenchService");

    const { editorService, explorerService, storageService, themeService } =
      services;

    this.editorService = editorService;
    this.explorerService = explorerService;
    this.storageService = storageService;
    this.classes = { ...defaultComponentClasses, ...classes };
    this.theme = customTheme ?? basicThemeMap[theme];
    this.themeService = themeService ?? new ThemeService(eventEmitter);
    this.themeType = theme;

    this.config = {
      ...defaultConfig,
      ...config,
      fontSize: config?.fontSize ?? defaultConfig.fontSize,
    } as Required<WorkbenchConfig>;

    const defaults = makeDefaultFactories(this.config.activityBarDirection);

    this.componentFactories = {
      titlebar: components.titlebar ?? defaults.titlebar,
      statusbar: components.statusbar ?? defaults.statusbar,
      activityBar: components.activityBar ?? defaults.activityBar,
      editorArea: components.editorArea ?? defaults.editorArea,
      tabBar: components.tabBar ?? defaults.tabBar,
    };
  }

  async mount(document: Document, window: any) {
    this.themeService.setTheme(this.theme, document);
    this.themeService.start(document);

    const style = document.createElement("style");
    style.textContent = `
      .${this.classes.root} *:not(.${this.classes.editorViewport}, .${this.classes.editorViewport} *) {
        font-size: ${this.config.fontSize}px;
        ${this.config.fontFamily ? `font-family: ${this.config.fontFamily};` : ""}
      }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = "";

    const root = document.createElement("div");
    root.className = this.classes.root;

    const titlebar = this.componentFactories.titlebar(this.classes);
    root.appendChild(titlebar.render(document));

    const middle = document.createElement("div");
    middle.style.cssText =
      "display:flex; flex:1; overflow:hidden; min-height:0;";

    const tree = await this.explorerService.render(document);
    this.activityBarInstance = this.componentFactories.activityBar(
      this.classes,
    );

    this.activityBarInstance.register({
      icon: "files",
      id: "explorer",
      panel: () => tree.el,
      tooltip: "Explorer",
    });
    this.activityBarInstance.register({
      icon: "git-compare",
      id: "git",
      panel: () => tree.el,
      tooltip: "Git",
    });

    for (const item of this.pendingActivityBarItems) {
      this.activityBarInstance.register(item);
    }
    this.pendingActivityBarItems = [];
    this.activityBarInstance.setActive("explorer");

    const { activityBar: activityBarEl, sidebar: sidebarEl } =
      this.activityBarInstance.render(document);

    const editorAreaEl = this.componentFactories
      .editorArea(this.classes)
      .render(document);

    const savedSizes = await (async () => {
      try {
        return (await this.storageService.get("WorkbenchMainSplitter")) ?? null;
      } catch (e) {
        console.error(`[WorkbenchService]: ${e}`);
        return null;
      }
    })();

    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    const makeSplitter = (sidebarEl: HTMLElement) =>
      Splitter({
        direction: "horizontal",
        panels: [
          {
            id: "sidebar",
            size:
              savedSizes?.find((s: any) => s.id === "sidebar")?.size ??
              this.config.sidebarWidth,
            collapsible: true,
            el: sidebarEl,
          },
          {
            id: "editor",
            size:
              savedSizes?.find((s: any) => s.id === "editor")?.size ??
              undefined,
            el: editorAreaEl,
          },
        ],
        gutterSize: 4,
        onCollapse: (id, collapsed) => {
          console.log(
            `[WorkbenchService] panel "${id}" collapsed: ${collapsed}`,
          );
        },
        onResizeEnd: (sizes) => {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(async () => {
            await this.storageService.set("WorkbenchMainSplitter", sizes);
            saveTimeout = null;
          }, 300);
        },
      });

    if (this.config.activityBarDirection === "horizontal") {
      this.splitter = makeSplitter(activityBarEl);
      middle.appendChild(this.splitter.el);
    } else {
      this.splitter = makeSplitter(sidebarEl);
      middle.appendChild(activityBarEl);
      middle.appendChild(this.splitter.el);
    }

    const tabComponent = this.componentFactories.tabBar(
      this.eventEmitter,
      this.classes,
    );
    this.tabService = new TabService(this.eventEmitter, {
      onTabUpdate: (tabs) => tabComponent.setTabs(tabs),
    });
    this.tabService.start();
    editorAreaEl.prepend(tabComponent.render(document));

    root.appendChild(middle);

    const statusbar = this.componentFactories.statusbar(
      this.eventEmitter,
      this.classes,
    );
    root.appendChild(statusbar.render(document));

    document.body.appendChild(root);

    const el = editorAreaEl.querySelector(
      `.${this.classes.editorViewport}`,
    ) as HTMLDivElement;

    this.editorService.start(window);
    await this.editorService.mount(el, this.tabService);
    this.mounted = true;
  }

  /**
   * Register a new activity bar panel at runtime.
   * Safe to call before or after mount() — queued if called before.
   */
  registerComponent(item: ActivityBarItem): void {
    if (this.activityBarInstance) {
      this.activityBarInstance.register(item);
    } else {
      this.pendingActivityBarItems.push(item);
    }
  }

  /**
   * Override a built-in component factory before mount().
   * Throws if called after mount().
   */
  overrideComponent<K extends keyof ComponentFactories>(
    name: K,
    factory: NonNullable<ComponentFactories[K]>,
  ): void {
    if (this.mounted) {
      throw new Error(
        `[WorkbenchService] overrideComponent("${name}") called after mount(). Override before mount().`,
      );
    }
    this.componentFactories[name] = factory as any;
  }

  override stop() {
    this.splitter?.destroy();
  }
}
