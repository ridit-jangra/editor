import { IFolderStructure, Node } from "./types";
import { h } from "../../utils/h";
import { VirtualList } from "../VirtualList";
import { ContextMenu, ContextMenuItem } from "../ContextMenu";
import {
  FlatRow,
  flatten_tree,
  find_node_by_id,
  rename_by_path,
  remove_node_by_path,
  add_node,
} from "./utils/helpers";
import { create_add_node_input } from "./utils/addNode";
import { create_rename_input } from "./utils/renameNode";
import {
  norm,
  uris_equal,
  is_descendant_of,
  rebase_uri,
  get_parent_uri,
} from "./utils/uri";
import {
  getIconName,
  loadSvg,
} from "../../../../services/src/WorkbenchService/utils";
import { ScrollArea } from "../ScrollArea";
import { Button } from "../Button";
import { icon } from "../../utils/icon";
import type { FileSystemService } from "../../../../services/src/FileSystemService";

function deep_clone_nodes(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    id: norm(n.id),
    path: norm(n.path),
    child_nodes: n.child ? deep_clone_nodes(n.child) : [],
  }));
}

function update_node_in_structure(
  nodes: Node[],
  id: string,
  child_nodes: Node[],
): boolean {
  for (const node of nodes) {
    if (node.id === id) {
      node.child = child_nodes;
      return true;
    }
    if (node.child && node.child.length > 0) {
      if (update_node_in_structure(node.child, id, child_nodes)) return true;
    }
  }
  return false;
}

