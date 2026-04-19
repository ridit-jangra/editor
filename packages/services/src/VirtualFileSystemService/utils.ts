export function join(...paths: string[]): string {
  const parts: string[] = [];

  for (let path of paths) {
    if (!path) continue;

    const split = path.split("/");

    for (const part of split) {
      if (!part || part === ".") continue;

      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
  }

  return "/" + parts.join("/");
}
