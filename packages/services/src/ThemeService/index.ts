import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { DarkTheme } from "../WorkbenchService/basic-presets/themes";
import { themeToVariables } from "./utils";

export interface ITheme {
  bg: string;
  fg: string;
  editorBg: string;
  editorFg: string;
  tabBg: string;
  tabFg: string;
  tabActiveBg: string;
  tabActiveFg: string;
  tabHoverBg: string;
  tabHoverFg: string;
  activityBg: string;
  activityFg: string;
  activityHoverBg: string;
  activityHoverFg: string;
  actvityActiveBg: string;
  actvityActiveFg: string;
  statusBg: string;
  statusFg: string;
  statusHoverBg: string;
  statusHoverFg: string;
  splitHandle: string;
  splitHandleHover: string;
  splitHandleActive: string;
}

export class ThemeService extends Service {
  private theme: ITheme;

  constructor(eventEmitter: EventEmitter, theme: ITheme = DarkTheme) {
    super("ThemeService");
    this.theme = theme;
  }

  override start(document: Document) {
    this.injectVariables(document);
  }

  setTheme(theme: ITheme, document: Document) {
    this.theme = theme;
    this.injectVariables(document);
  }

  private injectVariables(document: Document) {
    const existing = document.getElementById("wb-theme");
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = "wb-theme";
    style.textContent = themeToVariables(this.theme);
    document.head.appendChild(style);
  }
}
