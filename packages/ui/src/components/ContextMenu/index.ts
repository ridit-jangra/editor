import { h } from "../../utils/h";
import { icon } from "../../utils/icon";

export type ContextMenuItem =
  | {
      type: "item";
      label: string;
      command_id?: string;
      disabled?: boolean;
      onClick?: () => void;
    }
  | { type: "separator" }
  | {
      type: "submenu";
      label: string;
      items: ContextMenuItem[];
      disabled?: boolean;
    };

export function serializeItems(items: ContextMenuItem[]): any[] {
  return items.map((item) => {
    if (item.type === "separator") return { type: "separator" };
    if (item.type === "submenu") {
      return {
        type: "submenu",
        label: item.label,
        disabled: item.disabled ?? false,
        items: serializeItems(item.items),
      };
    }
    return {
      type: "item",
      label: item.label,
      command_id: item.command_id,
      disabled: item.disabled ?? false,
    };
  });
}

export function ContextMenu(opts?: {
  rootClass?: string;
  contentClass?: string;
  panelClass?: string;
}) {
  const floating: HTMLDivElement[] = [];
  let closeTimer: number | null = null;

  const cancelClose = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const closeFloating = () => {
    cancelClose();
    floating.forEach((p) => p.remove());
    floating.length = 0;
  };

  const closeAll = () => {
    closeFloating();
    root.style.display = "none";
  };

  const root = h("div", {
    class: ["context-menu-root", opts?.rootClass].filter(Boolean).join(" "),
  }) as HTMLDivElement;

  const content = h("div", {
    class: ["context-menu-content", opts?.contentClass]
      .filter(Boolean)
      .join(" "),
  });

  root.appendChild(content);
  document.body.appendChild(root);

  const placeAt = (x: number, y: number, el: HTMLDivElement) => {
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.display = "block";

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(6, Math.min(x, vw - r.width - 6));
    const top = Math.max(6, Math.min(y, vh - r.height - 6));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const buildPanel = (items: ContextMenuItem[], floatingPanel = false) => {
    const panel = h("div", {
      class: ["context-menu-panel", opts?.panelClass].filter(Boolean).join(" "),
    }) as HTMLDivElement;

    if (floatingPanel) {
      panel.addEventListener("mouseenter", cancelClose);
    }

    const openSub = (row: HTMLElement, subItems: ContextMenuItem[]) => {
      closeFloating();

      const sub = buildPanel(subItems, true);
      sub.style.display = "block";

      const rr = row.getBoundingClientRect();
      sub.style.left = `${rr.right + 6}px`;
      sub.style.top = `${rr.top}px`;

      document.body.appendChild(sub);
      floating.push(sub);
    };

    panel.innerHTML = "";

    items.forEach((it) => {
      if (it.type === "separator") {
        panel.appendChild(h("div", { class: "context-menu-separator" }));
        return;
      }

      if (it.type === "submenu") {
        const row = h(
          "div",
          {
            class: [
              "context-menu-row",
              it.disabled ? "context-menu-row--disabled" : "",
            ]
              .filter(Boolean)
              .join(" "),
            on: {
              mouseenter: () => {
                cancelClose();
                if (!it.disabled) openSub(row, it.items);
              },
              mousedown: (e: Event) => {
                e.preventDefault();
              },
            },
          },
          h("span", { class: "context-menu-row__label" }, it.label),
          h(
            "span",
            { class: "context-menu-row__chevron" },
            icon("chevron-right"),
          ),
        );
        panel.appendChild(row);
        return;
      }

      const row = h(
        "div",
        {
          class: [
            "context-menu-row",
            it.disabled ? "context-menu-row--disabled" : "",
          ]
            .filter(Boolean)
            .join(" "),
          on: {
            mouseenter: cancelClose,
            mousedown: (e: Event) => {
              e.preventDefault();
              if (it.disabled) return;
              it.onClick?.();
              closeAll();
            },
          },
        },
        h("span", { class: "context-menu-row__label" }, it.label),
        h(
          "div",
          { class: "context-menu-row__meta" },
          it.command_id ? it.command_id : "",
        ),
      );

      panel.appendChild(row);
    });

    return panel;
  };

  let currentItems: ContextMenuItem[] = [];

  const render = () => {
    content.innerHTML = "";
    const main = buildPanel(currentItems, false);
    main.classList.add("context-menu-panel--inline");
    content.appendChild(main);
  };

  const onDocDown = (e: MouseEvent) => {
    const t = e.target as Node;
    const insideMain = root.contains(t);
    const insideFloating = floating.some((p) => p.contains(t));
    if (!insideMain && !insideFloating) closeAll();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAll();
  };

  document.addEventListener("mousedown", onDocDown, true);
  window.addEventListener("keydown", onKey);

  const openAt = (x: number, y: number, items: ContextMenuItem[]) => {
    currentItems = items;
    closeFloating();
    render();
    placeAt(x, y, root);
  };

  const bind = (target: HTMLElement, getItems: () => ContextMenuItem[]) => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      const items = getItems();
      if (!items || items.length === 0) return;
      openAt(e.clientX, e.clientY, items);
    };

    target.addEventListener("contextmenu", onCtx);
    return () => target.removeEventListener("contextmenu", onCtx);
  };

  return {
    el: root,
    openAt,
    close: closeAll,
    bind,
    destroy() {
      closeAll();
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
