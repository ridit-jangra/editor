import {
  EditorService,
  EventEmitter,
  FileSystemService,
  WorkbenchService,
  ExplorerService,
  StorageService,
  type ITheme,
} from "@ridit/editor-services/browser";

async function init() {
  const eventEmitter = new EventEmitter();

  // Storage service (browser localStorage)
  const storageService = new StorageService();
  await storageService.start(window, "web", "editor-web-store");

  // Virtual file system
  const fileSystem = new FileSystemService(eventEmitter, window, {
    mode: "virtual",
    name: "WebVirtualFS",
  });

  // Create some example files
  await fileSystem.writeFile(
    "/src/main.ts",
    `// TypeScript example
function greet(name: string): string {
  return \`Hello, \${name}!\`
}

console.log(greet('World'))`,
  );

  await fileSystem.writeFile(
    "/src/style.css",
    `/* CSS example */
.container {
  display: flex;
  padding: 1rem;
  background: #1a1f29;
}`,
  );

  await fileSystem.writeFile(
    "/src/index.html",
    `<!-- HTML example -->
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
  );

  // Explorer service
  const explorerService = new ExplorerService(eventEmitter, {
    services: {
      fileSystem,
    },
    rootPath: "/src",
  });

  // Editor service (no LSP in browser for now)
  const editorService = new EditorService(eventEmitter, {
    services: {
      fileSystem,
      explorerService,
      storageService,
      // LspService omitted for web
    },
    editorConfig: {
      fontSize: 16,
      minimap: { enabled: true },
    },
    theme: "Dark",
  });

  // Workbench service
  const workbenchService = new WorkbenchService(eventEmitter, {
    services: {
      editorService,
      explorerService,
      storageService,
    },
    config: {
      fontSize: {
        size: 14,
        applyGlobally: true,
      },
      fontFamily: "'Monaco', 'Consolas', monospace",
    },
  });

  // Mount everything
  await workbenchService.mount(document, window);

  // Open first file
  await editorService.open("/src/main.ts");
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Error handling
window.addEventListener("error", (e) => {
  console.error("Editor error:", e.error);
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `
      <div style="padding: 2rem; max-width: 600px; margin: auto;">
        <h2>Error loading editor</h2>
        <pre style="background: #1a1f29; padding: 1rem; border-radius: 6px; overflow: auto;">
${e.error?.stack || e.error?.message || "Unknown error"}
        </pre>
        <p>Check console for details.</p>
      </div>
    `;
  }
});
