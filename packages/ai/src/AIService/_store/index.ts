import { createStore, type Store } from "@ridit/ai/utils";
import type { StorageService } from "../../../../services/src/StorageService";

export function buildStore(storageService: StorageService): Store {
  return createStore({
    session: {
      list: async () => {
        return await storageService.get("ai-sessions", "ai");
      },
      async load(id) {
        const sessions = await this.list();
        return sessions.find((s: any) => s.id === id) ?? null;
      },
      async save(session) {
        const sessions = await this.list();
        await storageService.set("ai-sessions", [...sessions, session], "ai");
      },
    },

    memory: {
      list: async (): Promise<string[]> => {
        const memories: Record<string, string> | null =
          await storageService.get("ai-memory", "ai");
        return memories ? Object.keys(memories) : [];
      },
      async read(name: string): Promise<string | null> {
        const memories: Record<string, string> | null =
          await storageService.get("ai-memory", "ai");
        return memories?.[name] ?? null;
      },
      async write(name: string, content: string): Promise<void> {
        const memories: Record<string, string> =
          (await storageService.get("ai-memory", "ai")) ?? {};
        memories[name] = content;
        await storageService.set("ai-memory", memories, "ai");
      },
    },
  });
}
