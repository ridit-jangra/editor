import { Workbench } from "@ridit/editor-services/workbench";

const workbench = await Workbench.createWeb({
  rootPath: "/src",
  // lsp: { disableInBuiltTypescriptWorker: true },
  config: { fontSize: 18, fontFamily: "monospace" },
  editorConfig: {
    fontSize: 20,
  },
  virtualFsName: "hello",
  theme: "Light",
});

const fileSystem = workbench.fileSystem;

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

await workbench.workbenchService.mount(document, window);
