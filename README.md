# @ridit/editor

A modular, embeddable code editor built on Monaco. Drop a full VS Code-like workbench into any Electron or web app with a single function call, or compose individual services for complete control.

## Packages

| Package                  | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `@ridit/editor-services` | Core services — filesystem, editor, tabs, explorer, theme, LSP, workbench        |
| `@ridit/editor-ui`       | Headless UI primitives — VirtualTree, VirtualList, ScrollArea, ContextMenu, etc. |

## Quick Start

### Electron

```typescript
import { Workbench } from "@ridit/editor-services/workbench";

window.addEventListener("DOMContentLoaded", async () => {
  const workbench = await Workbench.createElectron({
    rootPath: "/path/to/project",
    lsp: { disableInBuiltTypescriptWorker: true },
    config: { fontSize: 16, fontFamily: "monospace" },
    editorConfig: { fontSize: 15 },
  });

  await workbench.mount(document, window);
});
```

### Web (Virtual Filesystem)

```typescript
import { Workbench } from "@ridit/editor-services/workbench";

const workbench = await Workbench.createWeb({
  rootPath: "/my-project",
  virtualFsName: "my-project-fs",
  config: { fontSize: 16 },
});

await workbench.mount(document, window);
```

## Architecture

```
@ridit/editor
├── packages/
│   ├── services/     # @ridit/editor-services
│   │   ├── WorkbenchService    # orchestrates everything
│   │   ├── EditorService       # Monaco editor management
│   │   ├── FileSystemService   # real or virtual filesystem
│   │   ├── ExplorerService     # file tree
│   │   ├── TabService          # tab state + persistence
│   │   ├── ThemeService        # CSS variable theming
│   │   ├── LspService          # language server protocol
│   │   └── StorageService      # persistent key-value storage
│   └── ui/           # @ridit/editor-ui
│       ├── VirtualTree         # virtualized file explorer tree
│       ├── VirtualList         # virtualized list primitive
│       ├── ScrollArea          # custom scrollbar
│       ├── ContextMenu         # right-click menus
│       └── Splitter            # resizable panels
└── examples/
    ├── electron/     # Electron integration example
    └── web/          # Browser integration example
```

## Requirements

- Node.js 18+
- Bun (for monorepo tooling)

## Development

```bash
# install dependencies
bun install

# run electron example
cd examples/electron
bun run dev

# run web example
cd examples/web
bun run dev
```

## License

MIT
