import { ITheme, ThemeService } from "../ThemeService";
import { EditorService } from "../EditorService";
import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { defaultComponentClasses, type ComponentClasses } from "./components";
import { StatusbarComponent } from "./basic-components/Statusbar";
import { DarkTheme, LightTheme } from "./basic-presets/themes";
import { TitlebarComponent } from "./basic-components/Titlebar";
import { EditorComponent } from "./basic-components/Editor";
import { ActivityBarComponent } from "./basic-components/Activitybar";
import { Splitter } from "../../../ui/src/index";
import { ExplorerService } from "../ExplorerService";
import { StorageService } from "../StorageService";

export type BasicTheme = "Dark" | "Light";

export type WorkbenchConfig = {
  fontSize: { size: number; applyGlobally: boolean };
  fontFamily?: string;
  sidebarWidth?: number;
};

const basicThemeMap: Record<BasicTheme, ITheme> = {
  Dark: DarkTheme,
  Light: LightTheme,
};

const defaultConfig: WorkbenchConfig = {
  fontSize: {
    size: 16,
    applyGlobally: true,
  },
  sidebarWidth: 20,
};

export type WorkbenchOptions = {
  editorService: EditorService;
  themeService?: ThemeService;
  explorerService: ExplorerService;
  storageService: StorageService;
  theme?: BasicTheme;
  customTheme?: ITheme;
  classes?: Partial<ComponentClasses>;
  config?: Partial<WorkbenchConfig>;
};

export class WorkbenchService extends Service {
  private editorService: EditorService;
  private explorerService: ExplorerService;
  private storageService: StorageService;
  private classes: ComponentClasses;
  private theme: ITheme;
  private themeType: BasicTheme;
  private themeService: ThemeService;
  private config: WorkbenchConfig;
  private activityBar: ActivityBarComponent | null = null;
  private splitter: ReturnType<typeof Splitter> | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    {
      editorService,
      explorerService,
      classes,
      theme = "Dark",
      customTheme,
      themeService,
      config,
      storageService,
    }: WorkbenchOptions,
  ) {
    super("WorkbenchService");

    this.editorService = editorService;
    this.explorerService = explorerService;
    this.storageService = storageService;
    this.classes = { ...defaultComponentClasses, ...classes };
    this.theme = customTheme ?? basicThemeMap[theme];
    this.themeService = themeService
      ? themeService
      : new ThemeService(eventEmitter);
    this.config = {
      ...defaultConfig,
      ...config,
      fontSize: { ...defaultConfig.fontSize, ...config?.fontSize },
    };
    this.themeType = theme;
  }

  async mount(document: Document, window: any) {
    this.themeService.setTheme(this.theme, document);
    this.themeService.start(document);

    if (this.config.fontSize.applyGlobally) {
      const style = document.createElement("style");
      style.textContent = `
        .${this.classes.root} *:not(.${this.classes.editorViewport}, .${this.classes.editorViewport} *) {
          font-size: ${this.config.fontSize.size}px;
          ${this.config.fontFamily ? `font-family: ${this.config.fontFamily};` : ""}
        }
      `;
      document.head.appendChild(style);
    } else {
      document.body.style.fontSize = `${this.config.fontSize.size}px`;
      if (this.config.fontFamily)
        document.body.style.fontFamily = this.config.fontFamily;
    }

    document.body.innerHTML = "";

    const root = document.createElement("div");
    root.className = this.classes.root;

    const titlebar = new TitlebarComponent(this.classes);
    root.appendChild(titlebar.render(document));

    const middle = document.createElement("div");
    middle.style.cssText =
      "display:flex; flex:1; overflow:hidden; min-height:0;";

    const tree = await this.explorerService.render(document);

    this.activityBar = new ActivityBarComponent(this.classes);

    this.activityBar.register({
      icon: "E",
      id: "explorer",
      panel: () => tree.el,
      tooltip: "Explorer",
    });

    this.activityBar.setActive("explorer");

    const { activityBar: activityBarEl, sidebar: sidebarEl } =
      this.activityBar.render(document);

    const editorComponent = new EditorComponent(this.classes);
    const editorAreaEl = editorComponent.render(document);

    const savedSizes = await (async () => {
      try {
        const result = await this.storageService.get("WorkbenchMainSplitter");
        return result ?? null;
      } catch {
        return null;
      }
    })();

    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    this.splitter = Splitter({
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
            savedSizes?.find((s: any) => s.id === "editor")?.size ?? undefined,
          el: editorAreaEl,
        },
      ],
      gutterSize: 4,
      onCollapse: (id, collapsed) => {
        console.log(`[WorkbenchService] panel "${id}" collapsed: ${collapsed}`);
      },
      onResizeEnd: (sizes) => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          await this.storageService.set("WorkbenchMainSplitter", sizes);
          saveTimeout = null;
        }, 300);
      },
    });

    middle.appendChild(activityBarEl);
    middle.appendChild(this.splitter.el);

    root.appendChild(middle);

    const statusbar = new StatusbarComponent(this.classes);
    root.appendChild(statusbar.render(document));

    document.body.appendChild(root);

    this.editorService.start(window);
    await this.editorService.mount(
      document,
      `.${this.classes.editorViewport}`,
      this.themeType,
    );
  }

  override stop() {
    this.splitter?.destroy();
  }
}
