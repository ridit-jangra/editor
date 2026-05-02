import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = "src/WorkbenchService/basic-icons/icons";
const files = readdirSync(dir);

const entries = files
  .filter((f) => f.endsWith(".svg"))
  .map((f) => {
    const name = f.replace(".svg", "");
    const content = readFileSync(join(dir, f), "utf-8").replace(/`/g, "\\`");
    return `  "${name}": \`${content}\``;
  });

writeFileSync(
  "src/IconService/icon-data.ts",
  `export const iconData: Record<string, string> = {\n${entries.join(",\n")}\n}\n`,
);
