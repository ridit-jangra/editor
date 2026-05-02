import { EventEmitter } from "../emitter";
import { Service } from "../service";
import { DarkTheme } from "../WorkbenchService/basic-presets/themes";
import { themeToVariables } from "./utils";

export interface ITheme {
  kind: "dark" | "light";
  colors: {
    bg: string;
    fg: string;
    border: string;
    editorBg: string;
    editorFg: string;
    tabBg: string;
    tabFg: string;
    tabActiveBg: string;
    tabActiveBorder: string;
    tabActiveFg: string;
    tabHoverBg: string;
    tabHoverFg: string;
    activityBg: string;
    activityFg: string;
    activityHoverBg: string;
    activityHoverFg: string;
    actvityActiveBg: string;
    actvityActiveFg: string;
    sidebarBg: string;
    sidebarFg: string;
    statusBg: string;
    statusFg: string;
    statusHoverBg: string;
    statusHoverFg: string;
    splitHandle: string;
    splitHandleHover: string;
    splitHandleActive: string;
  };
  tokens: {
    default: string;
    keyword: string;
    "keyword.json": string;
    source: string;
    "keyword.typeModifier": string;
    metadata: string;
    number: string;
    boolean: string;
    string: string;
    "string.binary": string;
    "string.escape": string;
    "string.escape.alternative": string;
    "string.format.item": string;
    "string.regexp": string;
    identifier: string;
    "identifier.this": string;
    "identifier.constant": string;
    "identifier.variable.local": string;
    "identifier.parameter": string;
    "identifier.function.declaration": string;
    "identifier.method.static": string;
    "identifier.builtin": string;
    "identifier.type": string;
    "identifier.field": string;
    "identifier.field.static": string;
    "identifier.interface": string;
    "identifier.type.class": string;
    comment: string;
    "comment.parameter": string;
    punctuation: string;
  };
}

export type ThemeColors = ITheme["colors"];
export type ThemeTokens = ITheme["tokens"];

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

  getToken<K extends keyof ThemeTokens>(token: K): ThemeTokens[K] {
    return this.theme.tokens[token];
  }

  getColor<K extends keyof ThemeColors>(token: K): ThemeColors[K] {
    return this.theme.colors[token];
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
