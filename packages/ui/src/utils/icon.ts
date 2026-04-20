function applySvg(svg: string, size = 16, className?: string): SVGElement {
  const wrap = document.createElement("span");
  wrap.innerHTML = svg;
  const el = wrap.firstElementChild as SVGElement;
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("fill", "none");
  if (className) el.classList.add(...className.split(" ").filter(Boolean));
  return el;
}

export async function lucideAsync(
  name: string,
  size = 16,
  className?: string,
): Promise<SVGElement> {
  const key = name.toLowerCase();

  const mod = await import(`lucide-static/icons/${key}.svg?raw`);
  return applySvg(mod.default, size, className);
}

export function lucide(
  name: string,
  size = 16,
  className?: string,
): HTMLElement {
  const holder = document.createElement("span");
  if (className) holder.className = className;

  lucideAsync(name, size).then((svg) => holder.replaceWith(svg));
  return holder;
}
