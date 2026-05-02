import { EventEmitter } from "../../../emitter";
import type { ComponentClasses } from "../../components";
import type { Tab } from "../../../TabService";
import { getIconName, loadSvg } from "../../utils";

export class TabComponent {
  private root: HTMLElement | null = null;
  private tabs: Tab[] = [];

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

  private setActive(id: string) {
    let changed = false;

    this.tabs.forEach((tab) => {
      if (tab.id === id) {
        if (!tab.active) {
          tab.active = true;
          changed = true;
        }
      } else {
        if (tab.active) {
          tab.active = false;
          changed = true;
        }
      }
    });

    if (changed) {
      this.updateActiveState();
      this.eventEmitter.emit("tab:active", id);
    }
  }

  private renderTabs() {
    if (!this.root) return;

    this.root.innerHTML = "";

    for (const tab of this.tabs) {
      const tabEl = document.createElement("div");
      tabEl.className = this.classes.tab;

      const icon = document.createElement("span");

      const iconName = getIconName(tab.name);
      const svgText = loadSvg(iconName) ?? loadSvg("file.type.default");
      icon.innerHTML = svgText;

      icon.querySelector("svg")!.style.width = "14px";
      icon.querySelector("svg")!.style.height = "14px";
      icon.querySelector("svg")!.style.display = "flex";

      const label = document.createElement("span");
      label.textContent = tab.name;

      const close = document.createElement("span");
      close.className = "codicon codicon-close";
      // close.style.marginLeft = "8px";

      tabEl.addEventListener("click", () => {
        this.setActive(tab.id);
        this.eventEmitter.emit("tab:click", tab.id);
      });

      close.addEventListener("click", (e) => {
        e.stopPropagation();
        this.eventEmitter.emit("tab:removeTab", tab.id);
      });

      tabEl.appendChild(icon);
      tabEl.appendChild(label);
      tabEl.appendChild(close);

      this.root.appendChild(tabEl);
    }

    this.updateActiveState();
  }

  private updateActiveState() {
    if (!this.root) return;

    const children = Array.from(this.root.children) as HTMLElement[];

    children.forEach((el, index) => {
      const tab = this.tabs[index];
      if (!tab) return;

      if (tab.active) {
        el.classList.add(this.classes.tabActive);
      } else {
        el.classList.remove(this.classes.tabActive);
      }
    });
  }
}
