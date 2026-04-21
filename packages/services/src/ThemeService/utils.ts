import { ITheme } from ".";

export function themeToVariables(theme: ITheme): string {
  return `
      :root {
        --wb-bg: ${theme.bg};
        --wb-fg: ${theme.fg};
        --wb-editor-bg: ${theme.editorBg};
        --wb-editor-fg: ${theme.editorFg};
        --wb-tab-bg: ${theme.tabBg};
        --wb-tab-fg: ${theme.tabFg};
        --wb-tab-active-bg: ${theme.tabActiveBg};
        --wb-tab-active-fg: ${theme.tabActiveFg};
        --wb-tab-hover-bg: ${theme.tabHoverBg};
        --wb-tab-hover-fg: ${theme.tabHoverFg};
        --wb-activity-bg: ${theme.activityBg};
        --wb-activity-fg: ${theme.activityFg};
        --wb-activity-hover-bg: ${theme.activityHoverBg};
        --wb-activity-hover-fg: ${theme.activityHoverFg};
        --wb-activity-active-bg: ${theme.actvityActiveBg};
        --wb-activity-active-fg: ${theme.actvityActiveFg};
        --wb-status-bg: ${theme.statusBg};
        --wb-status-fg: ${theme.statusFg};
        --wb-status-hover-bg: ${theme.statusHoverBg};
        --wb-status-hover-fg: ${theme.statusHoverFg};
        --wb-split-handle: ${theme.splitHandle};
        --wb-split-handle-hover: ${theme.splitHandleHover};
        --wb-split-handle-active: ${theme.splitHandleActive};

      }
    `;
}
