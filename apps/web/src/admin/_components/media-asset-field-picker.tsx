"use client";

import { useState } from "react";
import type { DatamixMediaAsset } from "@datamix/core";

import { AdminStateBox } from "./admin-state";
import {
  createMediaAssetSearchText,
  formatByteSize,
} from "../_lib/media-formatting";
import { moveItem } from "../_lib/schema-drafts";

type MediaAssetFieldPickerProps = {
  fieldType: "image" | "imageGallery";
  mediaAssets: DatamixMediaAsset[];
  onChange: (nextValue: string) => void;
  onOpenMediaLibrary: () => void;
  value: string;
};

function readListValues(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function appendListValue(value: string, item: string) {
  const nextItem = item.trim();

  if (nextItem.length === 0) {
    return value;
  }

  const items = readListValues(value);

  if (items.includes(nextItem)) {
    return items.join("\n");
  }

  return [...items, nextItem].join("\n");
}

function removeListValue(value: string, item: string) {
  return readListValues(value)
    .filter((currentItem) => currentItem !== item)
    .join("\n");
}

function moveListValue(value: string, item: string, direction: -1 | 1) {
  const items = readListValues(value);
  const currentIndex = items.indexOf(item);

  if (currentIndex === -1) {
    return value;
  }

  return moveItem(items, currentIndex, direction).join("\n");
}

export function MediaAssetFieldPicker({
  fieldType,
  mediaAssets,
  onChange,
  onOpenMediaLibrary,
  value,
}: MediaAssetFieldPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredAssets =
    normalizedSearchQuery.length === 0
      ? mediaAssets
      : mediaAssets.filter((asset) =>
          createMediaAssetSearchText(asset).includes(normalizedSearchQuery),
        );

  const selectedStorageKeys =
    fieldType === "imageGallery"
      ? readListValues(value)
      : value.trim().length > 0
        ? [value.trim()]
        : [];

  return (
    <div className="media-field-box">
      <div className="section-row">
        <div>
          <p className="section-title">Media library</p>
          <p className="section-copy">
            {fieldType === "image"
              ? "Choose one stored asset or paste a storage key manually."
              : "Add stored assets to the gallery, then move them into the saved display order."}
          </p>
        </div>
        <button className="mini-button" onClick={onOpenMediaLibrary} type="button">
          Open library
        </button>
      </div>

      {selectedStorageKeys.length > 0 ? (
        <div className="media-field-selected-list">
          {selectedStorageKeys.map((storageKey) => {
            const selectedAsset =
              mediaAssets.find((asset) => asset.storageKey === storageKey) ?? null;
            const selectedIndex = selectedStorageKeys.indexOf(storageKey);

            return (
              <div className="type-specific-box media-field-selected-item" key={storageKey}>
                <div className="media-field-selected-copy">
                  {fieldType === "imageGallery" ? (
                    <span className="media-field-order-badge">{selectedIndex + 1}</span>
                  ) : null}
                  <div>
                    <p className="section-title">
                      {selectedAsset?.fileName ?? storageKey.split("/").at(-1) ?? storageKey}
                    </p>
                    <p className="section-copy media-field-key">{storageKey}</p>
                  </div>
                </div>
                <div className="media-field-selected-actions">
                  {fieldType === "imageGallery" ? (
                    <>
                      <button
                        className="mini-button"
                        disabled={selectedIndex === 0}
                        onClick={() => onChange(moveListValue(value, storageKey, -1))}
                        type="button"
                      >
                        Move up
                      </button>
                      <button
                        className="mini-button"
                        disabled={selectedIndex === selectedStorageKeys.length - 1}
                        onClick={() => onChange(moveListValue(value, storageKey, 1))}
                        type="button"
                      >
                        Move down
                      </button>
                    </>
                  ) : null}
                  <button
                    className="mini-button mini-button-danger"
                    onClick={() =>
                      onChange(
                        fieldType === "image"
                          ? ""
                          : removeListValue(value, storageKey),
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {mediaAssets.length === 0 ? (
        <AdminStateBox
          actionLabel="Go to media library"
          body="No uploaded media assets are available yet. Upload an asset in the media library first, then return here to attach it."
          compact
          onAction={onOpenMediaLibrary}
          title="No media assets available"
          tone="warning"
        />
      ) : (
        <>
          <label className="field field-compact">
            <span>Filter library assets</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search filename or storage key"
              type="text"
              value={searchQuery}
            />
          </label>

          {filteredAssets.length === 0 ? (
            <AdminStateBox
              actionLabel="Clear filter"
              body={`No media assets matched "${searchQuery}".`}
              compact
              onAction={() => setSearchQuery("")}
              title="No matching media assets"
              tone="warning"
            />
          ) : (
            <div className="mini-list media-field-library-list">
              {filteredAssets.slice(0, 8).map((asset) => {
                const isSelected = selectedStorageKeys.includes(asset.storageKey);

                return (
                  <button
                    className={
                      isSelected
                        ? "mini-list-item is-selected mini-list-item-stacked"
                        : "mini-list-item mini-list-item-stacked"
                    }
                    key={asset.id}
                    onClick={() =>
                      onChange(
                        fieldType === "image"
                          ? asset.storageKey
                          : appendListValue(value, asset.storageKey),
                      )
                    }
                    type="button"
                  >
                    <div className="mini-list-content">
                      <span>{asset.fileName}</span>
                      <small>
                        {asset.mimeType} • {formatByteSize(asset.byteSize)}
                      </small>
                      <small>{asset.storageKey}</small>
                    </div>
                    <small>{isSelected ? "Selected" : fieldType === "image" ? "Use" : "Add"}</small>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
