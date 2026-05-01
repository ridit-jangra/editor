import { icon } from "../../../../../ui/src/utils/icon";
import type { ComponentClasses } from "../../components";

export type ActivityBarItem = {
  id: string;
  icon: string;
  tooltip: string;
  panel: () => HTMLElement;
};

export type ActivityBarConfig = {
  direction?: "vertical" | "horizontal";
};

const defaultConfig: Required<ActivityBarConfig> = {
  direction: "vertical",
};

export class ActivityBarComponent {
  private items: ActivityBarItem[] = [];
  private activeId: string | null = null;
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;
  private sidebarEl: HTMLElement | null = null;

  private wrapperEl: HTMLElement | null = null;
  private config: Required<ActivityBarConfig>;

  constructor(
    private classes: ComponentClasses,
    config: ActivityBarConfig = {},
  ) {
    this.config = { ...defaultConfig, ...config };
  }

  render(document: Document): {
    activityBar: HTMLElement;
    sidebar: HTMLElement;
  } {
    this.document = document;

    if (this.config.direction === "horizontal") {
      return this.renderHorizontal(document);
    }

    return this.renderVertical(document);
  }

  private renderVertical(document: Document): {
    activityBar: HTMLElement;
    sidebar: HTMLElement;
  } {
    const bar = document.createElement("div");
    bar.className = this.classes.activityBar;
    bar.dataset.direction = "vertical";
    bar.style.cssText = "display:flex; flex-direction:column; height:100%;";

    this.items.forEach((item) => {
      const btn = this.createButton(document, item);
      bar.appendChild(btn);
    });

    this.rootEl = bar;

    const sidebar = document.createElement("div");
    sidebar.className = this.classes.sidebar;
    this.sidebarEl = sidebar;
    this.renderSidebarContent();

    return { activityBar: bar, sidebar };
  }

  //

  private renderHorizontal(document: Document): {
    activityBar: HTMLElement;
    sidebar: HTMLElement;
  } {
    const wrapper = document.createElement("div");
    wrapper.className = this.classes.sidebar;
    wrapper.dataset.direction = "horizontal";
    wrapper.style.cssText =
      "display:flex; flex-direction:column; width:100%; height:100%;";

    const tabBar = document.createElement("div");
    tabBar.className = this.classes.activityBar;
    tabBar.dataset.direction = "horizontal";
    tabBar.style.cssText =
      "display:flex; flex-direction:row; flex-shrink:0; width:100%;";

    this.items.forEach((item) => {
      const btn = this.createButton(document, item);
      tabBar.appendChild(btn);
    });

    const panel = document.createElement("div");
    panel.style.cssText = "flex:1; overflow:auto;";

    wrapper.appendChild(tabBar);
    wrapper.appendChild(panel);

    this.rootEl = tabBar;
    this.sidebarEl = panel;
    this.wrapperEl = wrapper;

    this.renderSidebarContent();

    return { activityBar: wrapper, sidebar: panel };
  }

  private createButton(document: Document, item: ActivityBarItem): HTMLElement {
    const btn = document.createElement("div");
    btn.className = this.classes.activityBarItem;
    btn.title = item.tooltip;
    btn.dataset.id = item.id;

    if (item.id === this.activeId) {
      btn.classList.add(this.classes.activityBarItemActive);
    }

    if (this.config.direction === "horizontal") {
      const iconEl = icon(item.icon);
      // iconEl.textContent = item.icon;
      iconEl.style.cssText = "margin-right:6px;";

      const labelEl = document.createElement("span");
      labelEl.textContent = item.tooltip;

      btn.appendChild(iconEl);
      btn.appendChild(labelEl);
    } else {
      btn.textContent = item.icon;
    }

    btn.addEventListener("click", () => this.setActive(item.id));
    return btn;
  }

  private renderSidebarContent() {
    if (!this.sidebarEl) return;

    this.sidebarEl.innerHTML = "";

    const active = this.items.find((i) => i.id === this.activeId);
    if (!active) return;

    if (this.config.direction === "vertical") {
      const header = document.createElement("div");
      header.className = this.classes.sidebarHeader;
      header.textContent = active.tooltip.toUpperCase();
      this.sidebarEl.appendChild(header);
    }

    const content = document.createElement("div");
    content.className = this.classes.sidebarContent;
    content.appendChild(active.panel());
    this.sidebarEl.appendChild(content);
  }

  setActive(id: string) {
    this.activeId = this.activeId === id ? null : id;
    this.rerender();
  }

  register(item: ActivityBarItem) {
    this.items.push(item);
    this.rerender();
  }

  unregister(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.activeId === id) this.activeId = null;
    this.rerender();
  }

  private rerender() {
    if (!this.document || !this.rootEl) return;

    if (this.config.direction === "horizontal") {
      this.rootEl.innerHTML = "";
      this.items.forEach((item) => {
        this.rootEl!.appendChild(this.createButton(this.document!, item));
      });
      this.renderSidebarContent();
    } else {
      const { activityBar } = this.render(this.document);
      this.rootEl.replaceWith(activityBar);
      this.rootEl = activityBar;
      this.renderSidebarContent();
    }
  }
}
