import { EventEmitter } from "../../../emitter";
import type { ComponentClasses } from "../../components";
import type { Tab } from "../../../TabService";

export class TabComponent {
  private root: HTMLElement | null = null;
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    private classes: ComponentClasses,
  ) {}

  render(document: Document): HTMLElement {
    const root = document.createElement("div");
    root.className = this.classes.tabBar;

    this.root = root;
    return root;
  }

  setTabs(tabs: Tab[]) {
    this.tabs = tabs;
    this.renderTabs();
  }

  setActive(id: string) {
    this.activeTabId = id;
    this.updateActiveState();
  }

  private renderTabs() {
    if (!this.root) return;

    this.root.innerHTML = "";

    for (const tab of this.tabs) {
      const tabEl = document.createElement("div");
      tabEl.className = this.classes.tab;

      if (tab.id === this.activeTabId) {
        tabEl.classList.add(this.classes.tabActive);
      }

      const label = document.createElement("span");
      label.textContent = tab.name;

      const close = document.createElement("span");
      close.className = "codicon codicon-close";
      close.style.marginLeft = "8px";

      // events
      tabEl.addEventListener("click", () => {
        this.eventEmitter.emit("tab:click", tab.id);
      });

      close.addEventListener("click", (e) => {
        e.stopPropagation();
        this.eventEmitter.emit("tab:close", tab.id);
      });

      tabEl.appendChild(label);
      tabEl.appendChild(close);

      this.root.appendChild(tabEl);
    }
  }

  private updateActiveState() {
    if (!this.root) return;

    const children = Array.from(this.root.children) as HTMLElement[];

    children.forEach((el, index) => {
      const tab = this.tabs[index];
      if (!tab) return;

      if (tab.id === this.activeTabId) {
        el.classList.add(this.classes.tabActive);
      } else {
        el.classList.remove(this.classes.tabActive);
      }
    });
  }
}
