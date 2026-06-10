"use client";

import { useEffect, useRef } from "react";

export type CommandPaletteItem = {
  disabled?: boolean;
  group: "account" | "collections" | "create" | "navigation" | "records" | "refresh";
  id: string;
  keywords: string[];
  onSelect: () => Promise<void> | void;
  subtitle: string;
  title: string;
};

type CommandPaletteDialogProps = {
  activeIndex: number;
  items: CommandPaletteItem[];
  onClose: () => void;
  onMoveActive: (direction: -1 | 1) => void;
  onQueryChange: (value: string) => void;
  onSelectActive: () => void;
  onSelectItem: (index: number) => void;
  query: string;
};

function createCommandPaletteSearchText(item: CommandPaletteItem) {
  return [item.title, item.subtitle, ...item.keywords].join(" ").trim().toLowerCase();
}

export function filterCommandPaletteItems(
  items: CommandPaletteItem[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return items;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = createCommandPaletteSearchText(item);

    return terms.every((term) => haystack.includes(term));
  });
}

export function CommandPaletteDialog({
  activeIndex,
  items,
  onClose,
  onMoveActive,
  onQueryChange,
  onSelectActive,
  onSelectItem,
  query,
}: CommandPaletteDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  let lastRenderedGroup: CommandPaletteItem["group"] | null = null;
  const groupLabels = {
    account: "Account",
    collections: "Collections",
    create: "Create",
    navigation: "Navigation",
    records: "Records",
    refresh: "Refresh",
  } as const satisfies Record<CommandPaletteItem["group"], string>;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      aria-modal="true"
      className="command-palette-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="command-palette-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette-header">
          <div>
            <p className="card-eyebrow">Command palette</p>
            <h3 className="section-title">Open a route or run an action</h3>
          </div>
          <button className="mini-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <label className="field">
          <span>Search admin routes and actions</span>
          <input
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onMoveActive(1);
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                onMoveActive(-1);
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                onSelectActive();
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            ref={inputRef}
            type="text"
            value={query}
          />
        </label>

        <div className="command-palette-results" role="listbox">
          {items.length === 0 ? (
            <div className="empty-state-box">
              <p className="section-title">No matching commands</p>
              <p className="section-copy">
                Try a schema name, record summary, or admin area like settings or media.
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const shouldRenderGroup = item.group !== lastRenderedGroup;

              lastRenderedGroup = item.group;

              return (
                <div key={item.id}>
                  {shouldRenderGroup ? (
                    <p className="command-palette-group-label">
                      {groupLabels[item.group]}
                    </p>
                  ) : null}

                  <button
                    aria-disabled={item.disabled ? "true" : undefined}
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex
                        ? "command-palette-item is-active"
                        : "command-palette-item"
                    }
                    disabled={item.disabled}
                    onClick={() => onSelectItem(index)}
                    type="button"
                  >
                    <div className="mini-list-content">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
