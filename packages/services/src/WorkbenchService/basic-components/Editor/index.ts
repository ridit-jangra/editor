import type { ComponentClasses } from "../../components";

export class EditorComponent {
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;

  constructor(private classes: ComponentClasses) {}

  render(document: Document): HTMLElement {
    this.document = document;

    const root = document.createElement("div");
    root.className = this.classes.editor;

    const area = document.createElement("div");
    area.className = this.classes.editorArea;

    const viewport = document.createElement("div");
    viewport.classList = this.classes.editorViewport;

    area.appendChild(viewport);

    root.appendChild(area);

    this.rootEl = root;
    return root;
  }

  rerender() {
    if (!this.document || !this.rootEl) return;

    const newEl = this.render(this.document);
    this.rootEl.replaceWith(newEl);
  }
}
