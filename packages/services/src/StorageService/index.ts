import { Service } from "../service";

export class StorageService extends Service {
  private window: Window | null = null;
  private type: "electron" | "web" | null = null;

  constructor() {
    super("StorageService");
  }

  override start(window: Window, type: "electron" | "web") {
    this.window = window;
    this.type = type;
  }

  async set(key: string, value: any) {
    if (!this.window || !this.type) return;

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);

    if (this.type === "electron") {
      await (this.window as any).stg.set(key, serialized);
    } else {
      this.window.localStorage.setItem(
        `@ridit/editor-storage-${key}`,
        serialized,
      );
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.window || !this.type) return null;

    if (this.type === "electron") {
      const raw = await (this.window as any).stg.get(key);
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return raw;
      }
    } else {
      const content = this.window.localStorage.getItem(
        `@ridit/editor-storage-${key}`,
      );
      try {
        return content ? JSON.parse(content) : null;
      } catch {
        return content;
      }
    }
  }
}
