import { EventEmitter } from "../../../emitter";
import {
  STATUSBAR_SET_FILENAME,
  STATUSBAR_SET_ENCODING,
  STATUSBAR_SET_INDENTATION,
  STATUSBAR_SET_LANGUAGE,
  STATUSBAR_SET_LINE_COL,
  STATUSBAR_SET_MESSAGE,
} from "../../../emitter/channels";
import type { ComponentClasses } from "../../components";

type StatusbarItemOptions = {
  text?: string;
  onClick?: () => void;
  tooltip?: string;
};

type StatusbarItemInstance = {
  el: HTMLElement;
  setText(t: string | null): void;
};

function createItem(
  document: Document,
  classes: string,
  opts: StatusbarItemOptions = {},
): StatusbarItemInstance {
  const el = document.createElement("div");
  el.className = classes;
  el.style.display = "none";
  if (opts.text) {
    el.textContent = opts.text;
    el.style.display = "flex";
  }
  if (opts.onClick) el.addEventListener("click", opts.onClick);

  return {
    el,
    setText(t: string | null) {
      if (t === null || t === undefined) {
        el.style.display = "none";
      } else {
        el.style.display = "flex";
        el.textContent = t;
      }
    },
  };
}

export class StatusbarComponent {
  private document: Document | null = null;
  private rootEl: HTMLElement | null = null;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  private messageItem: StatusbarItemInstance | null = null;
  private lineColItem: StatusbarItemInstance | null = null;
  private indentItem: StatusbarItemInstance | null = null;
  private encodingItem: StatusbarItemInstance | null = null;
  private languageItem: StatusbarItemInstance | null = null;
  private leftEl: HTMLElement | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    private classes: ComponentClasses,
  ) {
    eventEmitter.on(STATUSBAR_SET_MESSAGE, (text: string | null) =>
      this.setMessage(text),
    );
    eventEmitter.on(
      STATUSBAR_SET_LINE_COL,
      ({ line, col }: { line: number; col: number }) =>
        this.setLineCol(line, col),
    );
    eventEmitter.on(STATUSBAR_SET_LANGUAGE, (lang: string | null) =>
      this.setLanguage(lang),
    );
    eventEmitter.on(STATUSBAR_SET_INDENTATION, (spaces: number | null) =>
      this.setIndentation(spaces),
    );
    eventEmitter.on(STATUSBAR_SET_ENCODING, (enc: string | null) =>
      this.setEncoding(enc),
    );
    eventEmitter.on(STATUSBAR_SET_FILENAME, (name: string) =>
      this.setFileName(name),
    );
  }

  render(document: Document): HTMLElement {
    this.document = document;

    const root = document.createElement("div");
    root.className = this.classes.statusBar;

    const left = document.createElement("div");
    left.className = this.classes.statusBarPrimarySection;
    this.leftEl = left;

    this.messageItem = createItem(document, this.classes.statusBarItem);

    this.lineColItem = createItem(document, this.classes.statusBarItem);
    this.indentItem = createItem(document, this.classes.statusBarItem);
    this.encodingItem = createItem(document, this.classes.statusBarItem);
    this.languageItem = createItem(document, this.classes.statusBarItem);

    const right = document.createElement("div");
    right.className = this.classes.statusBarSecondarySection;
    right.appendChild(this.lineColItem.el);
    right.appendChild(this.indentItem.el);
    right.appendChild(this.encodingItem.el);
    right.appendChild(this.languageItem.el);

    root.appendChild(left);
    root.appendChild(this.messageItem.el);
    root.appendChild(right);

    this.rootEl = root;
    return root;
  }

  setMessage(text: string | null) {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageItem?.setText(text);
    if (text) {
      this.messageTimer = setTimeout(
        () => this.messageItem?.setText(null),
        5000,
      );
    }
  }

  setFileName(name: string) {
    if (!this.leftEl) return;
    this.leftEl.textContent = name;
  }

  setLeft(el: HTMLElement) {
    if (!this.leftEl) return;
    this.leftEl.innerHTML = "";
    this.leftEl.appendChild(el);
  }

  setLineCol(line: number | null, col: number | null) {
    this.lineColItem?.setText(
      line !== null && col !== null ? `Ln ${line}, Col ${col}` : null,
    );
  }

  setIndentation(spaces: number | null) {
    this.indentItem?.setText(spaces !== null ? `Spaces: ${spaces}` : null);
  }

  setEncoding(encoding: string | null) {
    this.encodingItem?.setText(encoding);
  }

  setLanguage(language: string | null) {
    this.languageItem?.setText(language);
  }

  onIndentClick(handler: () => void) {
    this.indentItem?.el.addEventListener("click", handler);
  }

  onEncodingClick(handler: () => void) {
    this.encodingItem?.el.addEventListener("click", handler);
  }

  onLanguageClick(handler: () => void) {
    this.languageItem?.el.addEventListener("click", handler);
  }
}
