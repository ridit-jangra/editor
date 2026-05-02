import { ITheme } from "../../ThemeService";

export const DarkTheme: ITheme = {
  kind: "dark",
  colors: {
    bg: "#262626",
    fg: "#E6E6E6EB",
    border: "#404040",
    editorBg: "#0B0B0B",
    editorFg: "#D8DEE9",
    tabBg: "#262626",
    tabFg: "#E6E6E666",
    tabActiveBg: "#0B0B0B",
    tabActiveFg: "#E6E6E6EB",
    tabActiveBorder: "#FFFFFF",
    tabHoverBg: "#1A1A1A",
    tabHoverFg: "#E6E6E6D6",
    activityBg: "#0B0B0B",
    activityFg: "#E6E6E68F",
    sidebarBg: "#0B0B0B",
    sidebarFg: "#D8DEE9",
    activityHoverBg: "#FFFFFF10",
    activityHoverFg: "#E6E6E6EB",
    actvityActiveBg: "#0B0B0B",
    actvityActiveFg: "#FFFFFF",
    statusBg: "#0D0D0D",
    statusFg: "#E6E6E6B0",
    statusHoverBg: "#FFFFFF10",
    statusHoverFg: "#E6E6E6EB",
    splitHandle: "#404040",
    splitHandleHover: "#FFFFFF26",
    splitHandleActive: "#FFFFFF33",
  },
  tokens: {
    default: "#CFCFD6",

    keyword: "#7FBEB3",
    "keyword.json": "#C26A72",
    "keyword.typeModifier": "#78B8B5",

    source: "#C19A5B",
    metadata: "#D6B66A",

    number: "#C8B07A",
    boolean: "#78B8B5",

    string: "#C48DBE",
    "string.binary": "#9EBB7C",
    "string.escape": "#CFCFD6",
    "string.escape.alternative": "#9D92D9",
    "string.format.item": "#D6B66A",
    "string.regexp": "#BFBFC6",

    identifier: "#CFCFD6",
    "identifier.this": "#D3A06F",
    "identifier.constant": "#7FBEB3",
    "identifier.variable.local": "#C6C6CC",
    "identifier.parameter": "#D6B66A",

    "identifier.function.declaration": "#D3A06F",
    "identifier.method.static": "#D3A06F",
    "identifier.builtin": "#78B8B5",

    "identifier.type": "#D3A06F",
    "identifier.field": "#9A8FD6",
    "identifier.field.static": "#9A8FD6",

    "identifier.interface": "#7FB0D9",
    "identifier.type.class": "#7FB0D9",

    comment: "#6A6A6A",
    "comment.parameter": "#9A9A9A66",

    punctuation: "#CFCFD6",
  },
};

export const LightTheme: ITheme = {
  kind: "light",
  colors: {
    bg: "#f3f3f3",
    fg: "#333333",
    border: "#000",
    editorBg: "#ffffff",
    editorFg: "#000000",
    tabBg: "#ececec",
    tabFg: "#666666",
    tabActiveBorder: "#000000",
    tabActiveBg: "#ffffff",
    tabActiveFg: "#333333",
    tabHoverBg: "#e8e8e8",
    tabHoverFg: "#333333",
    activityBg: "#2c2c2c",
    activityFg: "#858585",
    sidebarBg: "",
    sidebarFg: "",
    activityHoverBg: "#383838",
    activityHoverFg: "#ffffff",
    actvityActiveBg: "#3c3c3c",
    actvityActiveFg: "#ffffff",
    statusBg: "#007acc",
    statusFg: "#ffffff",
    statusHoverBg: "#1a8ad4",
    statusHoverFg: "#ffffff",
    splitHandle: "rgba(0,0,0,0.08)",
    splitHandleHover: "rgba(0,0,0,0.2)",
    splitHandleActive: "rgba(0,0,0,0.3)",
  },
  tokens: {
    default: "#2C2420",

    keyword: "#A8390A",
    "keyword.json": "#B84A0E",
    "keyword.typeModifier": "#5C7A5E",

    source: "#7A4A1E",
    metadata: "#8C3A18",

    number: "#A05C10",
    boolean: "#4E6E50",

    string: "#8C5A1A",
    "string.binary": "#3D6640",
    "string.escape": "#B83030",
    "string.escape.alternative": "#963828",
    "string.format.item": "#A07020",
    "string.regexp": "#4A7068",

    identifier: "#2C2420",
    "identifier.this": "#A8390A",
    "identifier.constant": "#4E6E50",
    "identifier.variable.local": "#3A2E28",
    "identifier.parameter": "#7A4A1E",

    "identifier.function.declaration": "#8C3A18",
    "identifier.method.static": "#7A3616",
    "identifier.builtin": "#4E6E50",

    "identifier.type": "#4A6862",
    "identifier.field": "#7A4A1E",
    "identifier.field.static": "#6A3E18",

    "identifier.interface": "#3E6460",
    "identifier.type.class": "#3E6460",

    comment: "#9A8E86",
    "comment.parameter": "#A09088AA",

    punctuation: "#2C2420",
  },
};
