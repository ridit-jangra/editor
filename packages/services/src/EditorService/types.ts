export type EditorId = string; // e.g. "@ridit/monaco", "image/viewer"

export interface EditorInfo {
  id: EditorId;
  displayName: string;

  extensions: string[];

  filenames?: string[];

  isFallback?: boolean;
}

export interface IEditor {
  readonly info: EditorInfo;

  mount(container: HTMLElement): Promise<void>;

  open(path: string): Promise<void>;

  show(): void;

  hide(): void;

  dispose(): void;
}
