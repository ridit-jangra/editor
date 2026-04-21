import type { ComponentClasses } from "../../components";

export class TitlebarComponent {
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;

  constructor(private classes: ComponentClasses) {}

  render(document: Document): HTMLElement {
    this.document = document;

    const root = document.createElement("div");
    root.className = this.classes.titlebar;

    const title = document.createElement("span");
    title.className = this.classes.titlebarTitle;
    title.textContent = "Editor";

    root.appendChild(title);

    this.rootEl = root;
    return root;
  }

  rerender() {
    if (!this.document || !this.rootEl) return;

    const newEl = this.render(this.document);
    this.rootEl.replaceWith(newEl);
  }
}
