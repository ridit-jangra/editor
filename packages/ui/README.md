# @ridit/editor-ui

Headless UI primitives for `@ridit/editor`. Framework-agnostic, DOM-based components built for performance — virtualized lists, file trees, resizable panels, context menus, and more.

## Installation

```bash
npm install @ridit/editor-ui
```

## Components

### `VirtualTree`

A virtualized file explorer tree with lazy-loading, drag-and-drop, rename, and context menu support.

```typescript
import { VirtualTree } from "@ridit/editor-ui";

const tree = VirtualTree(
  {
    folderStructure: {
      root: { name: "my-project" },
      path: "/my-project",
      structure: [],
    },
    rowHeight: 28,
    onSelect: (id, node) => {
      console.log("selected:", node.path);
    },
    onOpenFoldersChange: (openFolders) => {
      // persist open state
    },
    initialOpenFolders: ["/my-project/src"],
    renderRight: (row) => {
      // optional: render something to the right of each row
      return null;
    },
  },
  fileSystemService,
);

document.body.appendChild(tree.el);
```

**API**

```typescript
tree.select('/my-project/src/index.ts')   // select and scroll to a node
tree.highlight('/my-project/src/index.ts') // highlight without firing onSelect
tree.clear_highlight()                     // clear selection
tree.open('/my-project/src')              // expand a folder
tree.close('/my-project/src')             // collapse a folder
tree.toggle('/my-project/src')            // toggle a folder
tree.add(node)                            // add a node
tree.remove('/my-project/src/old.ts')     // remove a node
tree.rename('/old/path', '/new/path')     // rename a node
tree.mutate((nodes) => { ... })           // mutate the tree directly
tree.destroy()                            // clean up
```

### `VirtualList`

High-performance virtualized list for rendering large datasets.

```typescript
import { VirtualList } from "@ridit/editor-ui";

const list = VirtualList<MyItem>({
  items: myItems,
  itemHeight: 32,
  overscan: 5,
  render: async (item) => {
    const el = document.createElement("div");
    el.textContent = item.name;
    return el;
  },
});

document.body.appendChild(list.el);

// update items
list.update_rows(newItems);
list.refresh();
list.destroy();
```

### `Splitter`

Resizable panel splitter with collapse support.

```typescript
import { Splitter } from '@ridit/editor-ui'

const splitter = Splitter({
  direction: 'horizontal', // 'horizontal' | 'vertical'
  panels: [
    { id: 'sidebar', size: 20, collapsible: true, el: sidebarEl },
    { id: 'editor', el: editorEl },
  ],
  gutterSize: 1,
  onCollapse: (id, collapsed) => { ... },
  onResizeEnd: (sizes) => { ... },
})

document.body.appendChild(splitter.el)
splitter.destroy()
```

### `ScrollArea`

Custom scrollbar overlay with smooth scrolling.

```typescript
import { ScrollArea } from "@ridit/editor-ui";

const scroll = ScrollArea();
scroll.viewport.appendChild(myContent);
document.body.appendChild(scroll.el);
```

### `ContextMenu`

Keyboard-accessible right-click context menu.

```typescript
import { ContextMenu } from '@ridit/editor-ui'

const menu = ContextMenu()

menu.bind(myElement, () => [
  {
    type: 'item',
    label: 'Rename',
    onClick: () => { ... },
    command_id: 'F2',
  },
  { type: 'separator' },
  {
    type: 'item',
    label: 'Delete',
    onClick: () => { ... },
    command_id: 'Delete',
  },
])

document.body.appendChild(menu.el)
menu.destroy()
```

### `Button`

Accessible button with variants and tooltip support.

```typescript
import { Button } from '@ridit/editor-ui'
import { icon } from '@ridit/editor-ui/utils'

const btn = Button(icon('plus'), {
  variant: 'ghost', // 'ghost' | 'default'
  onClick: (e) => { ... },
  tooltip: { text: 'Add item', delay: 200 },
})
```

## Styling

Import the bundled CSS in your entry point:

```typescript
import "@ridit/editor-ui/static-css/workbench.css";
```

or individual component styling:

```typescript
import "@ridit/editor-ui/static-css/components/componentName.css";
```

Components use CSS variables for theming. Override them to match your design:

```css
:root {
  --explorer-foreground: #abb2bf;
  --explorer-item-hover-background: rgba(255, 255, 255, 0.05);
  --explorer-item-hover-foreground: #ffffff;
  --explorer-item-active-background: rgba(255, 255, 255, 0.1);
  --explorer-item-active-foreground: #ffffff;
}
```

## License

MIT