function inject_spinner_style() {
  if (document.getElementById("vt-animations")) return;
  const style = document.createElement("style");
  style.id = "vt-animations";
  style.textContent = `
    @keyframes vt-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function apply_active(el: HTMLElement, active: boolean) {
  if (active) {
    el.classList.add("active");
    el.onmouseenter = null;
    el.onmouseleave = null;
  } else {
    el.classList.remove("active");
    el.onmouseenter = null;
    el.onmouseleave = null;
  }
}

export function VirtualTree(
  opts: {
    folderStructure: IFolderStructure;
    rowHeight: number;
    class?: string;
    height?: number | string;
    indent?: number;
    initiallyOpenAll?: boolean;
    initialOpenFolders?: string[];
    onSelect?: (id: string, node: Node) => void;
    onOpenFoldersChange?: (open_folders: string[]) => void;
    renderRight?: (row: FlatRow) => HTMLElement | null;
    icon_folder_name?: string;
    scrollViewport?: HTMLElement;
  },
  fileSystemService: FileSystemService,
) {
  inject_spinner_style();

  const indent = opts.indent ?? 14;

  const open = new Set<string>();
  const selected = { id: "" };
  let editing_node_id: string | null = null;
  const loading = new Set<string>();
  const loaded = new Set<string>();

  const load_queue = new Map<string, Promise<void>>();

  opts.folderStructure = {
    ...opts.folderStructure,
    structure: deep_clone_nodes(opts.folderStructure.structure),
  };

  const init_open = (n: Node) => {
    if (opts.initiallyOpenAll) open.add(n.id);
    (n.child ?? []).forEach(init_open);
  };
  opts.folderStructure.structure.forEach(init_open);

  if (opts.initialOpenFolders) {
    for (const id of opts.initialOpenFolders) {
      open.add(norm(id));
    }
  }

  let rows: FlatRow[] = [];
  const contextMenu = ContextMenu();

  const emit_open_folders = () => {
    opts.onOpenFoldersChange?.([...open]);
  };

  const expand_to = async (id: string) => {
    const workspace = norm(opts.folderStructure.path);

    const ancestors: string[] = [];
    let current = get_parent_uri(norm(id));

    while (
      current &&
      !uris_equal(current, workspace) &&
      is_descendant_of(current, workspace)
    ) {
      ancestors.unshift(current);
      current = get_parent_uri(current);
    }

    for (const ancestor of ancestors) {
      open.add(ancestor);

      if (!loaded.has(ancestor)) {
        const result =
          find_node_by_id(opts.folderStructure.structure, ancestor) ??
          find_node_by_id(
            opts.folderStructure.structure,
            ancestor.replace(/\//g, "\\"),
          );

        if (result) {
          loading.add(ancestor);
          await load_children(result.node);
        }
      }
    }
  };

  let prev_active_el: HTMLElement | null = null;

  const set_row_active = (el: HTMLElement, active: boolean) => {
    apply_active(el, active);
  };

  const patch_row_el = (id: string) => {
    const row_el = list.layer.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(id)}"]`,
    );
    if (!row_el) return;

    const is_open = open.has(id);
    const is_loading = loading.has(id);
    const active = uris_equal(id, selected.id);

    if (active && prev_active_el && prev_active_el !== row_el) {
      set_row_active(prev_active_el, false);
    }
    set_row_active(row_el, active);
    if (active) prev_active_el = row_el;

    const caret = row_el.querySelector<HTMLElement>("[data-caret]");
    if (!caret) return;

    const prev_loading = caret.dataset.loading === "1";
    if (prev_loading !== is_loading) {
      caret.dataset.loading = is_loading ? "1" : "0";
      caret.innerHTML = "";
      caret.appendChild(icon(is_loading ? "loader-circle" : "chevron-right"));
    }

    if (is_loading) {
      caret.classList.remove("open");
      caret.classList.add("loading");
    } else {
      caret.classList.remove("loading");
      if (is_open) {
        caret.classList.add("open");
      } else {
        caret.classList.remove("open");
      }
    }
  };

  let root_node_el: HTMLElement | null = null;

  const ensure_root_node = () => {
    if (root_node_el && el.contains(root_node_el)) {
      const label = root_node_el.querySelector<HTMLElement>(
        ".vt-root-node-label",
      );
      if (label) label.textContent = opts.folderStructure.root.name;
      return;
    }

    const root_label = h(
      "span",
      { class: "vt-root-node-label" },
      opts.folderStructure.root.name,
    );

    const root_actions = h(
      "div",
      { class: "vt-root-actions" },
      Button(icon("file-add"), {
        variant: "ghost",
        onClick(e) {
          e.stopPropagation();
          selected.id = norm(opts.folderStructure.path);
          start_add_node(norm(opts.folderStructure.path), "file");
        },
        tooltip: { text: "New File" },
      }),
      Button(icon("new-folder"), {
        variant: "ghost",
        onClick(e) {
          e.stopPropagation();
          selected.id = norm(opts.folderStructure.path);
          start_add_node(norm(opts.folderStructure.path), "folder");
        },
        tooltip: { text: "New Folder" },
      }),
    );

    root_node_el = h(
      "div",
      { class: "vt-root-node" },
      root_label,
      root_actions,
    );

    el.prepend(root_node_el);
  };

  const rebuild = () => {
    ensure_root_node();

    const out: FlatRow[] = [];
    flatten_tree(opts.folderStructure.structure, 0, open, out);
    rows = out;

    list.update_rows(rows);
  };

  const load_children = (folder_node: Node): Promise<void> => {
    if (loaded.has(folder_node.id)) return Promise.resolve();

    const existing = load_queue.get(folder_node.id);
    if (existing) return existing;

    const promise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const raw = await fileSystemService.readTree(folder_node.path);

          console.log(raw, folder_node.path);

          let result_id: string;
          let child_nodes: Node[];

          if (Array.isArray(raw)) {
            result_id = folder_node.id;
            child_nodes = deep_clone_nodes(raw);
          } else if (raw && typeof raw === "object") {
            result_id = raw.id;
            child_nodes = deep_clone_nodes(raw.child_nodes ?? []);
          } else {
            console.warn("[load_children] unexpected result:", raw);
            return;
          }

          if (uris_equal(result_id, opts.folderStructure.path)) {
            opts.folderStructure.structure = child_nodes;
          } else {
            update_node_in_structure(
              opts.folderStructure.structure,
              result_id,
              child_nodes,
            );
          }

          loaded.add(folder_node.id);
        } catch (e) {
          console.error("[load_children] error:", e);
        } finally {
          loading.delete(folder_node.id);
          load_queue.delete(folder_node.id);
          patch_row_el(folder_node.id);
          rebuild();
          resolve();
        }
      }, 0);
    });

    load_queue.set(folder_node.id, promise);
    return promise;
  };

  const handle_folder_click = (row: FlatRow) => {
    const id = row.id;
    selected.id = id;

    if (loading.has(id)) return;

    const was_open = open.has(id);

    if (was_open) {
      open.delete(id);
    } else {
      open.add(id);
    }

    emit_open_folders();
    patch_row_el(id);

    if (!was_open) {
      if (!loaded.has(id)) {
        loading.add(id);
        patch_row_el(id);
        rebuild();
        load_children(row.node);
      } else {
        rebuild();
      }
    } else {
      rebuild();
    }
  };

  const scroll_to_id = (id: string) => {
    const index = rows.findIndex((r) => uris_equal(r.id, id));
    if (index === -1) return;

    const scroll_el = opts.scrollViewport ?? list.viewport;
    const item_top = index * opts.rowHeight;
    const item_bottom = item_top + opts.rowHeight;
    const view_top = scroll_el.scrollTop;
    const view_bottom = view_top + scroll_el.clientHeight;

    if (item_top < view_top) {
      scroll_el.scrollTop = item_top;
    } else if (item_bottom > view_bottom) {
      scroll_el.scrollTop = item_bottom - scroll_el.clientHeight;
    }
  };

  const start_add_node = (parent_id: string, type: "file" | "folder") => {
    open.add(parent_id);
    editing_node_id = `__adding_${type}_${parent_id}`;

    const result = find_node_by_id(opts.folderStructure.structure, parent_id);
    if (!result) return;

    const parent_depth = rows.find((r) => r.id === parent_id)?.depth ?? 0;
    const parent_index = rows.findIndex((r) => r.id === parent_id);

    if (parent_index === -1) {
      rebuild();
      return;
    }

    const temp_row: FlatRow = {
      id: editing_node_id,
      label: "",
      depth: parent_depth + 1,
      node: { id: editing_node_id, type, name: "", path: "" } as Node,
    };

    const new_rows = [...rows];
    new_rows.splice(parent_index + 1, 0, temp_row);
    rows = new_rows;
    list.update_rows(rows);
  };

  const start_rename = (node_id: string) => {
    editing_node_id = `__renaming_${node_id}`;
    setTimeout(() => rebuild(), 100);
  };

  const delete_node = async (node_id: string) => {
    const result = find_node_by_id(opts.folderStructure.structure, node_id);
    if (!result) return;

    const type = result.node.type === "folder" ? "folder" : "file";
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      await fileSystemService.rm(result.node.path);
    } catch {}
  };

  const get_context_menu_items = (row: FlatRow): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (row.node.type === "file") {
      items.push(
        {
          type: "item",
          label: "Open in editor",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
          },
        },
        { type: "separator" },
      );
    }

    if (row.node.type === "folder") {
      items.push(
        {
          type: "item",
          label: "New File",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            start_add_node(row.id, "file");
          },
        },
        {
          type: "item",
          label: "New Folder",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            start_add_node(row.id, "folder");
          },
        },
        { type: "separator" },
      );
    }

    items.push(
      {
        type: "item",
        label: "Rename",
        onClick: () => {
          selected.id = row.id;
          list.refresh();
          start_rename(row.id);
        },
        command_id: "F2",
      },
      {
        type: "item",
        label: "Delete",
        onClick: () => {
          selected.id = row.id;
          list.refresh();
          delete_node(row.id);
        },
        command_id: "Delete",
      },
    );

    return items;
  };

  const is_active = (id: string) => uris_equal(id, selected.id);

  const scroll = ScrollArea({});
  const el = scroll.el;

  const is_typing_target = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if ((el as any).isContentEditable) return true;
    return false;
  };

  const is_context_menu_open = () => {
    const cm = contextMenu.el as HTMLElement;
    return cm && cm.style.display !== "none";
  };

  const click_selected = () => {
    const id = selected.id;
    if (!id) return;
    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;
    if (row.node.type === "folder") {
      handle_folder_click(row);
      return;
    }
    opts.onSelect?.(row.id, row.node);
    list.refresh();
  };

  const rename_selected = () => {
    const id = selected.id;
    if (!id) return;
    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;
    start_rename(row.id);
  };

  const delete_selected = () => {
    const id = selected.id;
    if (!id) return;
    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;
    delete_node(row.id);
  };

  const on_local_key = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (is_typing_target(e.target)) return;
    if (is_context_menu_open()) return;
    if (e.key === "F2") {
      e.preventDefault();
      rename_selected();
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      delete_selected();
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      click_selected();
      return;
    }
  };

  el.tabIndex = 0;
  el.addEventListener("keydown", on_local_key, true);
  el.addEventListener("mousedown", () => {}, true);

  const list = VirtualList<FlatRow>({
    items: rows,
    itemHeight: opts.rowHeight,
    height: opts.height,
    overscan: 8,
    cache: false,
    scrollViewport: scroll.viewport,
    key: (r) =>
      editing_node_id === `__renaming_${r.id}` ? `renaming:${r.id}` : r.id,
    render: async (row) => {
      if (
        editing_node_id &&
        editing_node_id.startsWith("__adding_") &&
        row.id === editing_node_id
      ) {
        const type = editing_node_id.includes("_file_") ? "file" : "folder";
        const parent_id = editing_node_id.replace(`__adding_${type}_`, "");
        const result = find_node_by_id(
          opts.folderStructure.structure,
          parent_id,
        );

        if (result) {
          return create_add_node_input({
            type,
            parentId: parent_id,
            parentPath: result.node.path,
            name: row.node.name,
            nodes: opts.folderStructure.structure,
            indent,
            depth: row.depth,
            onComplete: async (new_node) => {
              editing_node_id = null;
              if (type === "file") {
                selected.id = new_node.id;
                opts.onSelect?.(new_node.id, new_node);
                try {
                  await fileSystemService.writeFile(new_node.path, "");
                } catch {}
              } else {
                try {
                  await fileSystemService.mkdir(new_node.path);
                } catch {}
              }
            },
            onCancel: () => {
              editing_node_id = null;
            },
          });
        }
      }

      if (editing_node_id === `__renaming_${row.id}`) {
        return create_rename_input({
          nodeId: row.id,
          nodes: opts.folderStructure.structure,
          indent,
          depth: row.depth,
          currentName: row.label,
          isFolder: row.node.type === "folder",
          icon_folder_name: opts.icon_folder_name,
          onComplete: async (old_uri: string, new_uri: string) => {
            editing_node_id = null;
            rebuild();
            try {
              await fileSystemService.rename(old_uri, new_uri);
            } catch (e) {
              console.error("[rename] failed:", e);
            }
          },
          onCancel: () => {
            editing_node_id = null;
            rebuild();
          },
        });
      }

      const is_loading = loading.has(row.id);
      const is_open = open.has(row.id);
      const active = is_active(row.id);

      const caret =
        row.node.type === "folder" &&
        (() => {
          const classes = ["vt-caret"];
          if (is_open) classes.push("open");
          if (is_loading) classes.push("loading");

          const span = h("span", {
            "data-caret": "1",
            "data-loading": is_loading ? "1" : "0",
            class: classes.join(" "),
          });

          const iconEl = icon(is_loading ? "loader-circle" : "chevron-right");
          iconEl.style.width = "16px";
          iconEl.style.height = "16px";
          span.appendChild(iconEl);
          return span;
        })();

      const file_icon =
        row.node.type !== "folder" && h("span", { class: "vt-file-icon" });

      if (file_icon) {
        const iconName = getIconName(row.node.name);
        const svgText = loadSvg(iconName) ?? loadSvg("file.type.default");
        (file_icon as HTMLSpanElement).innerHTML = svgText;
      }

      const left = h(
        "div",
        { class: "vt-row-left" },
        caret,
        file_icon,
        h("span", { class: "vt-row-label" }, row.label),
      );

      const right = opts.renderRight ? opts.renderRight(row) : null;

      const row_el = h(
        "div",
        {
          "data-row-id": row.id,
          class: active ? "vt-row active" : "vt-row",
          style: `padding-left:${row.depth * 1.4}rem;`,
          on: {
            click: (e: MouseEvent) => {
              if (e.button !== 0) return;
              if (row.node.type === "folder") {
                handle_folder_click(row);
              } else {
                if (prev_active_el && prev_active_el !== row_el) {
                  set_row_active(prev_active_el, false);
                }
                selected.id = row.id;
                set_row_active(row_el, true);
                prev_active_el = row_el;
                opts.onSelect?.(row.id, row.node);
              }
            },
          },
          tooltip: { text: norm(row.node.path), delay: 200 },
        },
        left,
        right ?? "",
      );

      if (active) prev_active_el = row_el;

      row_el.oncontextmenu = async () => {
        selected.id = norm(row.id);
        rebuild();
        requestAnimationFrame(() => scroll_to_id(norm(row.id)));
      };

      contextMenu.bind(row_el, () => get_context_menu_items(row));

      return row_el;
    },
  });

  let rebuild_raf = 0;
  const rebuild_debounced = () => {
    if (rebuild_raf) cancelAnimationFrame(rebuild_raf);
    rebuild_raf = requestAnimationFrame(() => {
      rebuild_raf = 0;
      rebuild();
    });
  };

  const fix_set = (set: Set<string>, path: string, next_path?: string) => {
    for (const id of [...set]) {
      if (uris_equal(id, path) || is_descendant_of(id, path)) {
        set.delete(id);
        if (next_path) set.add(rebase_uri(id, path, next_path));
      }
    }
  };

  const restore_open_folders = async () => {
    if (!opts.initialOpenFolders?.length) return;
    for (const id of opts.initialOpenFolders) {
      const normed = norm(id);
      if (loaded.has(normed)) continue;
      const result = find_node_by_id(opts.folderStructure.structure, normed);
      if (result) {
        loading.add(normed);
        await load_children(result.node);
      }
    }
  };

  el.appendChild(list.el);
  rebuild();
  void restore_open_folders();

  return {
    el,
    setFolderStructure(next: IFolderStructure) {
      opts.folderStructure = {
        ...next,
        structure: deep_clone_nodes(next.structure),
      };
      loaded.clear();
      load_queue.clear();
      open.clear();
      root_node_el = null;
      prev_active_el = null;
      rebuild();
    },
    open(id: string) {
      open.add(id);
      rebuild();
    },
    close(id: string) {
      open.delete(id);
      rebuild();
    },
    toggle(id: string) {
      const row = rows.find((r) => r.id === id);
      if (row) handle_folder_click(row);
    },
    select: async (id: string) => {
      selected.id = norm(id);
      await expand_to(id);
      rebuild();
      requestAnimationFrame(() => scroll_to_id(norm(id)));
    },
    highlight: async (id: string) => {
      selected.id = norm(id);
      await expand_to(id);
      rebuild();
      requestAnimationFrame(() => scroll_to_id(norm(id)));
    },
    clear_highlight() {
      if (prev_active_el) {
        set_row_active(prev_active_el, false);
        prev_active_el = null;
      }
      selected.id = "";
    },
    mutate(fn: (nodes: Node[]) => void) {
      fn(opts.folderStructure.structure);
      rebuild();
    },
    add(node: Node) {
      add_node(opts.folderStructure.structure, node, opts.folderStructure.path);
      rebuild_debounced();
    },
    remove(path: string) {
      remove_node_by_path(opts.folderStructure.structure, path);
      fix_set(open, path);
      fix_set(loaded, path);
      load_queue.forEach((_, key) => {
        if (uris_equal(key, path) || is_descendant_of(key, path))
          load_queue.delete(key);
      });
      if (uris_equal(selected.id, path) || is_descendant_of(selected.id, path))
        selected.id = "";
      rebuild_debounced();
    },
    rename(prev_path: string, next_path: string) {
      rename_by_path(opts.folderStructure.structure, prev_path, next_path);
      fix_set(open, prev_path, next_path);
      fix_set(loaded, prev_path, next_path);
      if (
        uris_equal(selected.id, prev_path) ||
        is_descendant_of(selected.id, prev_path)
      ) {
        selected.id = rebase_uri(selected.id, prev_path, next_path);
      }
      rebuild_debounced();
    },
    destroy() {
      list.destroy();
      contextMenu.destroy();
      el.removeEventListener("keydown", on_local_key, true);
    },
  };
}
