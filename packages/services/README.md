# @ridit/editor-services

Core services for `@ridit/editor`. Provides everything needed to build a Monaco-based editor — filesystem abstraction, tab management, theming, LSP integration, and a full workbench orchestrator.

## Installation

```bash
npm install @ridit/editor-services
```

## Preset API (recommended)

The fastest way to get started. `Workbench` presets wire all services together with sensible defaults.

```typescript
import { Workbench } from "@ridit/editor-services/workbench";

// Electron
const workbench = await Workbench.createElectron({
  rootPath: "/path/to/project",
  lsp: { disableInBuiltTypescriptWorker: true },
  config: { fontSize: 16, fontFamily: "monospace" },
  editorConfig: { fontSize: 15 },
  theme: "Dark", // 'Dark' | 'Light'
  storeName: "my-app", // optional, for tab persistence
});
await workbench.mount(document, window);

// Web (virtual filesystem)
const workbench = await Workbench.createWeb({
  rootPath: "/my-project",
  virtualFsName: "my-project-fs",
  config: { fontSize: 16 },
  theme: "Light",
});
await workbench.mount(document, window);
```

## Manual Composition

For full control, compose services individually.

```typescript
import {
  EventEmitter,
  FileSystemService,
  ExplorerService,
  EditorService,
  WorkbenchService,
  StorageService,
  ThemeService,
  LspService,
} from "@ridit/editor-services/browser";

const eventEmitter = new EventEmitter();

const storageService = new StorageService(window, "electron", "my-store");
await storageService.start();

const fileSystem = new FileSystemService(eventEmitter, window, {
  mode: "real",
});

const explorerService = new ExplorerService(eventEmitter, {
  services: { fileSystem },
  rootPath: "/path/to/project",
});

const themeService = new ThemeService(eventEmitter);

const editorService = new EditorService(eventEmitter, {
  services: { fileSystem, explorerService, themeService, storageService },
  theme: "Dark",
  editorConfig: { fontSize: 15 },
});

const workbench = new WorkbenchService(eventEmitter, {
  services: { editorService, explorerService, storageService, themeService },
  config: { fontSize: 16, fontFamily: "monospace" },
});

await workbench.mount(document, window);
```

## Services

### `FileSystemService`

Unified filesystem API that works over both the real filesystem (Electron IPC) and an in-memory virtual filesystem.

```typescript
const fs = new FileSystemService(eventEmitter, window, {
  mode: "real", // 'real' | 'virtual'
  name: "my-vfs", // required when mode is 'virtual'
});

await fs.readFile("/src/index.ts");
await fs.writeFile("/src/index.ts", "content");
await fs.mkdir("/src/utils");
await fs.rm("/src/old.ts");
await fs.rename("/src/old.ts", "/src/new.ts");
await fs.exists("/src/index.ts");
await fs.readdir("/src");
```

### `EditorService`

Manages Monaco editor instances and file opening.

```typescript
// Open a file programmatically
await editorService.open("/src/index.ts");

// Register a custom editor
editorService.register(myCustomEditor);
```

### `ExplorerService`

Renders the file tree and responds to file selection events.

```typescript
const tree = await explorerService.render(document);
document.body.appendChild(tree.el);
```

### `ThemeService`

Applies a theme as CSS variables on the document.

```typescript
import { DarkTheme } from "@ridit/editor-services/browser";

themeService.setTheme(DarkTheme, document);
```

### `StorageService`

Persistent key-value storage backed by the platform (Electron store or localStorage).

```typescript
await storageService.set("my-key", { foo: "bar" }, "my-store");
const value = await storageService.get("my-key", "my-store");
```

### `WorkbenchService`

Orchestrates the full editor UI — titlebar, activity bar, sidebar, editor area, tabs, and statusbar.

```typescript
// Override a built-in component before mounting
workbench.overrideComponent("titlebar", (classes) => myTitlebar(classes));

await workbench.mount(document, window);
```

## Events

Services communicate via `EventEmitter`. You can subscribe to any event:

```typescript
eventEmitter.on('editor:openFile', (path: string) => { ... })
eventEmitter.on('tab:openTab', (path: string) => { ... })
eventEmitter.on('tab:removeTab', (id: string) => { ... })
```

## Theming

Themes are plain objects mapped to CSS variables on `:root`. Pass a custom theme to `WorkbenchService` or `ThemeService`:

```typescript
import type { ITheme } from "@ridit/editor-services/browser";

const myTheme: ITheme = {
  colors: {
    bg: "#1a1a2e",
    fg: "#e0e0e0",
    // ...
  },
  tokens: {
    keyword: "c792ea",
    // ...
  },
};

const workbench = new WorkbenchService(eventEmitter, {
  customTheme: myTheme,
  // ...
});
```

## License

MIT
