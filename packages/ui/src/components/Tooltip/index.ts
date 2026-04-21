export interface TooltipProps {
  text?: string;
  content?: HTMLElement;
  child: HTMLElement;
  class?: string;
  position?: "top" | "bottom" | "left" | "right" | "auto";
  delay?: number;
  hide_delay?: number;
}

export function Tooltip(opts: TooltipProps) {
  const tip = document.createElement("div");

  // base styles
  Object.assign(tip.style, {
    position: "fixed",
    zIndex: "9999",
    display: "none",
    padding: "2px 8px",
    fontSize: "12.5px",
    borderRadius: "999px",
    border: "1px solid #3a3a3a",
    background: "#1e1e1e",
    color: "#e5e5e5",
    whiteSpace: "nowrap",
    pointerEvents: "auto",
    transform: "scale(0.95)",
    opacity: "0",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  });

  if (opts.content) {
    tip.appendChild(opts.content);
  } else if (opts.text) {
    tip.textContent = opts.text;
  }

  document.body.appendChild(tip);

  let showTimeout: number | null = null;
  let hideTimeout: number | null = null;

  const showAnimation = () => {
    tip.style.display = "block";
    requestAnimationFrame(() => {
      tip.style.opacity = "1";
      tip.style.transform = "scale(1)";
    });
  };

  const hideAnimation = () => {
    tip.style.opacity = "0";
    tip.style.transform = "scale(0.95)";
    setTimeout(() => {
      tip.style.display = "none";
    }, 150);
  };

  const hide = () => {
    if (showTimeout !== null) {
      window.clearTimeout(showTimeout);
      showTimeout = null;
    }

    if (opts.hide_delay) {
      hideTimeout = window.setTimeout(hideAnimation, opts.hide_delay);
    } else {
      hideAnimation();
    }
  };

  const cancel_hide = () => {
    if (hideTimeout !== null) {
      window.clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const show = () => {
    if (!document.body.contains(opts.child)) {
      hide();
      return;
    }

    const rect = opts.child.getBoundingClientRect();

    showAnimation();

    const tipRect = tip.getBoundingClientRect();

    const gap = 6;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let position = opts.position || "auto";

    if (position === "auto") {
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      if (spaceBelow >= tipRect.height + gap) position = "bottom";
      else if (spaceAbove >= tipRect.height + gap) position = "top";
      else if (spaceRight >= tipRect.width + gap) position = "right";
      else if (spaceLeft >= tipRect.width + gap) position = "left";
      else position = "bottom";
    }

    let left = 0;
    let top = 0;

    switch (position) {
      case "bottom":
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        top = rect.bottom + gap;
        break;

      case "top":
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        top = rect.top - tipRect.height - gap;
        break;

      case "left":
        left = rect.left - tipRect.width - gap;
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        break;

      case "right":
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        break;
    }

    left = Math.max(gap, Math.min(left, viewportWidth - tipRect.width - gap));
    top = Math.max(gap, Math.min(top, viewportHeight - tipRect.height - gap));

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  const handleMouseEnter = () => {
    cancel_hide();
    if (opts.delay) {
      showTimeout = window.setTimeout(show, opts.delay);
    } else {
      show();
    }
  };

  opts.child.addEventListener("mouseenter", handleMouseEnter);
  opts.child.addEventListener("mouseleave", hide);
  opts.child.addEventListener("blur", hide);
  opts.child.addEventListener("mousedown", hide);

  tip.addEventListener("mouseenter", cancel_hide);
  tip.addEventListener("mouseleave", hide);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(opts.child)) {
      hide();
      tip.remove();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return {
    el: opts.child,
    update_text(text: string) {
      tip.innerHTML = "";
      tip.textContent = text;
    },
    update_content(content: HTMLElement) {
      tip.innerHTML = "";
      tip.appendChild(content);
    },
    destroy() {
      if (showTimeout !== null) window.clearTimeout(showTimeout);
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);

      opts.child.removeEventListener("mouseenter", handleMouseEnter);
      opts.child.removeEventListener("mouseleave", hide);
      opts.child.removeEventListener("blur", hide);
      opts.child.removeEventListener("mousedown", hide);

      tip.removeEventListener("mouseenter", cancel_hide);
      tip.removeEventListener("mouseleave", hide);

      observer.disconnect();
      tip.remove();
    },
  };
}
