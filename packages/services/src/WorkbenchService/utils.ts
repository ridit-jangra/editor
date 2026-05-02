import { iconData } from "./basic-icons/icons";

export function loadSvg(name: string): string {
  return iconData[name] ?? iconData["file.type.default"] ?? "";
}

export function getIconName(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  const nameMap: Record<string, string> = {
    ".gitignore": "file.type.gitignore",
    ".gitattributes": "file.type.gitattributes",
    "readme.md": "file.type.readme",
    license: "file.type.license",
  };

  return nameMap[filename.toLowerCase()] ?? `file.type.${ext}`;
}
