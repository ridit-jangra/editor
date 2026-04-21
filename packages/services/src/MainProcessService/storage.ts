import { app } from "electron";
import fs from "fs";
import path from "path";

export class StorageService {
  private stores: Record<string, Record<string, any>> = {};
  private storePaths: Record<string, string> = {};

  private readonly baseDir = path.join(app.getPath("userData"), "stores");

  constructor() {
    this.ensureBaseDir();
  }

  private ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getSafeFileName(storeName: string) {
    return storeName
      .replace(/[:]/g, "")
      .replace(/[<>:"/\\|?*]+/g, "_")
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  private getStorePath(storeName: string) {
    const safe = this.getSafeFileName(storeName);
    return path.join(this.baseDir, `${safe}-store.json`);
  }

  private ensureStoreLoaded(storeName: string) {
    if (this.stores[storeName]) return;

    const filePath = this.getStorePath(storeName);
    this.storePaths[storeName] = filePath;

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "{}");
      this.stores[storeName] = {};
      return;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      this.stores[storeName] = JSON.parse(raw || "{}") ?? {};
    } catch {
      this.stores[storeName] = {};
    }
  }

  private save(storeName: string) {
    const filePath = this.storePaths[storeName]!;
    const tmp = filePath + ".tmp";

    fs.writeFileSync(tmp, JSON.stringify(this.stores[storeName], null, 2));
    fs.renameSync(tmp, filePath);
  }

  createIfNotExists(storeName: string) {
    this.ensureStoreLoaded(storeName);
    this.save(storeName);
  }

  get<T>(key: string, storeName: string): T | null {
    this.ensureStoreLoaded(storeName);
    return (this.stores[storeName]![key] ?? null) as T;
  }

  set(key: string, value: any, storeName: string) {
    this.ensureStoreLoaded(storeName);
    this.stores[storeName]![key] = value;
    this.save(storeName);
  }

  update<T>(key: string, storeName: string, fn: (prev: T) => T, fallback?: T) {
    this.ensureStoreLoaded(storeName);

    const prev = (this.stores[storeName]![key] ?? fallback) as T;
    this.stores[storeName]![key] = fn(prev);

    this.save(storeName);
  }

  remove(key: string, storeName: string) {
    this.ensureStoreLoaded(storeName);
    delete this.stores[storeName]![key];
    this.save(storeName);
  }
}
