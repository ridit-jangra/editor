import type { ComponentClasses } from "../../components";

export type ActivityBarItem = {
  id: string;
  icon: string;
  tooltip: string;
  panel: () => HTMLElement;
};

export class ActivityBarComponent {
  private items: ActivityBarItem[] = [];
  private activeId: string | null = null;
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;
  private sidebarEl: HTMLElement | null = null;

  constructor(private classes: ComponentClasses) {}

  render(document: Document): {
    activityBar: HTMLElement;
    sidebar: HTMLElement;
  } {
    this.document = document;

    const bar = document.createElement("div");
    bar.className = this.classes.activityBar;

    this.items.forEach((item) => {
      const btn = document.createElement("div");
      btn.className = this.classes.activityBarItem;
      btn.title = item.tooltip;
      btn.textContent = item.icon;

      if (item.id === this.activeId) {
        btn.classList.add(this.classes.activityBarItemActive);
      }

      btn.addEventListener("click", () => this.setActive(item.id));
      bar.appendChild(btn);
    });

    this.rootEl = bar;

    const sidebar = document.createElement("div");
    sidebar.className = this.classes.sidebar;
    this.sidebarEl = sidebar;

    this.renderSidebar();

    return { activityBar: bar, sidebar };
  }

  private renderSidebar() {
    if (!this.sidebarEl) return;

    this.sidebarEl.innerHTML = "";

    const active = this.items.find((i) => i.id === this.activeId);
    if (!active) return;

    const header = document.createElement("div");
    header.className = this.classes.sidebarHeader;
    header.textContent = active.tooltip.toUpperCase();

    const content = document.createElement("div");
    content.className = this.classes.sidebarContent;
    content.appendChild(active.panel());

    this.sidebarEl.appendChild(header);
    this.sidebarEl.appendChild(content);
  }

  setActive(id: string) {
    if (this.activeId === id) {
      this.activeId = null;
    } else {
      this.activeId = id;
    }

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
    if (!this.document || !this.rootEl || !this.sidebarEl) return;

    const { activityBar } = this.render(this.document);
    this.rootEl.replaceWith(activityBar);
    this.renderSidebar();
  }
}
