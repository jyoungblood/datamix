"use client";

import { useEffect, useRef } from "react";

export type CommandPaletteItem = {
  group: "collections" | "records" | "admin";
  id: string;
  keywords: string[];
  onSelect: () => void;
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
            <h3 className="section-title">Jump anywhere with one command</h3>
          </div>
          <button className="mini-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <label className="field">
          <span>Search collections, records, and admin actions</span>
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
            placeholder="Try “media”, “new record”, or a collection name"
            ref={inputRef}
            type="text"
            value={query}
          />
        </label>

        <p className="helper-text">
          Use <strong>Up</strong> and <strong>Down</strong> to move, <strong>Enter</strong>{" "}
          to run a command, and <strong>Esc</strong> to close.
        </p>

        <div className="command-palette-results" role="listbox">
          {items.length === 0 ? (
            <div className="empty-state-box">
              <p className="section-title">No matching commands</p>
              <p className="section-copy">
                Try a collection name, a record summary, or an admin area like settings or
                media.
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
                      {item.group === "collections"
                        ? "Collections"
                        : item.group === "records"
                          ? "Records"
                          : "Admin actions"}
                    </p>
                  ) : null}

                  <button
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex
                        ? "command-palette-item is-active"
                        : "command-palette-item"
                    }
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
