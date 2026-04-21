export type ComponentClasses = {
  root: string;
  layout: string;

  titlebar: string;
  titlebarTitle: string;
  titlebarActions: string;

  activityBar: string;
  activityBarItem: string;
  activityBarItemActive: string;

  sidebar: string;
  sidebarHeader: string;
  sidebarContent: string;

  editorArea: string;
  editorViewport: string;
  editor: string;

  tabBar: string;
  tab: string;
  tabActive: string;
  tabHover: string;
  tabDirty: string;
  tabClose: string;

  panelArea: string;
  panel: string;
  panelHeader: string;
  panelContent: string;
  panelTab: string;
  panelTabActive: string;

  terminal: string;

  statusBar: string;
  statusBarItem: string;

  statusBarPrimarySection: string;
  statusBarSecondarySection: string;
};

export const defaultComponentClasses: ComponentClasses = {
  root: "wb-root",
  layout: "wb-layout",

  titlebar: "wb-titlebar",
  titlebarTitle: "wb-titlebar-title",
  titlebarActions: "wb-titlebar-actions",

  activityBar: "wb-activity-bar",
  activityBarItem: "wb-activity-bar-item",
  activityBarItemActive: "wb-activity-bar-item--active",

  sidebar: "wb-sidebar",
  sidebarHeader: "wb-sidebar-header",
  sidebarContent: "wb-sidebar-content",

  editorArea: "wb-editor-area",
  editorViewport: "wb-editor-viewport",
  editor: "wb-editor",

  tabBar: "wb-tab-bar",
  tab: "wb-tab",
  tabActive: "wb-tab--active",
  tabHover: "wb-tab--hover",
  tabDirty: "wb-tab--dirty",
  tabClose: "wb-tab-close",

  panelArea: "wb-panel-area",
  panel: "wb-panel",
  panelHeader: "wb-panel-header",
  panelContent: "wb-panel-content",
  panelTab: "wb-panel-tab",
  panelTabActive: "wb-panel-tab--active",

  terminal: "wb-terminal",

  statusBar: "wb-status-bar",
  statusBarItem: "wb-status-bar-item",
  statusBarPrimarySection: "wb-statusbar-primary-section",
  statusBarSecondarySection: "wb-statusbar-secondary-section",
};
