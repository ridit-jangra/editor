export function icon(name: string, className?: string) {
  const el = document.createElement("i");
  el.className = `codicon codicon-${name} ${className || ""}`;
  return el;
}
