import { Service } from "../service";

const defaultStoreName = "@ridit/editor-default-store";

function modifyKey(key: string, storeName: string, type: "web" | "electron") {
  if (type === "web") {
    return `${storeName}/@ridit/editor-store-${key}`;
  }

  return `@ridit/editor-store-${key}`;
}

export class StorageService extends Service {
  private window: Window | null = null;
  private type: "electron" | "web" | null = null;
  private storeName: string = defaultStoreName;

  constructor() {
    super("StorageService");
  }

  override async start(
    window: Window,
    type: "electron" | "web",
    storeName: string = defaultStoreName,
  ) {
    this.window = window;
    this.type = type;
    this.storeName = storeName;

    await this.createStoreIfNotExist();
  }

  async createStoreIfNotExist() {
    if (!this.window || !this.type) return;

    if (this.type === "electron") {
      await (this.window as any).stg.createStoreIfNotExist(this.storeName);
    }
  }

  async set(key: string, value: any, storeName?: string) {
    if (!this.window || !this.type) return;

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);

    const name = storeName ?? this.storeName;
    const finalKey = modifyKey(key, name, this.type);

    if (this.type === "electron") {
      await (this.window as any).stg.set(
        finalKey,
        serialized,
        storeName ?? this.storeName,
      );
    } else {
      this.window.localStorage.setItem(finalKey, serialized);
    }
  }

  async get(key: string, storeName?: string): Promise<any | null> {
    if (!this.window || !this.type) return null;

    const name = storeName ?? this.storeName;
    const finalKey = modifyKey(key, name, this.type);

    if (this.type === "electron") {
      const raw = await (this.window as any).stg.get(
        finalKey,
        storeName ?? this.storeName,
      );
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return raw;
      }
    } else {
      const content = this.window.localStorage.getItem(finalKey);
      try {
        return content ? JSON.parse(content) : null;
      } catch {
        return content;
      }
    }
  }
}
