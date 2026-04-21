import type { ComponentClasses } from "../../components";

export class StatusbarComponent {
  private primaryItems = new Map<string, any>();
  private secondaryItems = new Map<string, any>();
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;

  constructor(private classes: ComponentClasses) {
    this.registerDefaultItems();
  }

  render(document: Document): HTMLElement {
    this.document = document;

    const root = document.createElement("div");
    root.className = this.classes.statusBar;

    const primarySection = document.createElement("div");
    primarySection.className = this.classes.statusBarPrimarySection;

    this.primaryItems.forEach((item) => {
      const span = document.createElement("span");
      span.className = this.classes.statusBarItem;
      span.textContent = item;
      primarySection.appendChild(span);
    });

    const secondarySection = document.createElement("div");
    secondarySection.className = this.classes.statusBarSecondarySection;

    this.secondaryItems.forEach((item) => {
      const span = document.createElement("span");
      span.className = this.classes.statusBarItem;
      span.textContent = item;
      secondarySection.appendChild(span);
    });

    root.appendChild(primarySection);
    root.appendChild(secondarySection);

    this.rootEl = root;
    return root;
  }

  rerender() {
    if (!this.document || !this.rootEl) return;

    const newEl = this.render(this.document);
    this.rootEl.replaceWith(newEl);
  }

  addOrUpdateItem(
    id: string,
    value: any,
    place: "primary" | "secondary" = "secondary",
  ) {
    if (place === "primary") this.primaryItems.set(id, value);
    else this.secondaryItems.set(id, value);

    if (!this.document) {
      console.warn("[WorkbenchService]:[StatusbarComponent] No DOM found.");
      return;
    }

    this.rerender();
  }

  removeItem(id: string) {
    this.primaryItems.delete(id);
    this.secondaryItems.delete(id);
    this.rerender();
  }

  private registerDefaultItems() {
    this.primaryItems.set("currentFile", "main");
  }
}
