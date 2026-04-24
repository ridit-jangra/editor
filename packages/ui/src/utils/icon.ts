export function icon(name: string, className?: string) {
  const el = document.createElement("span");
  el.className = `codicon codicon-${name} ${className || ""}`;
  return el;
}
