import {
  EditorService,
  EventEmitter,
  FileSystemService,
  WorkbenchService,
  ExplorerService,
  StorageService,
} from "@ridit/editor-services/browser";

async function init() {
  const eventEmitter = new EventEmitter();

  const storageService = new StorageService(window, "web", "editor-web-store");
  await storageService.start();

  const fileSystem = new FileSystemService(eventEmitter, window, {
    mode: "virtual",
    name: "WebVirtualFS",
  });

  await fileSystem.writeFile(
    "/src/main.ts",
    `
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

  const explorerService = new ExplorerService(eventEmitter, {
    services: {
      fileSystem,
    },
    rootPath: "/src",
  });

  const editorService = new EditorService(eventEmitter, {
    services: {
      fileSystem,
      explorerService,
      storageService,
    },
    editorConfig: {
      fontSize: 16,
      minimap: { enabled: true },
    },
    theme: "Dark",
  });

  const workbenchService = new WorkbenchService(eventEmitter, {
    services: {
      editorService,
      explorerService,
      storageService,
    },
    config: {
      fontSize: 14,
      fontFamily: "'Monaco', 'Consolas', monospace",
    },
  });

  await workbenchService.mount(document, window);

  await editorService.open("/src/main.ts");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

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
