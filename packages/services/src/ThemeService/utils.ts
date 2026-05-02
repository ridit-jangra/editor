import { ITheme } from ".";

export function themeToVariables(theme: ITheme): string {
  const colors = theme.colors;
  return `
      :root {
        --wb-bg: ${colors.bg};
        --wb-fg: ${colors.fg};
        --wb-border: ${colors.border};
        --wb-editor-bg: ${colors.editorBg};
        --wb-editor-fg: ${colors.editorFg};
        --wb-tab-bg: ${colors.tabBg};
        --wb-tab-fg: ${colors.tabFg};
        --wb-tab-active-bg: ${colors.tabActiveBg};
        --wb-tab-active-border: ${colors.tabActiveBorder};
        --wb-tab-active-fg: ${colors.tabActiveFg};
        --wb-tab-hover-bg: ${colors.tabHoverBg};
        --wb-tab-hover-fg: ${colors.tabHoverFg};
        --wb-activity-bg: ${colors.activityBg};
        --wb-activity-fg: ${colors.activityFg};
        --wb-activity-hover-bg: ${colors.activityHoverBg};
        --wb-activity-hover-fg: ${colors.activityHoverFg};
        --wb-activity-active-bg: ${colors.actvityActiveBg};
        --wb-activity-active-fg: ${colors.actvityActiveFg};
        --wb-status-bg: ${colors.statusBg};
        --wb-status-fg: ${colors.statusFg};
        --wb-sidebar-bg: ${colors.sidebarBg};
        --wb-sidebar-fg: ${colors.sidebarFg};
        --wb-status-hover-bg: ${colors.statusHoverBg};
        --wb-status-hover-fg: ${colors.statusHoverFg};
        --wb-split-handle: ${colors.splitHandle};
        --wb-split-handle-hover: ${colors.splitHandleHover};
        --wb-split-handle-active: ${colors.splitHandleActive};
      }
    `;
}
