export function join(...paths: string[]): string {
  const parts: string[] = [];

  for (let path of paths) {
    if (!path) continue;

    path = path.replace(/\\/g, "/");

    for (const part of path.split("/")) {
      if (!part || part === ".") continue;

      if (part === "..") parts.pop();
      else parts.push(part);
    }
  }

  return "/" + parts.join("/");
}

export function basename(path: string): string {
  path = path.replace(/\\/g, "/");
  const parts = path.split("/").filter(Boolean);
  return parts.pop() || "";
}

export function normalize(path: string): string {
  return path;
}
