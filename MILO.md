# @ridit/editor - IDE Framework

## Project Overview
A modular framework for building custom code editors. Extracts 1.5 years of Meridia IDE development into reusable services. Goal: "Create your editor in minutes, not years." Architecture is service-based with vanilla TypeScript components.

## Tech Stack
- **Languages**: TypeScript only (no JavaScript)
- **Runtime**: Bun (primary), Electron for desktop apps
- **UI**: Vanilla TypeScript components (no React/Svelte/Vue)
- **Editor**: Monaco Editor with LSP integration
- **Terminal**: xterm.js + node-pty
- **IPC**: Custom event emitter system

## Package Manager
**Bun** exclusively. All packages use bun.lock.
- Install: `bun install`
- Run scripts: `bun run <script>`
- Workspace commands: `bun --filter @ridit/editor-* <command>`

## Platform
Runs on **win32** (Windows) but designed cross-platform. Electron example targets Linux/macOS/Windows. Services abstract platform-specific filesystem/terminal operations.

## Build & Dev Commands
```bash
# Install all workspace packages
bun install

# Build all packages
bun run build  # if scripts defined

# Run Electron example
cd examples/electron
bun run dev

# Type checking across workspace
bun --filter @ridit/editor-* tsc --noEmit
```

## Project Structure
```
editor/
├── packages/
│   ├── ui/              # Vanilla TS components (VirtualTree, Button, Tooltip, etc.)
│   ├── services/        # Core services (Editor, LSP, Terminal, FileSystem, etc.)
│   │   └── src/         # Service implementations with dependency injection
│   ├── ai/             # AI integration using @ridit/dev
│   └── cli/            # CLI generator (planned)
├── examples/
│   └── electron/       # Demo editor app
└── tsconfig.json      # Root TypeScript config
```

## Code Style
**Imports**: ES modules with `type` imports explicit. Uses `verbatimModuleSyntax: true`.
```ts
import { type EventEmitter } from "../emitter";
import { Service } from "../service";
```

**Formatting**: No prettier/eslint config found. Consistent 2-space indentation.

**TypeScript Config**: Strict mode enabled with `noUncheckedIndexedAccess`, `noImplicitOverride`. Target: ESNext, moduleResolution: bundler.

**Naming**: PascalCase for classes/interfaces, camelCase for variables/functions. Service classes extend base `Service` class.

**Error Handling**: Console warnings for non-critical issues, thrown errors for contract violations.

## Architecture Notes
- **Service Pattern**: All core functionality as services (EditorService, LspService, TerminalService, etc.)
- **Dependency Injection**: Services declare required dependencies via types
- **Event-Driven**: Custom `EventEmitter` for cross-service communication
- **UI Agnostic**: Components are frameworkless vanilla TS, mount to DOM
- **Monaco Integration**: EditorService wraps Monaco with LSP support via @ridit/relay
- **Virtual Filesystem**: Abstract VFS layer with real FS implementation
- **Cross-Platform**: Services export browser/node/electron variants

**Key Services**:
- `EditorService`: Monaco editor with plugin system
- `LspService`: Language Server Protocol via Relay bridge  
- `TerminalService`: xterm + node-pty integration
- `FileSystemService`: Cross-platform file operations
- `WorkbenchService`: Complete UI framework (tabs, panels, layout)
- `ThemeService`: Glass UI theming system

**Design Decisions**:
- No framework lock-in (vanilla TS components)
- Service isolation for modularity
- Event-based IPC instead of direct calls
- Monaco as default editor, extensible for custom editors
- MIT license for maximum adoption