import { h } from "../../utils/h";
import {
  clamp,
  normalizeSizes,
  pixelDeltaToPercent,
  calcResizedPair,
  collapsePanel,
  expandPanel,
  resolveGutterDimension,
  panelSizeStyle,
  gutterSizeStyle,
  gutterTrackStyle,
} from "./splitter.helpers";

export type SplitterDirection = "horizontal" | "vertical";

export type SplitterPanel = {
  id: string;
  size?: number;
  collapsible?: boolean;
  el: HTMLElement;
};

export type SplitterOpts = {
  direction?: SplitterDirection;
  panels: SplitterPanel[];
  gutterSize?: number;
  class?: string;
  onResize?: (sizes: { id: string; size: number }[]) => void;
  onResizeEnd?: (sizes: { id: string; size: number }[]) => void;
  onCollapse?: (id: string, collapsed: boolean) => void;
};

type PanelState = SplitterPanel & {
  paneEl: HTMLElement;
  currentSize: number;
};

export function Splitter(opts: SplitterOpts) {
  const dir = opts.direction ?? "horizontal";
  const isHorizontal = dir === "horizontal";
  const gutterSize = opts.gutterSize ?? 4;
  const { lineSize, hoverSize, hitSize } = resolveGutterDimension(gutterSize);

  const rawSizes = opts.panels.map((p) => p.size ?? 100 / opts.panels.length);
  const normSizes = normalizeSizes(rawSizes);

  const states: PanelState[] = opts.panels.map((p, i) => {
    const paneEl = h("div", {
      style: [
        "min-height:0;",
        "min-width:0;",
        "overflow:hidden;",
        isHorizontal ? "height:100%;" : "width:100%;",
      ].join(""),
    });
    paneEl.appendChild(p.el);
    return {
      ...p,
      paneEl,
      currentSize: normSizes[i] ?? 100 / opts.panels.length,
    };
  });

  const getContainerSize = () =>
    isHorizontal ? container.clientWidth : container.clientHeight;

  const applySize = (state: PanelState) => {
    state.paneEl.setAttribute("style", panelSizeStyle(dir, state.currentSize));
  };

  const applySizes = () => states.forEach(applySize);

  const emitSizes = (cb?: (sizes: { id: string; size: number }[]) => void) => {
    cb?.(states.map((s) => ({ id: s.id, size: s.currentSize })));
  };

  const children: HTMLElement[] = [];
  const gutterCleanups: (() => void)[] = [];

  states.forEach((state, i) => {
    children.push(state.paneEl);

    if (i >= states.length - 1) return;

    const indexA = i;
    const indexB = i + 1;
    const stateA = states[indexA]!;
    const stateB = states[indexB]!;
    const isCollapsiblePair = !!stateA.collapsible || !!stateB.collapsible;

    const gutterInner = h("div", {
      style: [
        "position:absolute;",
        "transition:all 150ms;",
        "background:var(--wb-split-handle);",
        gutterTrackStyle(dir, lineSize),
        isHorizontal ? `width:${lineSize}px;` : `height:${lineSize}px;`,
      ].join(""),
    });

    const gutter = h("div", {
      style: [
        "position:relative;",
        "flex-shrink:0;",
        "user-select:none;",
        "z-index:10;",
        isHorizontal ? "height:100%;" : "width:100%;",
        isHorizontal ? "cursor:col-resize;" : "cursor:row-resize;",
        gutterSizeStyle(dir, hitSize),
      ].join(""),
    });
    gutter.appendChild(gutterInner);

    const setGutterSize = (px: number) => {
      if (isHorizontal) gutterInner.style.width = `${px}px`;
      else gutterInner.style.height = `${px}px`;
    };

    const onGutterEnter = () => {
      gutterInner.style.background = "var(--wb-split-handle-hover";
      setGutterSize(hoverSize);
    };
    const onGutterLeave = () => {
      if (!dragging) {
        gutterInner.style.background = "var(--wb-split-handle)";
        setGutterSize(lineSize);
      }
    };

    gutter.addEventListener("mouseenter", onGutterEnter);
    gutter.addEventListener("mouseleave", onGutterLeave);

    const onDblClick = () => {
      if (!isCollapsiblePair) return;

      const a = states[indexA]!;
      const b = states[indexB]!;
      const target = a.collapsible ? a : b;
      const targetIdx = target === a ? indexA : indexB;
      const neighborIdx = target === a ? indexB : indexA;

      if (target.currentSize < 2) {
        const { sizes } = expandPanel({
          sizes: states.map((s) => s.currentSize),
          index: targetIdx,
          restoreSize: target.size ?? 20,
          neighborIndex: neighborIdx,
        });
        sizes.forEach((sz, idx) => {
          const s = states[idx];
          if (s && sz !== undefined) s.currentSize = sz;
        });
        opts.onCollapse?.(target.id, false);
      } else {
        const { sizes } = collapsePanel({
          sizes: states.map((s) => s.currentSize),
          index: targetIdx,
          neighborIndex: neighborIdx,
        });
        sizes.forEach((sz, idx) => {
          const s = states[idx];
          if (s && sz !== undefined) s.currentSize = sz;
        });
        opts.onCollapse?.(target.id, true);
      }

      applySizes();
      emitSizes(opts.onResizeEnd);
    };
    gutter.addEventListener("dblclick", onDblClick);

    let dragging = false;
    let startPos = 0;
    let startSizeA = 0;
    let startSizeB = 0;

    const cancelDrag = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      gutterInner.style.background = `var(--wb-split-handle, ${opts.gutterSize ?? "rgba(255,255,255,0.08)"})`;
      setGutterSize(lineSize);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      startPos = isHorizontal ? e.clientX : e.clientY;
      startSizeA = stateA.currentSize;
      startSizeB = stateB.currentSize;
      document.body.style.userSelect = "none";
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      gutterInner.style.background = "var(--wb-split-handle-active)";
      setGutterSize(hoverSize);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const containerPx = getContainerSize();
      const rawDeltaPx = isHorizontal
        ? e.clientX - startPos
        : e.clientY - startPos;
      const deltaPct = pixelDeltaToPercent(rawDeltaPx, containerPx);

      const { newSizeA, newSizeB, collapsedA, collapsedB } = calcResizedPair(
        deltaPct,
        {
          sizeA: startSizeA,
          sizeB: startSizeB,
          collapsibleA: !!stateA.collapsible,
          collapsibleB: !!stateB.collapsible,
        },
      );

      stateA.currentSize = newSizeA;
      stateB.currentSize = newSizeB;
      applySizes();
      emitSizes(opts.onResize);

      if (collapsedA) opts.onCollapse?.(stateA.id, true);
      if (collapsedB) opts.onCollapse?.(stateB.id, true);
    };

    const onMouseUp = () => {
      if (!dragging) return;

      if (stateA.collapsible && stateA.currentSize < 2)
        opts.onCollapse?.(stateA.id, true);
      if (stateB.collapsible && stateB.currentSize < 2)
        opts.onCollapse?.(stateB.id, true);

      emitSizes(opts.onResizeEnd);
      cancelDrag();

      gutterInner.style.background = "var(--wb-split-handle)";
      setGutterSize(lineSize);
    };

    const onDragInterrupt = () => cancelDrag();

    gutter.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onDragInterrupt);
    document.addEventListener("visibilitychange", onDragInterrupt);

    gutterCleanups.push(() => {
      gutter.removeEventListener("mouseenter", onGutterEnter);
      gutter.removeEventListener("mouseleave", onGutterLeave);
      gutter.removeEventListener("dblclick", onDblClick);
      gutter.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onDragInterrupt);
      document.removeEventListener("visibilitychange", onDragInterrupt);
      cancelDrag();
    });

    children.push(gutter);
  });

  const container = h(
    "div",
    {
      style: [
        "display:flex;",
        "min-height:0;",
        "min-width:0;",
        "height:100%;",
        "width:100%;",
        "overflow:hidden;",
        isHorizontal ? "flex-direction:row;" : "flex-direction:column;",
      ].join(""),
    },
    ...children,
  );

  applySizes();

  return {
    el: container,

    getSizes(): { id: string; size: number }[] {
      return states.map((s) => ({ id: s.id, size: s.currentSize }));
    },

    setSizes(sizes: { id: string; size: number }[]) {
      for (const { id, size } of sizes) {
        const s = states.find((st) => st.id === id);
        if (s) s.currentSize = clamp(size, 0, 100);
      }
      const norm = normalizeSizes(states.map((s) => s.currentSize));
      states.forEach((s, i) => {
        const n = norm[i];
        if (n !== undefined) s.currentSize = n;
      });
      applySizes();
    },

    collapse(id: string) {
      const idx = states.findIndex((s) => s.id === id);
      const state = states[idx];
      if (idx === -1 || !state || state.currentSize === 0) return;
      const neighborIndex = idx > 0 ? idx - 1 : idx + 1;
      const { sizes } = collapsePanel({
        sizes: states.map((s) => s.currentSize),
        index: idx,
        neighborIndex,
      });
      sizes.forEach((sz, i) => {
        const s = states[i];
        if (s && sz !== undefined) s.currentSize = sz;
      });
      applySizes();
      opts.onCollapse?.(id, true);
      emitSizes(opts.onResizeEnd);
    },

    expand(id: string) {
      const idx = states.findIndex((s) => s.id === id);
      const state = states[idx];
      if (idx === -1 || !state || state.currentSize > 0) return;
      const neighborIndex = idx > 0 ? idx - 1 : idx + 1;
      const { sizes } = expandPanel({
        sizes: states.map((s) => s.currentSize),
        index: idx,
        restoreSize: state.size ?? 20,
        neighborIndex,
      });
      sizes.forEach((sz, i) => {
        const s = states[i];
        if (s && sz !== undefined) s.currentSize = sz;
      });
      applySizes();
      opts.onCollapse?.(id, false);
      emitSizes(opts.onResizeEnd);
    },

    destroy() {
      gutterCleanups.forEach((fn) => fn());
    },
  };
}
