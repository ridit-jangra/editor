import type { EventEmitter } from "./emitter";
import type { ComponentClasses } from "./WorkbenchService/components";

export type BasicTheme = "Dark" | "Light";

export type WorkbenchConfig = {
  fontSize: number;
  fontFamily?: string;
  sidebarWidth?: number;
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

export type FileIconTheme = {
  file: string;
  folder: string;
  folderExpanded: string;

  fileNames?: Record<string, string>;
  extensions?: Record<string, string>;
  folderNames?: Record<string, string>;
};
