import {
  datamixApiKeyAccessLevels,
  createMediaObjectUrl,
  datamixDefaultRoleAssignments,
  datamixFieldTypes,
  datamixPermissionResourceDefinitions,
  datamixRolePresets,
  getDatamixPermissionActionDefinition,
  isRecordCrudFieldDefinition,
  listDatamixPermissionGrantsForRole,
  listDatamixPermissionsByResource,
  type DatamixCollectionDefinition,
  type DatamixAuthorizationSummary,
  type DatamixApiKeyAccessLevel,
  type DatamixApiKeySummary,
  type DatamixAuthProviderStatus,
  type DatamixFieldDefinition,
  type DatamixFieldType,
  type DatamixMediaAsset,
  type DatamixPermissionKey,
  type DatamixRoleDefinition,
  type DatamixSchemaValidationIssue,
  type DatamixSelectOption,
} from "@datamix/core";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { authClient } from "../lib/auth-client";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  updateApiKey,
  type PublicApiRuntimeSummary,
} from "../lib/api-keys";
import {
  CollectionDefinitionRequestError,
  listCollectionDefinitions,
  saveCollectionDefinition,
  type SavedCollectionPlanSummary,
  type StoredCollectionDefinition,
} from "../lib/collection-definitions";
import { sendInvite } from "../lib/invite";
import {
  listMediaAssets,
  MediaAssetRequestError,
  uploadMediaAsset,
} from "../lib/media";
import { listRoles, saveRole, RoleRequestError } from "../lib/roles";
import {
  CollectionRecordRequestError,
  createCollectionRecord,
  listCollectionRecords,
  updateCollectionRecord,
  type PrimitiveRecordValue,
  type StoredCollectionRecord,
} from "../lib/records";
import { adminPublicEnv } from "../lib/runtime";
import { loadSessionAccess } from "../lib/session";
import { useSetupStatus } from "../lib/setup";
import {
  listUsers,
  updateUserRole,
  UserRequestError,
  type DatamixUserSummary,
} from "../lib/users";
import { TiptapRichTextEditor } from "./_components/TiptapRichTextEditor";

const loginHref = "/login?next=/admin";
const apiHealthHref = `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/health`;
const fieldTypeOptions = [...datamixFieldTypes];
const apiKeyAccessLevelOptions = [...datamixApiKeyAccessLevels];

const adminUtilityItems = [
  {
    id: "invite",
    label: "Team access",
    description: "Invite users and assign roles without leaving the shell.",
    state: "ready",
  },
  {
    id: "media",
    label: "Media upload",
    description: "Upload originals to R2. Library views expand next.",
    state: "ready",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Role definitions now live here, with more project controls later.",
    state: "ready",
  },
] as const;

const shellCapabilities = [
  "Persistent browser session is active on the API origin.",
  "First-run setup is complete and public sign-up is closed again.",
  "Password reset and invite emails share the same auth email provider layer.",
  "Saved collection schemas now generate a matching record editor in the admin.",
  "Collections and their records now drive the sidebar navigation.",
] as const;

const rolePermissionSections = datamixPermissionResourceDefinitions.map((resource) => ({
  permissions: listDatamixPermissionsByResource(resource.id),
  resource,
}));

const overviewSectionId = "overview";
const collectionBuilderSectionId = "collections-builder";
const recordEditorSectionId = "record-editor";

type BaseFieldDraft<TType extends DatamixFieldType> = {
  key: string;
  type: TType;
  name: string;
  label: string;
  required: boolean;
  description: string;
};

type CollectionScalarFieldDraft =
  | BaseFieldDraft<"text">
  | BaseFieldDraft<"number">
  | BaseFieldDraft<"boolean">
  | BaseFieldDraft<"date">
  | BaseFieldDraft<"richText">
  | BaseFieldDraft<"markdown">
  | BaseFieldDraft<"image">
  | BaseFieldDraft<"imageGallery">;

type CollectionSelectFieldDraft = BaseFieldDraft<"select"> & {
  options: DatamixSelectOption[];
};

type CollectionRelationshipFieldDraft = BaseFieldDraft<"relationship"> & {
  multiple: boolean;
  targetCollection: string;
};

type CollectionFieldDraft =
  | CollectionScalarFieldDraft
  | CollectionSelectFieldDraft
  | CollectionRelationshipFieldDraft;

type CollectionDraft = {
  description: string;
  fields: CollectionFieldDraft[];
  label: string;
  name: string;
};

type GeneratedRecordFormValue = boolean | string;
type GeneratedRecordFormState = Record<string, GeneratedRecordFormValue>;
type GeneratedRecordPayloadValue = boolean | number | string | string[] | null;
type PrimitiveRecordPayload = Record<string, PrimitiveRecordValue>;

type RoleDraft = {
  description: string;
  id: string;
  label: string;
  permissions: DatamixPermissionKey[];
};

type ApiKeyDraft = {
  accessLevel: DatamixApiKeyAccessLevel;
  label: string;
};

type CommandPaletteItem = {
  group: "collections" | "records" | "admin";
  id: string;
  keywords: string[];
  onSelect: () => void;
  subtitle: string;
  title: string;
};

let nextFieldKey = 0;

function createFieldKey() {
  nextFieldKey += 1;

  return `field-${nextFieldKey}`;
}

function createFieldDraft(type: DatamixFieldType = "text"): CollectionFieldDraft {
  const baseField = {
    description: "",
    key: createFieldKey(),
    label: "",
    name: "",
    required: false,
    type,
  };

  if (type === "select") {
    return {
      ...baseField,
      options: [{ label: "", value: "" }],
      type: "select",
    };
  }

  if (type === "relationship") {
    return {
      ...baseField,
      multiple: false,
      targetCollection: "",
      type: "relationship",
    };
  }

  switch (type) {
    case "text":
    case "number":
    case "boolean":
    case "date":
    case "richText":
    case "markdown":
    case "image":
    case "imageGallery":
      return {
        ...baseField,
        type,
      };
  }
}

function createEmptyCollectionDraft(): CollectionDraft {
  return {
    description: "",
    fields: [],
    label: "",
    name: "",
  };
}

function createDraftFromDefinition(definition: DatamixCollectionDefinition): CollectionDraft {
  return {
    description: definition.description ?? "",
    fields: definition.fields.map((field) => {
      const baseField = {
        description: field.description ?? "",
        key: createFieldKey(),
        label: field.label,
        name: field.name,
        required: field.required,
        type: field.type,
      };

      if (field.type === "select") {
        return {
          ...baseField,
          options: field.options,
          type: "select" as const,
        };
      }

      if (field.type === "relationship") {
        return {
          ...baseField,
          multiple: field.multiple,
          targetCollection: field.targetCollection,
          type: "relationship" as const,
        };
      }

      return {
        ...baseField,
        type: field.type,
      };
    }),
    label: definition.label,
    name: definition.name,
  };
}

function serializeDraft(draft: CollectionDraft): DatamixCollectionDefinition {
  return {
    ...(draft.description ? { description: draft.description } : {}),
    fields: draft.fields.map((field) => {
      const baseField = {
        label: field.label,
        name: field.name,
        required: field.required,
        ...(field.description ? { description: field.description } : {}),
      };

      if (field.type === "select") {
        return {
          ...baseField,
          options: field.options.map((option) => ({
            label: option.label,
            value: option.value,
          })),
          type: "select" as const,
        };
      }

      if (field.type === "relationship") {
        return {
          ...baseField,
          multiple: field.multiple,
          targetCollection: field.targetCollection,
          type: "relationship" as const,
        };
      }

      return {
        ...baseField,
        type: field.type,
      };
    }),
    label: draft.label,
    name: draft.name,
  };
}

function formatIssuePath(path: string) {
  if (path.startsWith("collection.")) {
    return path.slice("collection.".length);
  }

  if (path.startsWith("record.values.")) {
    return path.slice("record.values.".length);
  }

  return path;
}

function createGeneratedRecordFormState(
  definition: DatamixCollectionDefinition,
): GeneratedRecordFormState {
  return Object.fromEntries(
    definition.fields.map((field) => [field.name, field.type === "boolean" ? false : ""]),
  );
}

function createGeneratedRecordFormStateFromRecord(
  definition: DatamixCollectionDefinition,
  record: StoredCollectionRecord,
): GeneratedRecordFormState {
  const defaultState = createGeneratedRecordFormState(definition);

  for (const field of definition.fields) {
    if (!isRecordCrudFieldDefinition(field)) {
      continue;
    }

    const recordValue = record.values[field.name];

    switch (field.type) {
      case "text":
      case "date":
      case "select":
      case "richText":
      case "markdown":
      case "image":
        defaultState[field.name] = typeof recordValue === "string" ? recordValue : "";
        break;
      case "imageGallery":
        defaultState[field.name] = Array.isArray(recordValue) ? recordValue.join("\n") : "";
        break;
      case "relationship":
        defaultState[field.name] = field.multiple
          ? Array.isArray(recordValue)
            ? recordValue.join("\n")
            : ""
          : typeof recordValue === "string"
            ? recordValue
            : "";
        break;
      case "number":
        defaultState[field.name] =
          typeof recordValue === "number" ? String(recordValue) : "";
        break;
      case "boolean":
        defaultState[field.name] = recordValue === true;
        break;
    }
  }

  return defaultState;
}

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

function createGeneratedRecordPayload(
  definition: DatamixCollectionDefinition,
  values: GeneratedRecordFormState,
): Record<string, GeneratedRecordPayloadValue> {
  return Object.fromEntries(
    definition.fields.map((field) => {
      const rawValue = values[field.name];

      if (field.type === "boolean") {
        return [field.name, rawValue === true];
      }

      const stringValue = typeof rawValue === "string" ? rawValue : "";

      switch (field.type) {
        case "number":
          return [
            field.name,
            stringValue.trim().length === 0 ? null : Number(stringValue),
          ];
        case "relationship":
          return [
            field.name,
            field.multiple ? readListValues(stringValue) : stringValue.trim(),
          ];
        case "imageGallery":
          return [field.name, readListValues(stringValue)];
        case "text":
        case "date":
        case "select":
        case "richText":
        case "markdown":
        case "image":
          return [field.name, stringValue];
      }
    }),
  );
}

function createPersistedRecordPayload(
  definition: DatamixCollectionDefinition,
  values: GeneratedRecordFormState,
): PrimitiveRecordPayload {
  const payload: PrimitiveRecordPayload = {};

  for (const field of definition.fields) {
    if (!isRecordCrudFieldDefinition(field)) {
      continue;
    }

    const rawValue = values[field.name];

    switch (field.type) {
      case "text":
      case "date":
      case "select":
      case "richText":
      case "markdown":
      case "image":
        payload[field.name] =
          typeof rawValue === "string" && rawValue.length > 0 ? rawValue : null;
        break;
      case "imageGallery":
        payload[field.name] = typeof rawValue === "string" ? readListValues(rawValue) : [];
        break;
      case "relationship":
        payload[field.name] = field.multiple
          ? typeof rawValue === "string"
            ? readListValues(rawValue)
            : []
          : typeof rawValue === "string" && rawValue.trim().length > 0
            ? rawValue.trim()
            : null;
        break;
      case "number": {
        const parsedValue =
          typeof rawValue === "string" && rawValue.trim().length > 0
            ? Number(rawValue)
            : null;

        payload[field.name] =
          typeof parsedValue === "number" && Number.isNaN(parsedValue) ? null : parsedValue;
        break;
      }
      case "boolean":
        payload[field.name] = rawValue === true;
        break;
    }
  }

  return payload;
}

function formatRecordTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const kilobytes = value / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function createMediaAssetSearchText(asset: DatamixMediaAsset) {
  return [
    asset.fileName,
    asset.mimeType,
    asset.storageKey,
    asset.uploadedByUserEmail ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function summarizeRecord(
  definition: DatamixCollectionDefinition,
  record: StoredCollectionRecord,
) {
  const summaryField = definition.fields.find(
    (field) =>
      isRecordCrudFieldDefinition(field) &&
      (field.type === "text" || field.type === "markdown") &&
      typeof record.values[field.name] === "string" &&
      record.values[field.name] !== null &&
      String(record.values[field.name]).trim().length > 0,
  );

  if (!summaryField) {
    return `Record ${record.id.slice(0, 8)}`;
  }

  return String(record.values[summaryField.name]);
}

function upsertRecord(
  records: StoredCollectionRecord[],
  nextRecord: StoredCollectionRecord,
) {
  return [...records.filter((record) => record.id !== nextRecord.id), nextRecord].sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  );
}

function formatCollectionSummary(
  collection: StoredCollectionDefinition,
  options?: { recordCount?: number },
) {
  const fieldCount = collection.definition.fields.length;
  const fieldLabel = `${fieldCount} field${fieldCount === 1 ? "" : "s"}`;

  if (typeof options?.recordCount === "number") {
    const recordLabel = `${options.recordCount} record${options.recordCount === 1 ? "" : "s"}`;

    return `${fieldLabel} • ${recordLabel}`;
  }

  return fieldLabel;
}

function createGeneratedFieldHint(field: DatamixFieldDefinition) {
  if (field.description) {
    return field.description;
  }

  switch (field.type) {
    case "text":
      return "Short text value.";
    case "number":
      return "Numeric value saved to a number column.";
    case "boolean":
      return "True or false toggle.";
    case "date":
      return "Date-only value.";
    case "select":
      return "Choose one of the saved options.";
    case "relationship":
      return field.multiple
        ? `Enter one ${field.targetCollection || "target"} record id per line.`
        : `Enter one ${field.targetCollection || "target"} record id.`;
    case "richText":
      return "Tiptap stores normalized rich text as HTML and accepts pasted markdown.";
    case "markdown":
      return "Raw markdown is stored as text and previewed live beside the editor.";
    case "image":
      return "Choose a media asset below or paste a storage key manually.";
    case "imageGallery":
      return "Add media assets below or paste one storage key per line.";
  }
}

function createGeneratedFieldPlaceholder(field: DatamixFieldDefinition) {
  switch (field.type) {
    case "text":
      return `Enter ${field.label.toLowerCase()}`;
    case "number":
      return "42";
    case "date":
      return "";
    case "relationship":
      return field.multiple
        ? `${field.targetCollection || "record"}-1\n${field.targetCollection || "record"}-2`
        : `${field.targetCollection || "record"}-1`;
    case "richText":
      return "Start writing rich text content...";
    case "markdown":
      return "## Start writing in markdown";
    case "image":
      return "originals/asset-id/hero.jpg";
    case "imageGallery":
      return "originals/asset-id/hero.jpg\noriginals/asset-id/detail.jpg";
    case "select":
    case "boolean":
      return "";
  }
}

type GeneratedRecordFieldInputProps = {
  disabled?: boolean;
  field: DatamixFieldDefinition;
  mediaAssets: DatamixMediaAsset[];
  onOpenMediaLibrary: () => void;
  value: GeneratedRecordFormValue;
  onChange: (nextValue: GeneratedRecordFormValue) => void;
};

type FlowStateBoxProps = {
  actionLabel?: string | undefined;
  body: string;
  compact?: boolean | undefined;
  onAction?: (() => void) | undefined;
  secondaryActionLabel?: string | undefined;
  onSecondaryAction?: (() => void) | undefined;
  tone?: "error" | "neutral" | "success" | "warning" | undefined;
  title: string;
};

function FlowStateBox({
  actionLabel,
  body,
  compact = false,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  tone = "neutral",
  title,
}: FlowStateBoxProps) {
  const className = compact
    ? `empty-state-box state-box state-box-${tone} compact-box`
    : `empty-state-box state-box state-box-${tone}`;

  return (
    <div className={className} role={tone === "error" ? "alert" : "status"}>
      <p className="list-title">{title}</p>
      <p className="list-copy">{body}</p>
      {actionLabel || secondaryActionLabel ? (
        <div className="actions actions-compact state-box-actions">
          {actionLabel ? (
            <button className="mini-button" onClick={onAction} type="button">
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel ? (
            <button
              className="mini-button"
              onClick={onSecondaryAction}
              type="button"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function createCommandPaletteSearchText(item: CommandPaletteItem) {
  return [item.title, item.subtitle, ...item.keywords].join(" ").trim().toLowerCase();
}

function filterCommandPaletteItems(items: CommandPaletteItem[], query: string) {
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

function CommandPaletteDialog({
  activeIndex,
  items,
  onClose,
  onMoveActive,
  onQueryChange,
  onSelectActive,
  onSelectItem,
  query,
}: {
  activeIndex: number;
  items: CommandPaletteItem[];
  onClose: () => void;
  onMoveActive: (direction: -1 | 1) => void;
  onQueryChange: (value: string) => void;
  onSelectActive: () => void;
  onSelectItem: (index: number) => void;
  query: string;
}) {
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

type MediaAssetFieldPickerProps = {
  fieldType: "image" | "imageGallery";
  mediaAssets: DatamixMediaAsset[];
  onChange: (nextValue: string) => void;
  onOpenMediaLibrary: () => void;
  value: string;
};

function MediaAssetFieldPicker({
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
    fieldType === "imageGallery" ? readListValues(value) : value.trim().length > 0 ? [value.trim()] : [];

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
        <FlowStateBox
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
            <FlowStateBox
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

function createInlineMarkdownPreview(
  value: string,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let cursor = 0;
  let matchIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const matchText = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      nodes.push(value.slice(cursor, index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          href={match[3]}
          key={`${keyPrefix}-link-${matchIndex}`}
          rel="noreferrer"
          target="_blank"
        >
          {match[2]}
        </a>,
      );
    } else if (match[5]) {
      nodes.push(<code key={`${keyPrefix}-code-${matchIndex}`}>{match[5]}</code>);
    } else if (match[7]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${matchIndex}`}>{match[7]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={`${keyPrefix}-em-${matchIndex}`}>{match[9]}</em>);
    } else {
      nodes.push(matchText);
    }

    cursor = index + matchText.length;
    matchIndex += 1;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}

function renderMarkdownPreview(markdown: string) {
  const normalizedMarkdown = markdown.replaceAll("\r\n", "\n");

  if (normalizedMarkdown.trim().length === 0) {
    return (
      <p className="markdown-preview-empty">
        Nothing to preview yet. Start writing markdown on the left.
      </p>
    );
  }

  const lines = normalizedMarkdown.split("\n");
  const blocks: React.ReactNode[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex] ?? "";
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      lineIndex += 1;
      continue;
    }

    if (trimmedLine.startsWith("```")) {
      const codeLines: string[] = [];
      lineIndex += 1;

      while (lineIndex < lines.length && !(lines[lineIndex] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[lineIndex] ?? "");
        lineIndex += 1;
      }

      if (lineIndex < lines.length) {
        lineIndex += 1;
      }

      blocks.push(
        <pre className="markdown-preview-code" key={`code-${lineIndex}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.*)$/);

    if (headingMatch) {
      const content = createInlineMarkdownPreview(
        headingMatch[2] ?? "",
        `heading-${lineIndex}`,
      );

      switch (headingMatch[1]) {
        case "#":
          blocks.push(<h1 key={`heading-${lineIndex}`}>{content}</h1>);
          break;
        case "##":
          blocks.push(<h2 key={`heading-${lineIndex}`}>{content}</h2>);
          break;
        default:
          blocks.push(<h3 key={`heading-${lineIndex}`}>{content}</h3>);
          break;
      }

      lineIndex += 1;
      continue;
    }

    if (trimmedLine.startsWith(">")) {
      const quoteLines: string[] = [];

      while (lineIndex < lines.length) {
        const nextLine = lines[lineIndex] ?? "";

        if (!nextLine.trim().startsWith(">")) {
          break;
        }

        quoteLines.push(nextLine.trim().replace(/^>\s?/, ""));
        lineIndex += 1;
      }

      blocks.push(
        <blockquote key={`quote-${lineIndex}`}>
          {createInlineMarkdownPreview(quoteLines.join(" "), `quote-${lineIndex}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      const items: React.ReactNode[] = [];

      while (lineIndex < lines.length) {
        const nextLine = (lines[lineIndex] ?? "").trim();
        const nextMatch = nextLine.match(/^[-*]\s+(.*)$/);

        if (!nextMatch) {
          break;
        }

        items.push(
          <li key={`ul-item-${lineIndex}`}>
            {createInlineMarkdownPreview(nextMatch[1] ?? "", `ul-${lineIndex}`)}
          </li>,
        );
        lineIndex += 1;
      }

      blocks.push(<ul key={`ul-${lineIndex}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      const items: React.ReactNode[] = [];

      while (lineIndex < lines.length) {
        const nextLine = (lines[lineIndex] ?? "").trim();
        const nextMatch = nextLine.match(/^\d+\.\s+(.*)$/);

        if (!nextMatch) {
          break;
        }

        items.push(
          <li key={`ol-item-${lineIndex}`}>
            {createInlineMarkdownPreview(nextMatch[1] ?? "", `ol-${lineIndex}`)}
          </li>,
        );
        lineIndex += 1;
      }

      blocks.push(<ol key={`ol-${lineIndex}`}>{items}</ol>);
      continue;
    }

    const paragraphLines: string[] = [];

    while (lineIndex < lines.length) {
      const nextLine = lines[lineIndex] ?? "";
      const nextTrimmedLine = nextLine.trim();

      if (
        nextTrimmedLine.length === 0 ||
        nextTrimmedLine.startsWith("```") ||
        /^#{1,3}\s+/.test(nextTrimmedLine) ||
        nextTrimmedLine.startsWith(">") ||
        /^[-*]\s+/.test(nextTrimmedLine) ||
        /^\d+\.\s+/.test(nextTrimmedLine)
      ) {
        break;
      }

      paragraphLines.push(nextTrimmedLine);
      lineIndex += 1;
    }

    blocks.push(
      <p key={`paragraph-${lineIndex}`}>
        {createInlineMarkdownPreview(paragraphLines.join(" "), `paragraph-${lineIndex}`)}
      </p>,
    );
  }

  return <div className="markdown-preview-content">{blocks}</div>;
}

function GeneratedRecordFieldInput({
  disabled = false,
  field,
  mediaAssets,
  onOpenMediaLibrary,
  value,
  onChange,
}: GeneratedRecordFieldInputProps) {
  const label = field.required ? `${field.label} *` : field.label;
  const hint = createGeneratedFieldHint(field);

  if (field.type === "boolean") {
    return (
      <label className="field checkbox-field generated-checkbox-field">
        <span>{label}</span>
        <input
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <small className="field-hint">{hint}</small>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="field">
        <span>{label}</span>
        <select
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          value={typeof value === "string" ? value : ""}
        >
          <option disabled={field.required} value="">
            Select an option
          </option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="field-hint">{hint}</small>
      </label>
    );
  }

  if (field.type === "richText") {
    return (
      <TiptapRichTextEditor
        disabled={disabled}
        hint={hint}
        label={label}
        onChange={(nextValue) => onChange(nextValue)}
        placeholder={createGeneratedFieldPlaceholder(field)}
        required={field.required}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  if (field.type === "image") {
    const stringValue = typeof value === "string" ? value : "";

    return (
      <div className="field media-field">
        <label className="field">
          <span>{label}</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={createGeneratedFieldPlaceholder(field)}
            required={field.required}
            type="text"
            value={stringValue}
          />
          <small className="field-hint">{hint}</small>
        </label>
        {!disabled ? (
          <MediaAssetFieldPicker
            fieldType="image"
            mediaAssets={mediaAssets}
            onChange={onChange}
            onOpenMediaLibrary={onOpenMediaLibrary}
            value={stringValue}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "imageGallery" || (field.type === "relationship" && field.multiple)) {
    return (
      <div className="field media-field">
        <label className="field">
          <span>{label}</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={createGeneratedFieldPlaceholder(field)}
            required={field.required}
            rows={field.type === "imageGallery" ? 4 : 6}
            value={typeof value === "string" ? value : ""}
          />
          <small className="field-hint">{hint}</small>
        </label>
        {field.type === "imageGallery" && !disabled ? (
          <MediaAssetFieldPicker
            fieldType="imageGallery"
            mediaAssets={mediaAssets}
            onChange={onChange}
            onOpenMediaLibrary={onOpenMediaLibrary}
            value={typeof value === "string" ? value : ""}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "markdown") {
    const stringValue = typeof value === "string" ? value : "";

    return (
      <div className="field markdown-field">
        <div className="markdown-field-header">
          <span>{label}</span>
          <small className="field-hint">{hint}</small>
        </div>
        <div className="markdown-field-grid">
          <label className="field markdown-field-panel">
            <span>Editor</span>
            <textarea
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              placeholder={createGeneratedFieldPlaceholder(field)}
              required={field.required}
              rows={10}
              value={stringValue}
            />
          </label>
          <div className="markdown-field-panel markdown-preview-panel">
            <span>Preview</span>
            {renderMarkdownPreview(stringValue)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={createGeneratedFieldPlaceholder(field)}
        required={field.required}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={typeof value === "string" ? value : ""}
      />
      <small className="field-hint">{hint}</small>
    </label>
  );
}

function moveItem<TItem>(items: TItem[], fromIndex: number, direction: -1 | 1) {
  const nextIndex = fromIndex + direction;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(fromIndex, 1);

  if (!item) {
    return items;
  }

  copy.splice(nextIndex, 0, item);

  return copy;
}

function formatPlanSummary(plan: SavedCollectionPlanSummary) {
  const fragments = [`Storage mode: ${plan.mode.replaceAll("_", " ")}`];

  if (plan.addedFields.length > 0) {
    fragments.push(`added ${plan.addedFields.join(", ")}`);
  }

  if (plan.changedFields.length > 0) {
    fragments.push(
      `changed ${plan.changedFields.map((field) => field.fieldName).join(", ")}`,
    );
  }

  if (plan.removedFields.length > 0) {
    fragments.push(`removed ${plan.removedFields.join(", ")}`);
  }

  return `${fragments.join(" • ")} • table ${plan.tableName}`;
}

function jumpToSection(sectionId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(sectionId);

  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${sectionId}`);
}

function createRoleIdSuggestion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .replaceAll(/^[^a-z]+/, "");
}

function createRoleDraftFromRole(role: DatamixRoleDefinition): RoleDraft {
  return {
    description: role.description,
    id: role.id,
    label: role.label,
    permissions: [...role.permissions],
  };
}

function createEmptyRoleDraft(sourceRole?: DatamixRoleDefinition): RoleDraft {
  if (!sourceRole) {
    return {
      description: "",
      id: "",
      label: "",
      permissions: [],
    };
  }

  const nextLabel = sourceRole.system
    ? `${sourceRole.label} copy`
    : sourceRole.label;
  const suggestedId = createRoleIdSuggestion(nextLabel);

  return {
    description: sourceRole.description,
    id: suggestedId === sourceRole.id ? `${suggestedId}_custom` : suggestedId,
    label: nextLabel,
    permissions: [...sourceRole.permissions],
  };
}

function resolveRoleLabel(
  roles: readonly DatamixRoleDefinition[],
  roleId: string | null,
) {
  if (!roleId) {
    return "Unknown role";
  }

  return roles.find((role) => role.id === roleId)?.label ?? roleId;
}

function createApiKeyDraftFromApiKey(apiKey: DatamixApiKeySummary): ApiKeyDraft {
  return {
    accessLevel: apiKey.accessLevel,
    label: apiKey.label,
  };
}

function createEmptyApiKeyDraft(): ApiKeyDraft {
  return {
    accessLevel: "read",
    label: "",
  };
}

function formatApiKeyAccessLevel(accessLevel: DatamixApiKeyAccessLevel) {
  return accessLevel === "write" ? "Read and write" : "Read only";
}

function formatPublicApiAccessMode(value: PublicApiRuntimeSummary["readAccess"] | PublicApiRuntimeSummary["writeAccess"]) {
  switch (value) {
    case "public":
      return "Public";
    case "api-key":
      return "API key";
    case "disabled":
      return "Disabled";
  }
}

function formatAuthProviderStatus(status: DatamixAuthProviderStatus) {
  switch (status) {
    case "enabled":
      return "Enabled";
    case "disabled":
      return "Not configured";
    case "incomplete":
      return "Needs both values";
  }
}

export default function AdminPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const collectionLoadRequestId = useRef(0);
  const mediaAssetsLoadRequestId = useRef(0);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const recordLoadRequestId = useRef(0);
  const [collections, setCollections] = useState<StoredCollectionDefinition[]>([]);
  const [draft, setDraft] = useState<CollectionDraft>(createEmptyCollectionDraft);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionIssues, setCollectionIssues] = useState<DatamixSchemaValidationIssue[]>([]);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
  const [collectionLoadError, setCollectionLoadError] = useState<string | null>(null);
  const [hasLoadedCollections, setHasLoadedCollections] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isRefreshingCollections, setIsRefreshingCollections] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [newFieldType, setNewFieldType] = useState<DatamixFieldType>("text");
  const [records, setRecords] = useState<StoredCollectionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<GeneratedRecordFormState>({});
  const [recordIssues, setRecordIssues] = useState<DatamixSchemaValidationIssue[]>([]);
  const [recordLoadError, setRecordLoadError] = useState<string | null>(null);
  const [recordMessage, setRecordMessage] = useState<string | null>(null);
  const [recordSupportedFieldNames, setRecordSupportedFieldNames] = useState("none");
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isRefreshingRecords, setIsRefreshingRecords] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>(
    datamixDefaultRoleAssignments.invitedUser,
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<DatamixMediaAsset[]>([]);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [mediaClipboardMessage, setMediaClipboardMessage] = useState<string | null>(null);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState<string | null>(null);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = useState(false);
  const [isRefreshingMediaAssets, setIsRefreshingMediaAssets] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [activeCommandPaletteIndex, setActiveCommandPaletteIndex] = useState(0);
  const [sessionAuthorization, setSessionAuthorization] =
    useState<DatamixAuthorizationSummary | null>(null);
  const [sessionAuthorizationError, setSessionAuthorizationError] = useState<string | null>(null);
  const [isLoadingSessionAuthorization, setIsLoadingSessionAuthorization] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<DatamixRoleDefinition[]>([
    ...datamixRolePresets,
  ]);
  const [rolesLoadError, setRolesLoadError] = useState<string | null>(null);
  const [rolesMessage, setRolesMessage] = useState<string | null>(null);
  const [roleIssues, setRoleIssues] = useState<DatamixSchemaValidationIssue[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(createEmptyRoleDraft);
  const [apiKeys, setApiKeys] = useState<DatamixApiKeySummary[]>([]);
  const [apiKeyDraft, setApiKeyDraft] = useState<ApiKeyDraft>(createEmptyApiKeyDraft);
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, ApiKeyDraft>>({});
  const [apiKeysLoadError, setApiKeysLoadError] = useState<string | null>(null);
  const [apiKeysMessage, setApiKeysMessage] = useState<string | null>(null);
  const [apiKeySecret, setApiKeySecret] = useState<string | null>(null);
  const [apiKeySecretMessage, setApiKeySecretMessage] = useState<string | null>(null);
  const [publicApiRuntime, setPublicApiRuntime] = useState<PublicApiRuntimeSummary | null>(null);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
  const [savingApiKeyId, setSavingApiKeyId] = useState<string | null>(null);
  const [revokingApiKeyId, setRevokingApiKeyId] = useState<string | null>(null);
  const [users, setUsers] = useState<DatamixUserSummary[]>([]);
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null);
  const [usersMessage, setUsersMessage] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, string>>({});
  const sessionRole = sessionAuthorization?.role ?? null;
  const permissionMap = sessionAuthorization?.permissionMap ?? null;
  const canViewCollections = permissionMap?.["collections.read"] ?? false;
  const canCreateCollections = permissionMap?.["collections.create"] ?? false;
  const canUpdateCollections = permissionMap?.["collections.update"] ?? false;
  const canAccessCollectionBuilder =
    canViewCollections || canCreateCollections || canUpdateCollections;
  const canViewRecords = permissionMap?.["records.read"] ?? false;
  const canCreateRecords = permissionMap?.["records.create"] ?? false;
  const canUpdateRecords = permissionMap?.["records.update"] ?? false;
  const canAccessRecordsWorkspace =
    canViewRecords || canCreateRecords || canUpdateRecords;
  const canViewMedia = permissionMap?.["media.read"] ?? false;
  const canUploadMedia = permissionMap?.["media.upload"] ?? false;
  const canAccessMediaWorkspace = canViewMedia || canUploadMedia;
  const canViewUsers = permissionMap?.["users.read"] ?? false;
  const canInviteUsers = permissionMap?.["users.invite"] ?? false;
  const canUpdateUsers = permissionMap?.["users.update"] ?? false;
  const canDeleteUsers = permissionMap?.["users.delete"] ?? false;
  const canAccessTeamAccess =
    canViewUsers || canInviteUsers || canUpdateUsers || canDeleteUsers;
  const canViewSettings = permissionMap?.["settings.read"] ?? false;
  const canUpdateSettings = permissionMap?.["settings.update"] ?? false;
  const canAccessSettingsWorkspace = canViewSettings || canUpdateSettings;

  const loadSessionAuthorizationData = async () => {
    setSessionAuthorizationError(null);
    setIsLoadingSessionAuthorization(true);

    try {
      const nextAuthorization = await loadSessionAccess();

      setSessionAuthorization(nextAuthorization);
    } catch (error) {
      setSessionAuthorization(null);
      setSessionAuthorizationError(
        error instanceof Error
          ? error.message
          : "Unable to load the current access profile.",
      );
    } finally {
      setIsLoadingSessionAuthorization(false);
    }
  };

  const loadAvailableRoles = async (options?: { preferredRoleId?: string }) => {
    setRolesLoadError(null);
    setIsLoadingRoles(true);

    try {
      const nextRoles = await listRoles();
      const preferredRoleId = options?.preferredRoleId;

      setAvailableRoles(nextRoles);
      setSelectedRoleId((currentSelectedRoleId) =>
        preferredRoleId && nextRoles.some((role) => role.id === preferredRoleId)
          ? preferredRoleId
          : currentSelectedRoleId &&
              nextRoles.some((role) => role.id === currentSelectedRoleId)
            ? currentSelectedRoleId
          : nextRoles[0]?.id ?? null,
      );
    } catch (error) {
      setRolesLoadError(error instanceof Error ? error.message : "Unable to load roles.");
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadApiKeyData = async () => {
    setApiKeysLoadError(null);
    setIsLoadingApiKeys(true);

    try {
      const result = await listApiKeys();

      setApiKeys(result.apiKeys);
      setPublicApiRuntime(result.runtime);
      setApiKeyDrafts((currentDrafts) => {
        const nextDrafts: Record<string, ApiKeyDraft> = {};

        result.apiKeys.forEach((apiKey) => {
          nextDrafts[apiKey.id] =
            currentDrafts[apiKey.id] ?? createApiKeyDraftFromApiKey(apiKey);
        });

        return nextDrafts;
      });
    } catch (error) {
      setApiKeysLoadError(error instanceof Error ? error.message : "Unable to load API keys.");
      setPublicApiRuntime(null);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const loadUserList = async () => {
    setUsersLoadError(null);
    setIsLoadingUsers(true);

    try {
      const nextUsers = await listUsers();

      setUsers(nextUsers);
      setUserRoleDrafts((currentDrafts) => {
        const nextDrafts: Record<string, string> = {};

        nextUsers.forEach((user) => {
          nextDrafts[user.id] = currentDrafts[user.id] ?? user.roleId ?? "";
        });

        return nextDrafts;
      });
    } catch (error) {
      setUsersLoadError(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadCollections = async (options?: { refresh?: boolean }) => {
    const requestId = collectionLoadRequestId.current + 1;
    const isRefresh = options?.refresh === true && hasLoadedCollections;

    collectionLoadRequestId.current = requestId;
    setCollectionLoadError(null);

    if (isRefresh) {
      setIsRefreshingCollections(true);
    } else {
      setIsLoadingCollections(true);
    }

    try {
      const nextCollections = await listCollectionDefinitions();

      if (collectionLoadRequestId.current !== requestId) {
        return;
      }

      setCollections(nextCollections);
      setHasLoadedCollections(true);

      if (
        selectedCollectionName &&
        !nextCollections.some(
          (collection) => collection.definition.name === selectedCollectionName,
        )
      ) {
        setSelectedCollectionName(null);
        setSelectedRecordId(null);
      }
    } catch (error) {
      if (collectionLoadRequestId.current !== requestId) {
        return;
      }

      setCollectionLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load collection definitions.",
      );
    } finally {
      if (collectionLoadRequestId.current === requestId) {
        setIsLoadingCollections(false);
        setIsRefreshingCollections(false);
      }
    }
  };

  const loadRecords = async (
    collection: StoredCollectionDefinition,
    options?: { refresh?: boolean },
  ) => {
    const requestId = recordLoadRequestId.current + 1;
    const isRefresh = options?.refresh === true && hasLoadedRecords;

    recordLoadRequestId.current = requestId;
    setRecordIssues([]);
    setRecordLoadError(null);

    if (isRefresh) {
      setIsRefreshingRecords(true);
    } else {
      setHasLoadedRecords(false);
      setIsLoadingRecords(true);
      setRecordMessage(null);
      setRecords([]);
      setSelectedRecordId(null);
      setRecordSupportedFieldNames("none");
    }

    try {
      const result = await listCollectionRecords(collection.definition.name);

      if (recordLoadRequestId.current !== requestId) {
        return;
      }

      setRecords(result.records);
      setRecordSupportedFieldNames(result.supportedFieldNames);
      setHasLoadedRecords(true);
      setSelectedRecordId((currentSelectedRecordId) =>
        currentSelectedRecordId &&
        result.records.some((record) => record.id === currentSelectedRecordId)
          ? currentSelectedRecordId
          : null,
      );
    } catch (error) {
      if (recordLoadRequestId.current !== requestId) {
        return;
      }

      if (!isRefresh) {
        setRecords([]);
        setRecordSupportedFieldNames("none");
      }
      setRecordLoadError(
        error instanceof Error ? error.message : "Unable to load collection records.",
      );
    } finally {
      if (recordLoadRequestId.current === requestId) {
        setIsLoadingRecords(false);
        setIsRefreshingRecords(false);
      }
    }
  };

  const loadMediaAssets = async (options?: { refresh?: boolean }) => {
    const requestId = mediaAssetsLoadRequestId.current + 1;
    const isRefresh = options?.refresh === true && mediaAssets.length > 0;

    mediaAssetsLoadRequestId.current = requestId;
    setMediaLoadError(null);

    if (isRefresh) {
      setIsRefreshingMediaAssets(true);
    } else {
      setIsLoadingMediaAssets(true);
    }

    try {
      const assets = await listMediaAssets();

      if (mediaAssetsLoadRequestId.current !== requestId) {
        return;
      }

      setMediaAssets(assets);
      setSelectedMediaAssetId((currentSelectedAssetId) =>
        currentSelectedAssetId && assets.some((asset) => asset.id === currentSelectedAssetId)
          ? currentSelectedAssetId
          : assets[0]?.id ?? null,
      );
    } catch (error) {
      if (mediaAssetsLoadRequestId.current !== requestId) {
        return;
      }

      setMediaLoadError(
        error instanceof Error ? error.message : "Unable to load media assets.",
      );
    } finally {
      if (mediaAssetsLoadRequestId.current === requestId) {
        setIsLoadingMediaAssets(false);
        setIsRefreshingMediaAssets(false);
      }
    }
  };

  useEffect(() => {
    if (session.isPending || setupStatus.isPending || session.data) {
      return;
    }

    if (setupStatus.data?.setupRequired) {
      window.location.replace("/setup");
      return;
    }

    window.location.replace(loginHref);
  }, [session.data, session.isPending, setupStatus.data, setupStatus.isPending]);

  useEffect(() => {
    if (!session.data) {
      setSessionAuthorization(null);
      setSessionAuthorizationError(null);
      setIsLoadingSessionAuthorization(false);
      return;
    }

    void loadSessionAuthorizationData();
  }, [session.data]);

  useEffect(() => {
    if (!session.data) {
      return;
    }

    if (!sessionAuthorization) {
      return;
    }

    if (!canViewCollections) {
      setCollections([]);
      setSelectedCollectionName(null);
      setHasLoadedCollections(false);
      setIsLoadingCollections(false);
      setIsRefreshingCollections(false);
      setCollectionLoadError(null);
      return;
    }

    void loadCollections();
  }, [canViewCollections, session.data, sessionAuthorization]);

  useEffect(() => {
    if (!session.data) {
      return;
    }

    if (!sessionAuthorization) {
      return;
    }

    if (!canViewMedia) {
      setMediaAssets([]);
      setSelectedMediaAssetId(null);
      setIsLoadingMediaAssets(false);
      setIsRefreshingMediaAssets(false);
      setMediaLoadError(null);
      return;
    }

    void loadMediaAssets();
  }, [canViewMedia, session.data, sessionAuthorization]);

  useEffect(() => {
    if (!session.data || !sessionAuthorization) {
      return;
    }

    if (!canAccessTeamAccess && !canAccessSettingsWorkspace) {
      setAvailableRoles([...datamixRolePresets]);
      setRolesLoadError(null);
      setIsLoadingRoles(false);
      setSelectedRoleId(null);
      setIsCreatingRole(false);
      return;
    }

    void loadAvailableRoles();
  }, [
    canAccessSettingsWorkspace,
    canAccessTeamAccess,
    session.data,
    sessionAuthorization,
  ]);

  useEffect(() => {
    if (!session.data || !sessionAuthorization) {
      return;
    }

    if (!canAccessSettingsWorkspace) {
      setApiKeys([]);
      setApiKeyDrafts({});
      setApiKeysLoadError(null);
      setApiKeysMessage(null);
      setApiKeySecret(null);
      setApiKeySecretMessage(null);
      setPublicApiRuntime(null);
      setIsLoadingApiKeys(false);
      return;
    }

    void loadApiKeyData();
  }, [canAccessSettingsWorkspace, session.data, sessionAuthorization]);

  useEffect(() => {
    if (!session.data || !sessionAuthorization) {
      return;
    }

    if (!canViewUsers) {
      setUsers([]);
      setUsersLoadError(null);
      setUsersMessage(null);
      setIsLoadingUsers(false);
      setUserRoleDrafts({});
      return;
    }

    void loadUserList();
  }, [canViewUsers, session.data, sessionAuthorization]);

  useEffect(() => {
    if (isCreatingRole) {
      return;
    }

    const selectedRole =
      availableRoles.find((role) => role.id === selectedRoleId) ?? availableRoles[0] ?? null;

    if (!selectedRole) {
      setSelectedRoleId(null);
      return;
    }

    if (selectedRoleId !== selectedRole.id) {
      setSelectedRoleId(selectedRole.id);
      return;
    }

    setRoleDraft(createRoleDraftFromRole(selectedRole));
  }, [availableRoles, isCreatingRole, selectedRoleId]);

  useEffect(() => {
    setInviteRoleId((currentInviteRoleId) => {
      if (availableRoles.some((role) => role.id === currentInviteRoleId)) {
        return currentInviteRoleId;
      }

      const defaultInviteRole = availableRoles.find(
        (role) => role.id === datamixDefaultRoleAssignments.invitedUser,
      );

      return defaultInviteRole?.id ?? availableRoles[0]?.id ?? datamixDefaultRoleAssignments.invitedUser;
    });
  }, [availableRoles]);

  const activeCollection = collections.find(
    (collection) => collection.definition.name === selectedCollectionName,
  );

  useEffect(() => {
    if (isLoadingCollections || isCreatingCollection || selectedCollectionName !== null) {
      return;
    }

    if (collections.length === 0) {
      return;
    }

    const firstCollection = collections[0];

    if (!firstCollection) {
      return;
    }

    setSelectedCollectionName(firstCollection.definition.name);
    setDraft(createDraftFromDefinition(firstCollection.definition));
  }, [collections, isCreatingCollection, isLoadingCollections, selectedCollectionName]);

  useEffect(() => {
    if (!activeCollection || !canViewRecords) {
      recordLoadRequestId.current += 1;
      setRecords([]);
      setSelectedRecordId(null);
      setRecordDraft({});
      setRecordIssues([]);
      setRecordLoadError(null);
      setRecordMessage(null);
      setRecordSupportedFieldNames("none");
      setHasLoadedRecords(false);
      setIsLoadingRecords(false);
      setIsRefreshingRecords(false);
      return;
    }

    const activeDefinition = activeCollection.definition;

    setRecordDraft(createGeneratedRecordFormState(activeDefinition));

    void loadRecords(activeCollection);
  }, [activeCollection, canViewRecords]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }

        return;
      }

      if (event.key === "Escape" && isCommandPaletteOpen) {
        event.preventDefault();
        closeCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCommandPaletteOpen]);

  if (
    session.isPending ||
    setupStatus.isPending ||
    (session.data && isLoadingSessionAuthorization)
  ) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">
            {session.data ? "Loading access profile" : "Checking your session"}
          </h1>
          <p className="body">
            {session.data
              ? "Datamix is resolving your current role and permissions from the API Worker."
              : "Datamix is asking the API Worker whether this browser already has a valid session."}
          </p>
        </div>
      </main>
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Auth config is incomplete</h1>
          <p className="body">{setupStatus.errorMessage}</p>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (sessionAuthorizationError || !sessionAuthorization) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Access profile is unavailable</h1>
          <p className="body">
            {sessionAuthorizationError ??
              "Datamix could not resolve the current role and permission summary."}
          </p>
        </div>
      </main>
    );
  }

  const userLabel = session.data.user.name || session.data.user.email;
  const currentSessionUserId = session.data.user.id;
  const isEditingExistingCollection =
    selectedCollectionName !== null && !isCreatingCollection;
  const canSaveCurrentCollection = isEditingExistingCollection
    ? canUpdateCollections
    : canCreateCollections;
  const hasUnsavedSchemaChanges =
    activeCollection !== undefined &&
    JSON.stringify(activeCollection.definition) !== JSON.stringify(serializeDraft(draft));
  const persistedRecordFields = activeCollection
    ? activeCollection.definition.fields.filter(isRecordCrudFieldDefinition)
    : [];
  const canRefreshCollections =
    canViewCollections &&
    Boolean(session.data) &&
    !isLoadingCollections &&
    !isRefreshingCollections;
  const canRefreshRecords =
    canViewRecords &&
    activeCollection !== undefined &&
    !isLoadingRecords &&
    !isRefreshingRecords;
  const canRefreshMediaAssets =
    canViewMedia && !isLoadingMediaAssets && !isRefreshingMediaAssets;
  const normalizedMediaSearchQuery = mediaSearchQuery.trim().toLowerCase();
  const filteredMediaAssets =
    normalizedMediaSearchQuery.length === 0
      ? mediaAssets
      : mediaAssets.filter((asset) =>
          createMediaAssetSearchText(asset).includes(normalizedMediaSearchQuery),
        );
  const selectedMediaAsset = selectedMediaAssetId
    ? mediaAssets.find((asset) => asset.id === selectedMediaAssetId) ?? null
    : null;
  const selectedFilteredMediaAsset = selectedMediaAsset
    ? filteredMediaAssets.find((asset) => asset.id === selectedMediaAsset.id) ?? null
    : null;
  const selectedMediaOriginalUrl = selectedFilteredMediaAsset
    ? createMediaObjectUrl(
        adminPublicEnv.NEXT_PUBLIC_MEDIA_ORIGIN,
        selectedFilteredMediaAsset.storageKey,
      )
    : null;
  const selectedMediaTransformUrl = selectedFilteredMediaAsset
    ? createMediaObjectUrl(
        adminPublicEnv.NEXT_PUBLIC_MEDIA_ORIGIN,
        selectedFilteredMediaAsset.storageKey,
        {
          fit: "cover",
          format: "webp",
          height: 720,
          quality: 80,
          width: 1280,
        },
      )
    : null;
  const selectedRecord = selectedRecordId
    ? records.find((record) => record.id === selectedRecordId) ?? null
    : null;
  const selectedRole = isCreatingRole
    ? null
    : availableRoles.find((role) => role.id === selectedRoleId) ?? null;
  const rolePreviewItems = availableRoles.length > 0 ? availableRoles : datamixRolePresets;
  const deferredCommandPaletteQuery = useDeferredValue(commandPaletteQuery);
  const generatedRecordPayload = activeCollection
    ? createGeneratedRecordPayload(activeCollection.definition, recordDraft)
    : null;
  const persistedRecordPayload = activeCollection
    ? createPersistedRecordPayload(activeCollection.definition, recordDraft)
    : null;
  const collectionStatusTone = collectionIssues.length > 0 ? "error" : "success";
  const recordStatusTone = recordIssues.length > 0 ? "error" : "success";
  const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;
  const isInitialRecordLoad = isLoadingRecords && !hasLoadedRecords;
  const canRefreshApiKeys =
    canAccessSettingsWorkspace &&
    !isLoadingApiKeys &&
    !isCreatingApiKey &&
    savingApiKeyId === null &&
    revokingApiKeyId === null;
  const canRefreshRoles =
    (canAccessTeamAccess || canAccessSettingsWorkspace) && !isLoadingRoles && !isSavingRole;
  const canRefreshUsers = canViewUsers && !isLoadingUsers && updatingUserRoleId === null;
  const canSaveCurrentRecord = selectedRecord
    ? canUpdateRecords
    : canCreateRecords;
  const recordStatusTitle =
    recordIssues.length > 0
      ? "Record needs attention"
      : recordMessage?.startsWith("Record created")
        ? "Record created"
        : "Record saved";

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/login");
  };

  const openCommandPalette = () => {
    setCommandPaletteQuery("");
    setActiveCommandPaletteIndex(0);
    setIsCommandPaletteOpen(true);
  };

  const closeCommandPalette = () => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery("");
    setActiveCommandPaletteIndex(0);
  };

  const handleStartNewCollection = () => {
    if (!canCreateCollections) {
      return;
    }

    setIsCreatingCollection(true);
    setSelectedCollectionName(null);
    setDraft(createEmptyCollectionDraft());
    setCollectionIssues([]);
    setCollectionMessage(null);
    setSelectedRecordId(null);
  };

  const handleEditCollection = (collection: StoredCollectionDefinition) => {
    setIsCreatingCollection(false);
    setSelectedCollectionName(collection.definition.name);
    setDraft(createDraftFromDefinition(collection.definition));
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleRefreshCollections = () => {
    if (!canRefreshCollections) {
      return;
    }

    void loadCollections({ refresh: true });
  };

  const handleRefreshRecords = () => {
    if (!activeCollection || !canRefreshRecords) {
      return;
    }

    void loadRecords(activeCollection, { refresh: true });
  };

  const handleRefreshMediaAssets = () => {
    if (!canRefreshMediaAssets) {
      return;
    }

    void loadMediaAssets({ refresh: true });
  };

  const handleSelectMediaAsset = (assetId: string) => {
    setSelectedMediaAssetId(assetId);
    setMediaClipboardMessage(null);
  };

  const handleCopyMediaStorageKey = async () => {
    if (!selectedMediaAsset) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setMediaClipboardMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedMediaAsset.storageKey);
      setMediaClipboardMessage("Storage key copied for reuse in image fields.");
    } catch {
      setMediaClipboardMessage("Clipboard access failed. Copy the storage key manually.");
    }
  };

  const updateDraft = (partial: Partial<CollectionDraft>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...partial,
    }));
  };

  const updateField = (
    fieldKey: string,
    updater: (field: CollectionFieldDraft) => CollectionFieldDraft,
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.map((field) =>
        field.key === fieldKey ? updater(field) : field,
      ),
    }));
  };

  const handleAddField = () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: [...currentDraft.fields, createFieldDraft(newFieldType)],
    }));
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleRemoveField = (fieldKey: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.filter((field) => field.key !== fieldKey),
    }));
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleMoveField = (fieldKey: string, direction: -1 | 1) => {
    setDraft((currentDraft) => {
      const fieldIndex = currentDraft.fields.findIndex((field) => field.key === fieldKey);

      if (fieldIndex === -1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        fields: moveItem(currentDraft.fields, fieldIndex, direction),
      };
    });
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleFieldTypeChange = (fieldKey: string, type: DatamixFieldType) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.map((field) =>
        field.key === fieldKey
          ? {
              ...createFieldDraft(type),
              description: field.description,
              key: field.key,
              label: field.label,
              name: field.name,
              required: field.required,
            }
          : field,
      ),
    }));
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleSaveCollection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveCurrentCollection) {
      return;
    }

    setIsSavingCollection(true);
    setCollectionIssues([]);
    setCollectionMessage(null);

    try {
      const result = await saveCollectionDefinition(serializeDraft(draft));
      const nextStoredCollection = result.collection;

      setCollections((currentCollections) => {
        const filteredCollections = currentCollections.filter(
          (collection) => collection.definition.name !== nextStoredCollection.definition.name,
        );

        return [...filteredCollections, nextStoredCollection].sort((left, right) =>
          left.definition.label.localeCompare(right.definition.label),
        );
      });
      setIsCreatingCollection(false);
      setSelectedCollectionName(nextStoredCollection.definition.name);
      setDraft(createDraftFromDefinition(nextStoredCollection.definition));
      setCollectionMessage(`${result.message} ${formatPlanSummary(result.plan)}`);
      setCollectionLoadError(null);
    } catch (error) {
      if (error instanceof CollectionDefinitionRequestError) {
        setCollectionIssues(error.issues ?? []);
        setCollectionMessage(error.message);
      } else {
        setCollectionMessage(
          error instanceof Error ? error.message : "Unable to save collection definition.",
        );
      }
    } finally {
      setIsSavingCollection(false);
    }
  };

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canInviteUsers) {
      return;
    }

    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(true);

    try {
      const message = await sendInvite(
        {
          email: inviteEmail,
          ...(inviteName ? { name: inviteName } : {}),
          roleId: inviteRoleId,
        },
      );

      setInviteMessage(message);
      setInviteEmail("");
      setInviteName("");

      if (canViewUsers) {
        await loadUserList();
      }
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRefreshRoles = () => {
    if (!canRefreshRoles) {
      return;
    }

    void loadAvailableRoles(
      selectedRoleId ? { preferredRoleId: selectedRoleId } : undefined,
    );
  };

  const handleRefreshApiKeys = () => {
    if (!canRefreshApiKeys) {
      return;
    }

    void loadApiKeyData();
  };

  const handleRefreshUsers = () => {
    if (!canRefreshUsers) {
      return;
    }

    void loadUserList();
  };

  const handleSelectRole = (role: DatamixRoleDefinition) => {
    setIsCreatingRole(false);
    setSelectedRoleId(role.id);
    setRoleDraft(createRoleDraftFromRole(role));
    setRoleIssues([]);
    setRolesMessage(null);
  };

  const handleApiKeyDraftFieldChange = (
    apiKeyId: string,
    field: keyof ApiKeyDraft,
    value: string,
  ) => {
    setApiKeyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [apiKeyId]: {
        accessLevel:
          field === "accessLevel"
            ? (value as DatamixApiKeyAccessLevel)
            : currentDrafts[apiKeyId]?.accessLevel ?? "read",
        label:
          field === "label"
            ? value
            : currentDrafts[apiKeyId]?.label ?? "",
      },
    }));
    setApiKeysMessage(null);
  };

  const handleCreateApiKeyDraftFieldChange = (
    field: keyof ApiKeyDraft,
    value: string,
  ) => {
    setApiKeyDraft((currentDraft) => ({
      ...currentDraft,
      [field]: field === "accessLevel" ? (value as DatamixApiKeyAccessLevel) : value,
    }));
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);
  };

  const handleStartNewRole = (sourceRole?: DatamixRoleDefinition) => {
    if (!canUpdateSettings) {
      return;
    }

    setIsCreatingRole(true);
    setRoleDraft(createEmptyRoleDraft(sourceRole));
    setRoleIssues([]);
    setRolesMessage(null);
  };

  const handleRoleDraftFieldChange = (
    field: "description" | "id" | "label",
    value: string,
  ) => {
    setRoleDraft((currentRoleDraft) => {
      if (field !== "label") {
        return {
          ...currentRoleDraft,
          [field]: value,
        };
      }

      const currentSuggestion = createRoleIdSuggestion(currentRoleDraft.label);
      const nextSuggestion = createRoleIdSuggestion(value);
      const shouldRefreshRoleId =
        currentRoleDraft.id.trim().length === 0 || currentRoleDraft.id === currentSuggestion;

      return {
        ...currentRoleDraft,
        id: shouldRefreshRoleId ? nextSuggestion : currentRoleDraft.id,
        label: value,
      };
    });
    setRoleIssues([]);
    setRolesMessage(null);
  };

  const handleToggleRolePermission = (permission: DatamixPermissionKey) => {
    setRoleDraft((currentRoleDraft) => {
      const nextPermissions = currentRoleDraft.permissions.includes(permission)
        ? currentRoleDraft.permissions.filter((currentPermission) => currentPermission !== permission)
        : [...currentRoleDraft.permissions, permission];

      return {
        ...currentRoleDraft,
        permissions: nextPermissions,
      };
    });
    setRoleIssues([]);
    setRolesMessage(null);
  };

  const handleSaveRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUpdateSettings) {
      return;
    }

    setIsSavingRole(true);
    setRoleIssues([]);
    setRolesMessage(null);

    try {
      const result = await saveRole({
        description: roleDraft.description,
        id: roleDraft.id,
        label: roleDraft.label,
        permissions: [...roleDraft.permissions],
      });

      setIsCreatingRole(false);
      setSelectedRoleId(result.role.id);
      setRoleDraft(createRoleDraftFromRole(result.role));
      setRolesMessage(result.message);
      await loadAvailableRoles({ preferredRoleId: result.role.id });

      if (sessionRole?.id === result.role.id) {
        await loadSessionAuthorizationData();
      }
    } catch (error) {
      if (error instanceof RoleRequestError) {
        setRoleIssues(error.issues ?? []);
        setRolesMessage(error.message);
      } else {
        setRolesMessage(error instanceof Error ? error.message : "Unable to save role.");
      }
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleCreateApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUpdateSettings) {
      return;
    }

    setIsCreatingApiKey(true);
    setApiKeysLoadError(null);
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);

    try {
      const result = await createApiKey(apiKeyDraft);

      setApiKeys((currentApiKeys) => [result.apiKey, ...currentApiKeys]);
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
      }));
      setApiKeyDraft(createEmptyApiKeyDraft());
      setApiKeysMessage(result.message);
      setApiKeySecret(result.secret);
    } catch (error) {
      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to create API key.",
      );
    } finally {
      setIsCreatingApiKey(false);
    }
  };

  const handleUpdateApiKey = async (apiKey: DatamixApiKeySummary) => {
    const nextDraft = apiKeyDrafts[apiKey.id];

    if (
      !canUpdateSettings ||
      !nextDraft ||
      apiKey.revokedAt ||
      (nextDraft.label === apiKey.label && nextDraft.accessLevel === apiKey.accessLevel)
    ) {
      return;
    }

    setSavingApiKeyId(apiKey.id);
    setApiKeysLoadError(null);
    setApiKeysMessage(null);

    try {
      const result = await updateApiKey(apiKey.id, nextDraft);

      setApiKeys((currentApiKeys) =>
        currentApiKeys.map((currentApiKey) =>
          currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
        ),
      );
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
      }));
      setApiKeysMessage(result.message);
    } catch (error) {
      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to update API key.",
      );
    } finally {
      setSavingApiKeyId(null);
    }
  };

  const handleRevokeApiKey = async (apiKey: DatamixApiKeySummary) => {
    if (!canUpdateSettings || apiKey.revokedAt) {
      return;
    }

    setRevokingApiKeyId(apiKey.id);
    setApiKeysLoadError(null);
    setApiKeysMessage(null);

    try {
      const result = await revokeApiKey(apiKey.id);

      setApiKeys((currentApiKeys) =>
        currentApiKeys.map((currentApiKey) =>
          currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
        ),
      );
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
      }));
      setApiKeysMessage(result.message);
    } catch (error) {
      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to revoke API key.",
      );
    } finally {
      setRevokingApiKeyId(null);
    }
  };

  const handleCopyApiKeySecret = async () => {
    if (!apiKeySecret) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setApiKeySecretMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKeySecret);
      setApiKeySecretMessage("API key secret copied. This is the only time Datamix will show it.");
    } catch {
      setApiKeySecretMessage("Clipboard access failed. Copy the API key secret manually.");
    }
  };

  const handleUserRoleDraftChange = (userId: string, nextRoleId: string) => {
    setUserRoleDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: nextRoleId,
    }));
    setUsersMessage(null);
  };

  const handleUpdateUserRole = async (user: DatamixUserSummary) => {
    const nextRoleId = userRoleDrafts[user.id];

    if (!canUpdateUsers || !nextRoleId || nextRoleId === user.roleId) {
      return;
    }

    setUpdatingUserRoleId(user.id);
    setUsersMessage(null);
    setUsersLoadError(null);

    try {
      const result = await updateUserRole(user.id, nextRoleId);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === result.user.id ? result.user : currentUser,
        ),
      );
      setUserRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.user.id]: result.user.roleId ?? "",
      }));
      setUsersMessage(
        `Updated ${result.user.name || result.user.email} to ${result.role?.label ?? result.user.roleId ?? "the selected role"}.`,
      );

      if (session.data?.user.id === result.user.id) {
        await loadSessionAuthorizationData();
      }
    } catch (error) {
      setUsersLoadError(
        error instanceof Error ? error.message : "Unable to update the selected user role.",
      );
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  const handleMediaUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUploadMedia) {
      return;
    }

    if (!selectedMediaFile) {
      setMediaLoadError("Choose a file before uploading.");
      setMediaMessage(null);
      return;
    }

    setIsUploadingMedia(true);
    setMediaLoadError(null);
    setMediaMessage(null);

    try {
      const result = await uploadMediaAsset(selectedMediaFile);

      setMediaAssets((currentAssets) => [result.asset, ...currentAssets]);
      setSelectedMediaAssetId(result.asset.id);
      setMediaMessage(
        `${result.message} Saved ${result.asset.fileName} to ${result.asset.storageKey}.`,
      );
      setMediaClipboardMessage(null);
      setSelectedMediaFile(null);

      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = "";
      }

      void loadMediaAssets({ refresh: true });
    } catch (error) {
      setMediaLoadError(
        error instanceof MediaAssetRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to upload media asset.",
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRecordFieldChange = (
    fieldName: string,
    nextValue: GeneratedRecordFormValue,
  ) => {
    setRecordDraft((currentRecordDraft) => ({
      ...currentRecordDraft,
      [fieldName]: nextValue,
    }));
    setRecordIssues([]);
    setRecordMessage(null);
  };

  const handleResetGeneratedRecord = () => {
    if (!activeCollection) {
      return;
    }

    if (selectedRecord) {
      setRecordDraft(
        createGeneratedRecordFormStateFromRecord(activeCollection.definition, selectedRecord),
      );
    } else {
      setRecordDraft(createGeneratedRecordFormState(activeCollection.definition));
    }

    setRecordIssues([]);
    setRecordMessage(null);
  };

  const handleOpenCollectionRecord = (
    collection: StoredCollectionDefinition,
    record: StoredCollectionRecord,
  ) => {
    setIsCreatingCollection(false);
    setSelectedCollectionName(collection.definition.name);
    setDraft(createDraftFromDefinition(collection.definition));
    setCollectionIssues([]);
    setCollectionMessage(null);
    setSelectedRecordId(record.id);
    setRecordDraft(createGeneratedRecordFormStateFromRecord(collection.definition, record));
    setRecordIssues([]);
    setRecordMessage(null);
    jumpToSection(recordEditorSectionId);
  };

  const handleStartNewRecord = () => {
    if (!activeCollection || !canCreateRecords) {
      return;
    }

    setSelectedRecordId(null);
    setRecordDraft(createGeneratedRecordFormState(activeCollection.definition));
    setRecordIssues([]);
    setRecordMessage(null);
    jumpToSection(recordEditorSectionId);
  };

  const handleEditRecord = (record: StoredCollectionRecord) => {
    if (!activeCollection || !canViewRecords) {
      return;
    }

    handleOpenCollectionRecord(activeCollection, record);
  };

  const handleGeneratedRecordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeCollection || !canSaveCurrentRecord) {
      return;
    }

    setIsSavingRecord(true);
    setRecordIssues([]);
    setRecordMessage(null);

    try {
      const result = selectedRecordId
        ? await updateCollectionRecord(
            activeCollection.definition.name,
            selectedRecordId,
            persistedRecordPayload ?? {},
          )
        : await createCollectionRecord(
            activeCollection.definition.name,
            persistedRecordPayload ?? {},
          );

      setRecords((currentRecords) => upsertRecord(currentRecords, result.record));
      setSelectedRecordId(result.record.id);
      setRecordSupportedFieldNames(result.supportedFieldNames);
      setRecordDraft(
        createGeneratedRecordFormStateFromRecord(activeCollection.definition, result.record),
      );
      setRecordMessage(result.message);
      setRecordLoadError(null);
    } catch (error) {
      if (error instanceof CollectionRecordRequestError) {
        setRecordIssues(error.issues ?? []);
        setRecordMessage(error.message);
      } else {
        setRecordMessage(error instanceof Error ? error.message : "Unable to save record.");
      }
    } finally {
      setIsSavingRecord(false);
    }
  };

  const commandPaletteItems: CommandPaletteItem[] = [
    {
      group: "admin",
      id: "admin-overview",
      keywords: ["dashboard", "home", "overview"],
      onSelect: () => {
        jumpToSection(overviewSectionId);
      },
      subtitle: "Jump back to the admin overview cards.",
      title: "Open overview",
    },
    {
      group: "admin",
      id: "admin-schema",
      keywords: ["schema", "builder", "fields", "model"],
      onSelect: () => {
        jumpToSection(collectionBuilderSectionId);
      },
      subtitle: activeCollection
        ? `Open the ${activeCollection.definition.label} schema builder.`
        : "Open the collection schema builder.",
      title: activeCollection ? `Open ${activeCollection.definition.label} schema` : "Open schema",
    },
  ];

  if (canCreateCollections) {
    commandPaletteItems.push({
      group: "collections",
      id: "collections-create",
      keywords: ["new", "create", "content model"],
      onSelect: handleStartNewCollection,
      subtitle: "Start a fresh collection definition from the builder.",
      title: "Create new collection",
    });
  }

  if (canViewCollections) {
    collections.forEach((collection) => {
      commandPaletteItems.push({
        group: "collections",
        id: `collection-${collection.definition.name}`,
        keywords: [
          collection.definition.name,
          collection.definition.description ?? "",
          "schema",
          "collection",
        ],
        onSelect: () => {
          handleEditCollection(collection);
          jumpToSection(collectionBuilderSectionId);
        },
        subtitle: `${collection.definition.fields.length} field${
          collection.definition.fields.length === 1 ? "" : "s"
        } • open this collection workspace`,
        title: collection.definition.label,
      });

      if (canAccessRecordsWorkspace) {
        commandPaletteItems.push({
          group: "collections",
          id: `collection-records-${collection.definition.name}`,
          keywords: [collection.definition.name, "records", "entries", "content"],
          onSelect: () => {
            handleEditCollection(collection);
            jumpToSection(recordEditorSectionId);
          },
          subtitle: `Open the ${collection.definition.label} records workspace.`,
          title: `Open ${collection.definition.label} records`,
        });
      }
    });
  }

  if (activeCollection && canAccessRecordsWorkspace) {
    commandPaletteItems.push({
      group: "records",
      id: "records-open",
      keywords: [activeCollection.definition.name, "records", "entries", "editor"],
      onSelect: () => {
        jumpToSection(recordEditorSectionId);
      },
      subtitle: `Open the generated record editor for ${activeCollection.definition.label}.`,
      title: `Open ${activeCollection.definition.label} records`,
    });
  }

  if (activeCollection && canCreateRecords) {
    commandPaletteItems.push({
      group: "records",
      id: "records-create",
      keywords: [activeCollection.definition.name, "new", "create", "record"],
      onSelect: handleStartNewRecord,
      subtitle: `Start a new ${activeCollection.definition.label.toLowerCase()} record.`,
      title: `Create new ${activeCollection.definition.label} record`,
    });
  }

  if (activeCollection && canViewRecords) {
    records.forEach((record) => {
      commandPaletteItems.push({
        group: "records",
        id: `record-${record.id}`,
        keywords: [record.id, activeCollection.definition.name, "record", "edit"],
        onSelect: () => {
          handleOpenCollectionRecord(activeCollection, record);
        },
        subtitle: `${activeCollection.definition.label} • updated ${formatRecordTimestamp(
          record.updatedAt,
        )}`,
        title: summarizeRecord(activeCollection.definition, record),
      });
    });
  }

  if (canRefreshCollections) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-collections",
      keywords: ["reload", "refresh", "collections"],
      onSelect: handleRefreshCollections,
      subtitle: "Fetch the latest saved collection definitions from the API Worker.",
      title: "Refresh collections",
    });
  }

  if (canRefreshRecords) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-records",
      keywords: ["reload", "refresh", "records"],
      onSelect: handleRefreshRecords,
      subtitle: "Reload the current saved record list.",
      title: "Refresh records",
    });
  }

  if (canAccessTeamAccess) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-team-access",
      keywords: ["invite", "users", "roles", "team"],
      onSelect: () => {
        jumpToSection("invite");
      },
      subtitle: "Jump to user invites, user roles, and role previews.",
      title: "Open team access",
    });
  }

  if (canAccessMediaWorkspace) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-media",
      keywords: ["media", "assets", "upload", "library"],
      onSelect: () => {
        jumpToSection("media");
      },
      subtitle: "Open the shared media upload and library workspace.",
      title: "Open media library",
    });
  }

  if (canAccessSettingsWorkspace) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-settings",
      keywords: ["settings", "api keys", "permissions", "oauth"],
      onSelect: () => {
        jumpToSection("settings");
      },
      subtitle: "Jump to runtime posture, OAuth status, API keys, and permissions.",
      title: "Open settings",
    });
  }

  if (canRefreshMediaAssets) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-media",
      keywords: ["reload", "refresh", "media", "assets"],
      onSelect: handleRefreshMediaAssets,
      subtitle: "Reload the shared media asset list.",
      title: "Refresh media assets",
    });
  }

  if (canRefreshUsers) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-users",
      keywords: ["reload", "refresh", "users"],
      onSelect: handleRefreshUsers,
      subtitle: "Reload the current Datamix user list.",
      title: "Refresh users",
    });
  }

  if (canRefreshRoles) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-roles",
      keywords: ["reload", "refresh", "roles", "permissions"],
      onSelect: handleRefreshRoles,
      subtitle: "Reload built-in and custom role definitions.",
      title: "Refresh roles",
    });
  }

  if (canRefreshApiKeys) {
    commandPaletteItems.push({
      group: "admin",
      id: "admin-refresh-api-keys",
      keywords: ["reload", "refresh", "api", "keys"],
      onSelect: handleRefreshApiKeys,
      subtitle: "Reload managed API keys and public API runtime posture.",
      title: "Refresh API keys",
    });
  }

  commandPaletteItems.push(
    {
      group: "admin",
      id: "admin-api-health",
      keywords: ["health", "api", "runtime"],
      onSelect: () => {
        window.open(apiHealthHref, "_blank", "noopener,noreferrer");
      },
      subtitle: "Open the API health endpoint in a new tab.",
      title: "Check API health",
    },
    {
      group: "admin",
      id: "admin-sign-out",
      keywords: ["logout", "session", "account"],
      onSelect: () => {
        void handleSignOut();
      },
      subtitle: "End the current admin session and return to login.",
      title: "Sign out",
    },
  );

  const filteredCommandPaletteItems = filterCommandPaletteItems(
    commandPaletteItems,
    deferredCommandPaletteQuery,
  );

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      return;
    }

    setActiveCommandPaletteIndex((currentIndex) => {
      if (filteredCommandPaletteItems.length === 0) {
        return 0;
      }

      if (currentIndex < filteredCommandPaletteItems.length) {
        return currentIndex;
      }

      return filteredCommandPaletteItems.length - 1;
    });
  }, [filteredCommandPaletteItems.length, isCommandPaletteOpen]);

  const handleMoveCommandPaletteSelection = (direction: -1 | 1) => {
    if (filteredCommandPaletteItems.length === 0) {
      return;
    }

    setActiveCommandPaletteIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return filteredCommandPaletteItems.length - 1;
      }

      if (nextIndex >= filteredCommandPaletteItems.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const handleSelectCommandPaletteIndex = (index: number) => {
    const selectedItem = filteredCommandPaletteItems[index];

    if (!selectedItem) {
      return;
    }

    closeCommandPalette();
    selectedItem.onSelect();
  };

  const handleSelectActiveCommandPaletteItem = () => {
    handleSelectCommandPaletteIndex(activeCommandPaletteIndex);
  };

  return (
    <main className="admin-shell-page">
      {isCommandPaletteOpen ? (
        <CommandPaletteDialog
          activeIndex={activeCommandPaletteIndex}
          items={filteredCommandPaletteItems}
          onClose={closeCommandPalette}
          onMoveActive={handleMoveCommandPaletteSelection}
          onQueryChange={setCommandPaletteQuery}
          onSelectActive={handleSelectActiveCommandPaletteItem}
          onSelectItem={handleSelectCommandPaletteIndex}
          query={commandPaletteQuery}
        />
      ) : null}

      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-brand">
            <p className="eyebrow">Datamix admin</p>
            <h1 className="admin-brand-title">Collections</h1>
            <p className="admin-brand-copy">
              Collection-first workspace for defining models, editing records, and moving
              through content without leaving the browser.
            </p>
          </div>

          <section className="admin-sidebar-card">
            <p className="admin-sidebar-heading">Current session</p>
            <p className="admin-sidebar-user">{userLabel}</p>
            <p className="admin-sidebar-copy">{session.data.user.email}</p>
            <div className="status-row">
              <span className="status-pill">Setup complete</span>
              {sessionRole ? <span className="status-pill">{sessionRole.label}</span> : null}
              <span className="status-pill">Collection builder live</span>
              <span className="status-pill status-pill-muted">
                {adminPublicEnv.NEXT_PUBLIC_APP_ENV}
              </span>
            </div>
          </section>

          <section className="admin-sidebar-card">
            <div className="section-row">
              <p className="admin-sidebar-heading">Collection list</p>
              <div className="actions actions-compact">
                <button
                  className="mini-button"
                  disabled={!canRefreshCollections}
                  onClick={handleRefreshCollections}
                  type="button"
                >
                  {isRefreshingCollections ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="mini-button"
                  disabled={!canCreateCollections}
                  onClick={handleStartNewCollection}
                  type="button"
                >
                  New
                </button>
              </div>
            </div>
            <div className="mini-list">
              {!canViewCollections ? (
                <FlowStateBox
                  body={`Your ${sessionRole?.label ?? "current"} role cannot view collection schemas yet.`}
                  compact
                  title="Collection access is restricted"
                  tone="warning"
                />
              ) : isInitialCollectionLoad ? (
                <FlowStateBox
                  body="Datamix is loading your saved collection definitions from the API Worker."
                  compact
                  title="Loading collections"
                />
              ) : collectionLoadError && collections.length === 0 ? (
                <FlowStateBox
                  actionLabel="Try again"
                  body={collectionLoadError}
                  compact
                  onAction={handleRefreshCollections}
                  title="Collection list is unavailable"
                  tone="error"
                />
              ) : collections.length === 0 ? (
                <FlowStateBox
                  actionLabel="Start a collection"
                  body="No saved collections yet. Start with a small model and add fields as the shape becomes clearer."
                  compact
                  onAction={handleStartNewCollection}
                  title="No collections saved yet"
                />
              ) : (
                <>
                  {collections.map((collection) => (
                    <button
                      className={
                        collection.definition.name === selectedCollectionName
                          ? "mini-list-item is-selected mini-list-item-stacked"
                          : "mini-list-item mini-list-item-stacked"
                      }
                      key={collection.definition.name}
                      onClick={() => handleEditCollection(collection)}
                      type="button"
                    >
                      <div className="mini-list-content">
                        <span>{collection.definition.label}</span>
                        <small>
                          {formatCollectionSummary(
                            collection,
                            collection.definition.name === selectedCollectionName
                              ? { recordCount: records.length }
                              : undefined,
                          )}
                        </small>
                      </div>
                      <small>{collection.definition.name}</small>
                    </button>
                  ))}
                  {isRefreshingCollections ? (
                    <p className="helper-text">Refreshing the saved collection list...</p>
                  ) : null}
                  {collectionLoadError ? (
                    <FlowStateBox
                      actionLabel="Retry refresh"
                      body={`${collectionLoadError} Showing the last collection list that loaded successfully.`}
                      compact
                      onAction={handleRefreshCollections}
                      title="Collection refresh did not finish"
                      tone="error"
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="admin-sidebar-card">
            <div className="section-row">
              <div>
                <p className="admin-sidebar-heading">Collection workspace</p>
                <p className="admin-sidebar-copy">
                  {activeCollection
                    ? activeCollection.definition.label
                    : "Select a collection to center the workspace on its schema and records."}
                </p>
              </div>
              {activeCollection ? (
                <div className="status-row status-row-compact">
                  <span className="status-pill">{records.length} records</span>
                  {isRefreshingRecords ? (
                    <span className="status-pill status-pill-muted">Refreshing</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {activeCollection ? (
              <div className="workspace-actions">
	                <button
	                  className="admin-nav-item"
	                  disabled={!canAccessCollectionBuilder}
	                  onClick={() => jumpToSection(collectionBuilderSectionId)}
	                  type="button"
	                >
                  <div>
                    <p className="admin-nav-label">Schema</p>
                    <p className="admin-nav-copy">
                      Edit fields, order, and collection details.
                    </p>
                  </div>
                  <span className="status-pill">Model</span>
                </button>

                <button
                  className="admin-nav-item"
                  disabled={!canAccessRecordsWorkspace}
                  onClick={() => jumpToSection(recordEditorSectionId)}
                  type="button"
                >
                  <div>
                    <p className="admin-nav-label">Records</p>
                    <p className="admin-nav-copy">
                      Create and edit records from the saved schema.
                    </p>
                  </div>
                  <span className="status-pill">Content</span>
                </button>
              </div>
            ) : (
              <FlowStateBox
                actionLabel="Start a collection"
                body="Pick a collection from the list above or start a new one."
                compact
                onAction={handleStartNewCollection}
                title="No collection selected"
              />
            )}
          </section>

          <section className="admin-sidebar-card">
            <div className="section-row">
              <p className="admin-sidebar-heading">Saved records</p>
              {activeCollection ? (
                <div className="actions actions-compact">
	                  <button
	                    className="mini-button"
	                    disabled={!canRefreshRecords}
	                    onClick={handleRefreshRecords}
	                    type="button"
	                  >
	                    {isRefreshingRecords ? "Refreshing..." : "Refresh"}
	                  </button>
	                  <button
	                    className="mini-button"
	                    disabled={!canCreateRecords}
	                    onClick={handleStartNewRecord}
	                    type="button"
	                  >
	                    New
	                  </button>
                </div>
              ) : null}
            </div>
            <div className="mini-list">
              {!activeCollection ? (
                <FlowStateBox
                  body="Records appear here once a collection is selected."
                  compact
                  title="No collection selected"
                />
              ) : !canViewRecords ? (
                <FlowStateBox
                  actionLabel={canAccessRecordsWorkspace ? "Open editor" : undefined}
                  body={
                    canCreateRecords
                      ? "This role can create records, but it cannot browse the saved record list."
                      : `Your ${sessionRole?.label ?? "current"} role cannot browse saved records.`
                  }
                  compact
                  onAction={
                    canAccessRecordsWorkspace
                      ? () => jumpToSection(recordEditorSectionId)
                      : undefined
                  }
                  title="Record list is restricted"
                  tone="warning"
                />
              ) : isInitialRecordLoad ? (
                <FlowStateBox
                  body={`Loading saved ${activeCollection.definition.label.toLowerCase()} records from the protected API route.`}
                  compact
                  title="Loading records"
                />
              ) : recordLoadError && records.length === 0 ? (
                <FlowStateBox
                  actionLabel="Try again"
                  body={recordLoadError}
                  compact
                  onAction={handleRefreshRecords}
                  title="Record list is unavailable"
                  tone="error"
                />
              ) : records.length === 0 ? (
                <FlowStateBox
                  actionLabel="Create first record"
                  body={`No records yet for ${activeCollection.definition.label}. Start with a first entry to exercise the generated editor end to end.`}
                  compact
                  onAction={handleStartNewRecord}
                  title="No records saved yet"
                />
              ) : (
                <>
                  {records.map((record) => (
                    <button
                      className={
                        record.id === selectedRecordId
                          ? "mini-list-item is-selected mini-list-item-stacked"
                          : "mini-list-item mini-list-item-stacked"
                      }
                      key={record.id}
                      onClick={() => handleEditRecord(record)}
                      type="button"
                    >
                      <div className="mini-list-content">
                        <span>{summarizeRecord(activeCollection.definition, record)}</span>
                        <small>{formatRecordTimestamp(record.updatedAt)}</small>
                      </div>
                      <small>{record.id.slice(0, 8)}</small>
                    </button>
                  ))}
                  {isRefreshingRecords ? (
                    <p className="helper-text">
                      Refreshing {activeCollection.definition.label.toLowerCase()} records...
                    </p>
                  ) : null}
                  {recordLoadError ? (
                    <FlowStateBox
                      actionLabel="Retry refresh"
                      body={`${recordLoadError} Showing the last record list that loaded successfully.`}
                      compact
                      onAction={handleRefreshRecords}
                      title="Record refresh did not finish"
                      tone="error"
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="admin-sidebar-card">
            <p className="admin-sidebar-heading">Administration</p>
            <div className="workspace-actions">
              {adminUtilityItems.map((item) => {
                return (
                  <button
                    className="admin-nav-item"
                    disabled={
                      item.id === "invite"
                        ? !canAccessTeamAccess
                        : item.id === "media"
                          ? !canAccessMediaWorkspace
                          : item.id === "settings"
                            ? !canAccessSettingsWorkspace
                            : false
                    }
                    key={item.id}
                    onClick={() => jumpToSection(item.id)}
                    type="button"
                  >
                    <div>
                      <p className="admin-nav-label">{item.label}</p>
                      <p className="admin-nav-copy">{item.description}</p>
                    </div>
                    <span className="status-pill">
                      {item.id === "invite" && !canAccessTeamAccess
                        ? "Restricted"
                        : item.id === "media" && !canAccessMediaWorkspace
                          ? "Restricted"
                          : item.id === "settings" && !canAccessSettingsWorkspace
                            ? "Restricted"
                            : "Ready"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">Collection-first shell</p>
              <h2 className="admin-page-title">
                {activeCollection
                  ? activeCollection.definition.label
                  : "Choose a collection to begin"}
              </h2>
              <p className="admin-page-copy">
                {activeCollection
                  ? "Move between schema and records from one collection workspace. The saved schema defines the editing surface, and the record list stays one click away."
                  : "Collections now anchor the admin experience. Start a new collection or pick an existing one to open its schema and records."}
              </p>
              {sessionRole ? (
                <p className="helper-text">
                  Signed in as <strong>{sessionRole.label}</strong>. API middleware and the
                  admin shell now read from the same shared permission model.
                </p>
              ) : null}
            </div>

            <div className="actions">
              <button
                className="button button-secondary"
                onClick={openCommandPalette}
                type="button"
              >
                Command palette
                <span className="button-shortcut">Cmd+K</span>
              </button>
              <button
                className="button button-secondary"
                disabled={!canAccessCollectionBuilder}
                onClick={() => jumpToSection(collectionBuilderSectionId)}
                type="button"
              >
                Open schema
              </button>
              <button
                className="button button-secondary"
                disabled={!activeCollection || !canAccessRecordsWorkspace}
                onClick={() => jumpToSection(recordEditorSectionId)}
                type="button"
              >
                Open records
              </button>
              {activeCollection ? (
                <button
                  className="button button-secondary"
                  disabled={isInitialRecordLoad || !canCreateRecords}
                  onClick={handleStartNewRecord}
                  type="button"
                >
                  New record
                </button>
              ) : (
                <button
                  className="button button-secondary"
                  disabled={!canCreateCollections}
                  onClick={handleStartNewCollection}
                  type="button"
                >
                  New collection
                </button>
              )}
              <a
                className="button button-secondary"
                href={apiHealthHref}
                rel="noreferrer"
                target="_blank"
              >
                Check API health
              </a>
              <button className="button" onClick={handleSignOut} type="button">
                Sign out
              </button>
            </div>
          </header>

          <section className="admin-grid" id={overviewSectionId}>
            <article className="admin-card admin-card-hero">
              <p className="card-eyebrow">Collection workspace</p>
              <h3 className="card-title">
                {activeCollection
                  ? `${activeCollection.definition.label} stays at the center`
                  : "Collections now drive the shell"}
              </h3>
              <p className="card-copy">
                {activeCollection
                  ? `Use the sidebar or the command palette to switch between ${activeCollection.definition.label} records, schema changes, and admin actions without losing the collection context.`
                  : "The sidebar now prioritizes collections first, and Cmd+K gives you a fast path into collections, records, and admin actions."}
              </p>
              <div className="status-row">
                <span className="status-pill">Authenticated</span>
                <span className="status-pill">Schema validation live</span>
                <span className="status-pill">D1 planning live</span>
                <span className="status-pill">Generated record editor live</span>
                <span className="status-pill">Collection navigation live</span>
                <span className="status-pill">Command palette live</span>
              </div>
            </article>

            <article className="admin-card" id="collections">
              <p className="card-eyebrow">Active focus</p>
              <h3 className="card-title">
                {activeCollection
                  ? `${activeCollection.definition.fields.length} field${activeCollection.definition.fields.length === 1 ? "" : "s"} • ${records.length} record${records.length === 1 ? "" : "s"}`
                  : collections.length === 0
                    ? "No collections saved yet"
                    : `${collections.length} collection${collections.length === 1 ? "" : "s"} saved`}
              </h3>
              <p className="card-copy">
                {activeCollection
                  ? `Currently centered on ${activeCollection.definition.label}. Open schema to adjust the model or open records to work directly with saved content.`
                  : collections.length === 0
                    ? "Start with a narrow content model and iterate. Additive field changes are the smoothest first path."
                    : "Pick a collection from the sidebar to open its workspace, or start a fresh one to shape another content type."}
              </p>
              <div className="actions">
                <button
                  className="button button-secondary"
                  disabled={!canCreateCollections}
                  onClick={handleStartNewCollection}
                  type="button"
                >
                  New collection
                </button>
                {activeCollection ? (
                  <button
                    className="button button-secondary"
                    disabled={!canAccessRecordsWorkspace}
                    onClick={() => jumpToSection(recordEditorSectionId)}
                    type="button"
                  >
                    Open records
                  </button>
                ) : (
                  <button
                    className="button button-secondary"
                    disabled={!canAccessTeamAccess}
                    onClick={() => jumpToSection("invite")}
                    type="button"
                  >
                    Invite teammate
                  </button>
                )}
              </div>
            </article>
          </section>

          <section className="admin-card admin-card-wide" id="collections-builder">
            <div className="section-row">
              <div>
                <p className="card-eyebrow">Collection builder</p>
                <h3 className="card-title">
                  {isEditingExistingCollection && activeCollection
                    ? `Editing ${activeCollection.definition.label}`
                    : "Create a new collection"}
                </h3>
                <p className="card-copy">
                  Keep names stable and human-readable. The field order here becomes the
                  generated editing order for records.
                </p>
              </div>
              <div className="actions">
                <button
                  className="button button-secondary"
                  disabled={!canCreateCollections}
                  onClick={handleStartNewCollection}
                  type="button"
                >
                  Reset draft
                </button>
              </div>
            </div>

            {!canAccessCollectionBuilder ? (
              <FlowStateBox
                body={`Your ${sessionRole?.label ?? "current"} role cannot open the collection builder.`}
                title="Collection builder is restricted"
                tone="warning"
              />
            ) : null}

            <form className="collection-form" onSubmit={handleSaveCollection}>
              <fieldset
                className="form-fieldset-reset"
                disabled={!canSaveCurrentCollection}
              >
              <section className="admin-grid">
                <label className="field">
                  <span>Collection label</span>
                  <input
                    onChange={(event) => updateDraft({ label: event.target.value })}
                    placeholder="Articles"
                    type="text"
                    value={draft.label}
                  />
                </label>

                <label className="field">
                  <span>Collection name</span>
                  <input
                    disabled={isEditingExistingCollection}
                    onChange={(event) => updateDraft({ name: event.target.value })}
                    placeholder="articles"
                    type="text"
                    value={draft.name}
                  />
                </label>
              </section>

              <label className="field">
                <span>Description</span>
                <input
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="Long-form content for the public site"
                  type="text"
                  value={draft.description}
                />
              </label>

              {isEditingExistingCollection ? (
                <p className="helper-text">
                  The collection name is the stable storage identifier for now. Create a
                  new collection if you need a different identifier.
                </p>
              ) : (
                <p className="helper-text">
                  Use lowercase letters, numbers, and underscores for the collection
                  name.
                </p>
              )}

              <div className="section-row">
                <div>
                  <p className="section-title">Fields</p>
                  <p className="section-copy">
                    Add field definitions, then move them into the order record editors
                    should follow for this collection.
                  </p>
                </div>
                <div className="add-field-controls">
                  <label className="field field-inline">
                    <span>New field type</span>
                    <select
                      onChange={(event) =>
                        setNewFieldType(event.target.value as DatamixFieldType)
                      }
                      value={newFieldType}
                    >
                      {fieldTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button" onClick={handleAddField} type="button">
                    Add field
                  </button>
                </div>
              </div>

              {draft.fields.length === 0 ? (
                <div className="empty-state-box">
                  <p className="list-title">No fields yet</p>
                  <p className="list-copy">
                    Start with a `text` or `markdown` field, then layer on selects,
                    relationships, and media references as the model becomes clearer.
                  </p>
                </div>
              ) : (
                <div className="field-builder-list">
                  {draft.fields.map((field, index) => (
                    <article className="field-builder-card" key={field.key}>
                      <div className="section-row">
                        <div>
                          <p className="field-builder-title">
                            Field {index + 1}: {field.label || "Untitled field"}
                          </p>
                          <p className="field-builder-copy">
                            Type <strong>{field.type}</strong>
                          </p>
                        </div>
                        <div className="actions actions-compact">
                          <button
                            className="mini-button"
                            disabled={index === 0}
                            onClick={() => handleMoveField(field.key, -1)}
                            type="button"
                          >
                            Move up
                          </button>
                          <button
                            className="mini-button"
                            disabled={index === draft.fields.length - 1}
                            onClick={() => handleMoveField(field.key, 1)}
                            type="button"
                          >
                            Move down
                          </button>
                          <button
                            className="mini-button mini-button-danger"
                            onClick={() => handleRemoveField(field.key)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="admin-grid">
                        <label className="field">
                          <span>Label</span>
                          <input
                            onChange={(event) =>
                              updateField(field.key, (currentField) => ({
                                ...currentField,
                                label: event.target.value,
                              }))
                            }
                            placeholder="Title"
                            type="text"
                            value={field.label}
                          />
                        </label>

                        <label className="field">
                          <span>Name</span>
                          <input
                            onChange={(event) =>
                              updateField(field.key, (currentField) => ({
                                ...currentField,
                                name: event.target.value,
                              }))
                            }
                            placeholder="title"
                            type="text"
                            value={field.name}
                          />
                        </label>
                      </div>

                      <div className="admin-grid">
                        <label className="field">
                          <span>Field type</span>
                          <select
                            onChange={(event) =>
                              handleFieldTypeChange(
                                field.key,
                                event.target.value as DatamixFieldType,
                              )
                            }
                            value={field.type}
                          >
                            {fieldTypeOptions.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field checkbox-field">
                          <span>Required</span>
                          <input
                            checked={field.required}
                            onChange={(event) =>
                              updateField(field.key, (currentField) => ({
                                ...currentField,
                                required: event.target.checked,
                              }))
                            }
                            type="checkbox"
                          />
                        </label>
                      </div>

                      <label className="field">
                        <span>Description</span>
                        <input
                          onChange={(event) =>
                            updateField(field.key, (currentField) => ({
                              ...currentField,
                              description: event.target.value,
                            }))
                          }
                          placeholder="What this field is for"
                          type="text"
                          value={field.description}
                        />
                      </label>

                      {field.type === "select" ? (
                        <div className="type-specific-box">
                          <div className="section-row">
                            <div>
                              <p className="section-title">Select options</p>
                              <p className="section-copy">
                                Keep option values stable and lowercase.
                              </p>
                            </div>
                            <button
                              className="mini-button"
                              onClick={() =>
                                updateField(field.key, (currentField) =>
                                  currentField.type !== "select"
                                    ? currentField
                                    : {
                                        ...currentField,
                                        options: [
                                          ...currentField.options,
                                          { label: "", value: "" },
                                        ],
                                      },
                                )
                              }
                              type="button"
                            >
                              Add option
                            </button>
                          </div>

                          <div className="option-list">
                            {field.options.map((option, optionIndex) => (
                              <div className="option-row" key={`${field.key}-option-${optionIndex}`}>
                                <label className="field">
                                  <span>Option label</span>
                                  <input
                                    onChange={(event) =>
                                      updateField(field.key, (currentField) =>
                                        currentField.type !== "select"
                                          ? currentField
                                          : {
                                              ...currentField,
                                              options: currentField.options.map(
                                                (
                                                  currentOption: DatamixSelectOption,
                                                  currentOptionIndex: number,
                                                ) =>
                                                  currentOptionIndex === optionIndex
                                                    ? {
                                                        ...currentOption,
                                                        label: event.target.value,
                                                      }
                                                    : currentOption,
                                              ),
                                            },
                                      )
                                    }
                                    type="text"
                                    value={option.label}
                                  />
                                </label>
                                <label className="field">
                                  <span>Option value</span>
                                  <input
                                    onChange={(event) =>
                                      updateField(field.key, (currentField) =>
                                        currentField.type !== "select"
                                          ? currentField
                                          : {
                                              ...currentField,
                                              options: currentField.options.map(
                                                (
                                                  currentOption: DatamixSelectOption,
                                                  currentOptionIndex: number,
                                                ) =>
                                                  currentOptionIndex === optionIndex
                                                    ? {
                                                        ...currentOption,
                                                        value: event.target.value,
                                                      }
                                                    : currentOption,
                                              ),
                                            },
                                      )
                                    }
                                    type="text"
                                    value={option.value}
                                  />
                                </label>
                                <button
                                  className="mini-button mini-button-danger"
                                  onClick={() =>
                                    updateField(field.key, (currentField) =>
                                      currentField.type !== "select"
                                        ? currentField
                                        : {
                                            ...currentField,
                                            options: currentField.options.filter(
                                              (
                                                _currentOption: DatamixSelectOption,
                                                currentOptionIndex: number,
                                              ) => currentOptionIndex !== optionIndex,
                                            ),
                                          },
                                    )
                                  }
                                  type="button"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {field.type === "relationship" ? (
                        <div className="type-specific-box">
                          <div className="admin-grid">
                            <label className="field">
                              <span>Target collection</span>
                              <input
                                onChange={(event) =>
                                  updateField(field.key, (currentField) =>
                                    currentField.type !== "relationship"
                                      ? currentField
                                      : {
                                          ...currentField,
                                          targetCollection: event.target.value,
                                        },
                                  )
                                }
                                placeholder="authors"
                                type="text"
                                value={field.targetCollection}
                              />
                            </label>

                            <label className="field checkbox-field">
                              <span>Allow multiple records</span>
                              <input
                                checked={field.multiple}
                                onChange={(event) =>
                                  updateField(field.key, (currentField) =>
                                    currentField.type !== "relationship"
                                      ? currentField
                                      : {
                                          ...currentField,
                                          multiple: event.target.checked,
                                        },
                                  )
                                }
                                type="checkbox"
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}

              {collectionMessage ? (
                <FlowStateBox
                  actionLabel={
                    collectionIssues.length === 0 && activeCollection ? "Open records" : undefined
                  }
                  body={
                    collectionIssues.length > 0
                      ? collectionMessage
                      : `${collectionMessage} The generated record editor is ready to use for the saved schema.`
                  }
                  onAction={
                    collectionIssues.length === 0 && activeCollection
                      ? () => jumpToSection(recordEditorSectionId)
                      : undefined
                  }
                  title={
                    collectionIssues.length > 0
                      ? "Collection definition needs attention"
                      : "Collection definition saved"
                  }
                  tone={collectionStatusTone}
                />
              ) : null}
              {collectionLoadError && collections.length > 0 ? (
                <FlowStateBox
                  actionLabel="Retry collections"
                  body={`${collectionLoadError} You can keep editing the current draft while Datamix retries the saved collection list.`}
                  onAction={handleRefreshCollections}
                  title="Saved collection list is out of date"
                  tone="warning"
                />
              ) : null}
              {collectionIssues.length > 0 ? (
                <ul className="issue-list">
                  {collectionIssues.map((issue) => (
                    <li key={`${issue.path}-${issue.message}`}>
                      <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="actions">
                <button
                  className="button"
                  disabled={isSavingCollection || !canSaveCurrentCollection}
                  type="submit"
                >
                  {isSavingCollection
                    ? "Saving collection..."
                    : isEditingExistingCollection
                      ? "Save collection changes"
                      : "Create collection"}
                  </button>
              </div>
              </fieldset>
            </form>
          </section>

          <section className="admin-card admin-card-wide" id="record-editor">
            <div className="section-row">
              <div>
                <p className="card-eyebrow">Generated record editor</p>
                <h3 className="card-title">
                  {activeCollection
                    ? selectedRecord
                      ? `Editing ${activeCollection.definition.label} record`
                      : `Create ${activeCollection.definition.label} record`
                    : "Select a saved collection to open its editor"}
                </h3>
                <p className="card-copy">
                  This surface is generated directly from the saved collection schema.
                  Field order here matches the stored schema order exactly.
                </p>
              </div>
              {activeCollection ? (
                <div className="status-row">
                  <span className="status-pill">
                    {activeCollection.definition.fields.length} field
                    {activeCollection.definition.fields.length === 1 ? "" : "s"}
                  </span>
                  <span className="status-pill">
                    {records.length} record{records.length === 1 ? "" : "s"}
                  </span>
                  <span className="status-pill status-pill-muted">
                    {activeCollection.tableName}
                  </span>
                  {isRefreshingRecords ? (
                    <span className="status-pill status-pill-muted">Refreshing records</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!canAccessRecordsWorkspace ? (
              <FlowStateBox
                body={`Your ${sessionRole?.label ?? "current"} role cannot access generated records.`}
                title="Record access is restricted"
                tone="warning"
              />
            ) : !activeCollection ? (
              <FlowStateBox
                actionLabel="Create collection"
                body="Save a collection from the builder, or choose one from the sidebar, to see its generated record editor."
                onAction={handleStartNewCollection}
                title="No saved collection selected"
              />
            ) : (
              <>
                {!canViewRecords && canCreateRecords ? (
                  <FlowStateBox
                    body="This role can create new records, but it cannot load the saved record list. New entries still save through the protected API route."
                    compact
                    title="Record list is hidden for this role"
                    tone="warning"
                  />
                ) : null}

                {hasUnsavedSchemaChanges ? (
                  <div className="generated-record-notice">
                    <p className="list-title">Saved schema is driving this editor</p>
                    <p className="list-copy">
                      You have builder changes that are not saved yet. Save the collection
                      to refresh this record editor with the updated schema.
                    </p>
                  </div>
                ) : null}

                <div className="section-row">
                  <div>
                    <p className="section-title">Current persistence support</p>
                    <p className="section-copy">
                      This slice persists `text`, `number`, `boolean`, `date`, `select`,
                      `relationship`, `richText`, `markdown`, `image`, and
                      `imageGallery` fields. Gallery selection order now saves exactly as
                      arranged in the editor.
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      className="button button-secondary"
                      disabled={!canRefreshRecords}
                      onClick={handleRefreshRecords}
                      type="button"
                    >
                      {isRefreshingRecords ? "Refreshing..." : "Refresh records"}
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={!canCreateRecords}
                      onClick={handleStartNewRecord}
                      type="button"
                    >
                      New record
                    </button>
                  </div>
                </div>

                <div className="record-browser">
                  <div className="record-browser-list">
                    {isInitialRecordLoad ? (
                      <FlowStateBox
                        body={`Loading ${activeCollection.definition.label.toLowerCase()} records and persistence support details.`}
                        title="Loading records"
                      />
                    ) : recordLoadError && records.length === 0 ? (
                      <FlowStateBox
                        actionLabel="Try again"
                        body={recordLoadError}
                        onAction={handleRefreshRecords}
                        title="Record list is unavailable"
                        tone="error"
                      />
                    ) : records.length === 0 ? (
                      <FlowStateBox
                        actionLabel="Create first record"
                        body="Start with a new record to exercise the generated editor end to end."
                        onAction={handleStartNewRecord}
                        title="No saved records yet"
                      />
                    ) : (
                      <>
                        {records.map((record) => (
                          <button
                            className={
                              record.id === selectedRecordId
                                ? "mini-list-item is-selected"
                                : "mini-list-item"
                            }
                            key={record.id}
                            onClick={() => handleEditRecord(record)}
                            type="button"
                          >
                            <span>{summarizeRecord(activeCollection.definition, record)}</span>
                            <small>{formatRecordTimestamp(record.updatedAt)}</small>
                          </button>
                        ))}
                        {!selectedRecord ? (
                          <FlowStateBox
                            body="Choose a saved record to edit it, or keep the form in create mode to add a fresh entry."
                            compact
                            title="Create mode is active"
                            tone="warning"
                          />
                        ) : null}
                        {recordLoadError ? (
                          <FlowStateBox
                            actionLabel="Retry refresh"
                            body={`${recordLoadError} Showing the last record list that loaded successfully.`}
                            compact
                            onAction={handleRefreshRecords}
                            title="Record refresh did not finish"
                            tone="error"
                          />
                        ) : null}
                      </>
                    )}
                  </div>

                  <aside className="generated-record-preview">
                    <p className="card-eyebrow">Persistence seam</p>
                    <h4 className="section-title">Supported fields</h4>
                    <p className="section-copy">
                      API-backed in this slice: <strong>{recordSupportedFieldNames}</strong>
                    </p>
                    {persistedRecordFields.length === 0 ? (
                      <FlowStateBox
                        body="Add at least one `text`, `number`, `boolean`, `date`, `select`, `relationship`, `richText`, `markdown`, `image`, or `imageGallery` field to create records in this slice."
                        compact
                        title="No persisted fields yet"
                        tone="warning"
                      />
                    ) : null}
                  </aside>
                </div>

                <div className="generated-record-layout">
                  <form className="generated-record-form" onSubmit={handleGeneratedRecordSubmit}>
                    {activeCollection.definition.fields.length === 0 ? (
                      <FlowStateBox
                        actionLabel="Open schema"
                        body="Add fields in the builder and save them to generate the editor."
                        onAction={() => jumpToSection(collectionBuilderSectionId)}
                        title="This collection has no fields yet"
                        tone="warning"
                      />
                    ) : (
                      activeCollection.definition.fields.map((field) => (
                        <GeneratedRecordFieldInput
                          disabled={
                            !isRecordCrudFieldDefinition(field) || !canSaveCurrentRecord
                          }
                          field={field}
                          key={field.name}
                          mediaAssets={mediaAssets}
                          onChange={(nextValue) =>
                            handleRecordFieldChange(field.name, nextValue)
                          }
                          onOpenMediaLibrary={() => jumpToSection("media")}
                          value={recordDraft[field.name] ?? ""}
                        />
                      ))
                    )}

                    {recordMessage ? (
                      <FlowStateBox
                        body={
                          recordIssues.length > 0
                            ? recordMessage
                            : `${recordMessage} This record is now part of the saved ${activeCollection.definition.label.toLowerCase()} flow.`
                        }
                        title={recordStatusTitle}
                        tone={recordStatusTone}
                      />
                    ) : null}
                    {recordLoadError && records.length > 0 ? (
                      <FlowStateBox
                        actionLabel="Retry records"
                        body={`${recordLoadError} You can keep editing the current form while Datamix retries the latest record list.`}
                        onAction={handleRefreshRecords}
                        title="Saved records may be out of date"
                        tone="warning"
                      />
                    ) : null}
                    {recordIssues.length > 0 ? (
                      <ul className="issue-list">
                        {recordIssues.map((issue) => (
                          <li key={`${issue.path}-${issue.message}`}>
                            <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="actions">
                      <button
                        className="button"
                        disabled={
                          isSavingRecord ||
                          persistedRecordFields.length === 0 ||
                          !canSaveCurrentRecord
                        }
                        type="submit"
                      >
                        {isSavingRecord
                          ? selectedRecord
                            ? "Saving record..."
                            : "Creating record..."
                          : selectedRecord
                            ? "Save record"
                            : "Create record"}
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={!canSaveCurrentRecord}
                        onClick={handleResetGeneratedRecord}
                        type="button"
                      >
                        Reset values
                      </button>
                    </div>
                  </form>

                  <aside className="generated-record-preview">
                    <p className="card-eyebrow">Payload preview</p>
                    <h4 className="section-title">Persisted save payload</h4>
                    <p className="section-copy">
                      This is the JSON shape sent to the protected Worker route for this
                      slice.
                    </p>
                    <pre className="code-block">
                      <code>{JSON.stringify(persistedRecordPayload, null, 2)}</code>
                    </pre>
                    <p className="section-copy">
                      Full local editor state still tracks the whole schema contract for
                      `M2-S4`.
                    </p>
                    <pre className="code-block">
                      <code>{JSON.stringify(generatedRecordPayload, null, 2)}</code>
                    </pre>
                  </aside>
                </div>
              </>
            )}
          </section>

          <section className="admin-grid" aria-label="Shell capabilities">
            <article className="admin-card">
              <p className="card-eyebrow">In place today</p>
              <h3 className="card-title">This shell is already doing useful work</h3>
              <ul className="feature-list">
                {shellCapabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="admin-card" id="media">
              <p className="card-eyebrow">Media library</p>
              <h3 className="card-title">Upload, browse, and inspect stored assets</h3>
              <p className="card-copy">
                `M4-S2` turns the upload seam into a central library view. Originals still
                land in R2, metadata still lands in D1, and image-field picker wiring stays
                for the next slice.
              </p>

              {!canViewMedia && !canUploadMedia ? (
                <FlowStateBox
                  body={`Your ${sessionRole?.label ?? "current"} role cannot access the shared media library.`}
                  title="Media access is restricted"
                  tone="warning"
                />
              ) : (
              <form className="auth-form" onSubmit={handleMediaUploadSubmit}>
                <label className="field">
                  <span>Upload file</span>
                  <input
                    disabled={!canUploadMedia}
                    ref={mediaFileInputRef}
                    accept="*/*"
                    onChange={(event) =>
                      setSelectedMediaFile(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                </label>

                {selectedMediaFile ? (
                  <div className="type-specific-box">
                    <p className="section-title">{selectedMediaFile.name}</p>
                    <p className="section-copy">
                      {selectedMediaFile.type || "application/octet-stream"} •{" "}
                      {formatByteSize(selectedMediaFile.size)}
                    </p>
                  </div>
                ) : (
                  <FlowStateBox
                    body="Choose any file to upload the original into R2. The returned storage key can be used in image fields until picker flows arrive."
                    compact
                    title="No file selected"
                  />
                )}

                {mediaMessage ? (
                  <FlowStateBox
                    body={mediaMessage}
                    title="Media asset uploaded"
                    tone="success"
                  />
                ) : null}
                {mediaLoadError ? (
                  <FlowStateBox
                    actionLabel="Refresh uploads"
                    body={mediaLoadError}
                    onAction={handleRefreshMediaAssets}
                    title="Media upload flow needs attention"
                    tone="error"
                  />
                ) : null}

                <div className="actions">
                  <button
                    className="button"
                    disabled={isUploadingMedia || !canUploadMedia}
                    type="submit"
                  >
                    {isUploadingMedia ? "Uploading asset..." : "Upload asset"}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canRefreshMediaAssets}
                    onClick={handleRefreshMediaAssets}
                    type="button"
                  >
                    {isRefreshingMediaAssets ? "Refreshing..." : "Refresh uploads"}
                  </button>
                </div>
              </form>
              )}

              {canViewMedia ? (
              <div className="record-browser">
                <div className="record-browser-list">
                  <div>
                    <p className="section-title">Library</p>
                    <p className="section-copy">
                      Browse the current media index. Search can stay lightweight in v0.
                    </p>
                  </div>

                  <label className="field">
                    <span>Filter assets</span>
                    <input
                      onChange={(event) => setMediaSearchQuery(event.target.value)}
                      placeholder="Search by filename, mime type, uploader, or storage key"
                      type="text"
                      value={mediaSearchQuery}
                    />
                  </label>

                  {isLoadingMediaAssets ? (
                    <FlowStateBox
                      body="Loading recent media asset metadata from the API Worker."
                      compact
                      title="Loading uploads"
                    />
                  ) : mediaAssets.length === 0 ? (
                    <FlowStateBox
                      body="No media assets uploaded yet. Use the form above to create the first asset row and R2 object."
                      compact
                      title="No uploads yet"
                    />
                  ) : filteredMediaAssets.length === 0 ? (
                    <FlowStateBox
                      actionLabel="Clear filter"
                      body={`No assets matched "${mediaSearchQuery}".`}
                      compact
                      onAction={() => setMediaSearchQuery("")}
                      title="No matching assets"
                      tone="warning"
                    />
                  ) : (
                    filteredMediaAssets.map((asset) => (
                      <button
                        className={
                          asset.id === selectedMediaAssetId
                            ? "mini-list-item mini-list-item-stacked is-selected"
                            : "mini-list-item mini-list-item-stacked"
                        }
                        key={asset.id}
                        onClick={() => handleSelectMediaAsset(asset.id)}
                        type="button"
                      >
                        <div className="mini-list-content">
                          <span>{asset.fileName}</span>
                          <small>
                            {asset.mimeType} • {formatByteSize(asset.byteSize)}
                          </small>
                          <small>{asset.storageKey}</small>
                        </div>
                        <small>{formatRecordTimestamp(asset.createdAt)}</small>
                      </button>
                    ))
                  )}
                </div>

                <aside className="generated-record-preview">
                  <p className="card-eyebrow">Asset detail</p>
                  {selectedFilteredMediaAsset ? (
                    <>
                      <h4 className="section-title">{selectedFilteredMediaAsset.fileName}</h4>
                      <p className="section-copy">
                        Stored metadata and delivery URLs for the selected asset. The
                        Worker route serves originals directly from R2 and can apply
                        resize, crop, format, and compression parameters on demand.
                        Datamix now points those URLs at the configured media origin
                        when one is available.
                      </p>
                      <dl className="detail-list">
                        <div>
                          <dt>Storage key</dt>
                          <dd className="detail-list-code">
                            {selectedFilteredMediaAsset.storageKey}
                          </dd>
                        </div>
                        <div>
                          <dt>MIME type</dt>
                          <dd>{selectedFilteredMediaAsset.mimeType}</dd>
                        </div>
                        <div>
                          <dt>Size</dt>
                          <dd>{formatByteSize(selectedFilteredMediaAsset.byteSize)}</dd>
                        </div>
                        <div>
                          <dt>Uploaded</dt>
                          <dd>{formatRecordTimestamp(selectedFilteredMediaAsset.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>Uploader</dt>
                          <dd>
                            {selectedFilteredMediaAsset.uploadedByUserEmail ??
                              "Unknown uploader"}
                          </dd>
                        </div>
                        <div>
                          <dt>Asset id</dt>
                          <dd className="detail-list-code">{selectedFilteredMediaAsset.id}</dd>
                        </div>
                        {selectedMediaOriginalUrl ? (
                          <div>
                            <dt>Original URL</dt>
                            <dd className="detail-list-code">{selectedMediaOriginalUrl}</dd>
                          </div>
                        ) : null}
                        {selectedMediaTransformUrl ? (
                          <div>
                            <dt>Transform URL example</dt>
                            <dd className="detail-list-code">{selectedMediaTransformUrl}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Transform query contract</dt>
                          <dd>
                            `width`, `height`, `fit`, `quality`, `format`, `cropLeft`,
                            `cropTop`, `cropWidth`, `cropHeight`
                          </dd>
                        </div>
                      </dl>
                      {mediaClipboardMessage ? (
                        <p className="helper-text">{mediaClipboardMessage}</p>
                      ) : null}
                      <div className="actions">
                        <button
                          className="button button-secondary"
                          onClick={handleCopyMediaStorageKey}
                          type="button"
                        >
                          Copy storage key
                        </button>
                      </div>
                    </>
                  ) : selectedMediaAsset ? (
                    <FlowStateBox
                      actionLabel="Clear filter"
                      body="The selected asset is hidden by the current filter. Clear the filter or pick a different visible asset."
                      onAction={() => setMediaSearchQuery("")}
                      title="Selected asset is filtered out"
                      tone="warning"
                    />
                  ) : (
                    <FlowStateBox
                      body="Choose an asset from the library to inspect its metadata."
                      title="No asset selected"
                    />
                  )}
                </aside>
              </div>
              ) : null}
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-card" id="invite">
              <p className="card-eyebrow">Team access</p>
              <h3 className="card-title">Users, invites, and assigned roles</h3>
              <p className="card-copy">
                Keep invites and role assignment in one place so access stays understandable as
                the instance grows.
              </p>

              {!canAccessTeamAccess ? (
                <FlowStateBox
                  body={`Your ${sessionRole?.label ?? "current"} role cannot access user administration yet.`}
                  title="Team access is restricted"
                  tone="warning"
                />
              ) : (
                <div className="section-stack">
                  <div className="section-row">
                    <div>
                      <h4 className="section-title">Current users</h4>
                      <p className="section-copy">
                        See who can sign in and adjust their assigned role when your access
                        includes user management.
                      </p>
                    </div>
                    {canViewUsers ? (
                      <div className="actions actions-compact">
                        <button
                          className="mini-button"
                          disabled={!canRefreshUsers}
                          onClick={handleRefreshUsers}
                          type="button"
                        >
                          {isLoadingUsers ? "Refreshing..." : "Refresh"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {usersMessage ? <p className="form-success">{usersMessage}</p> : null}

                  {!canViewUsers ? (
                    <p className="helper-text">
                      {canUpdateUsers
                        ? "This role can update users, but it cannot browse the current user list."
                        : "This role cannot browse the current user list yet."}
                    </p>
                  ) : isLoadingUsers ? (
                    <FlowStateBox
                      body="Loading the current Datamix user list from the protected API route."
                      compact
                      title="Loading users"
                    />
                  ) : usersLoadError && users.length === 0 ? (
                    <FlowStateBox
                      actionLabel="Try again"
                      body={usersLoadError}
                      compact
                      onAction={handleRefreshUsers}
                      title="User list is unavailable"
                      tone="error"
                    />
                  ) : users.length === 0 ? (
                    <FlowStateBox
                      body="No users are available yet beyond the current session."
                      compact
                      title="No users found"
                    />
                  ) : (
                    <div className="mini-list">
                      {users.map((user) => (
                        <div className="mini-list-item mini-list-item-stacked" key={user.id}>
                          <div className="mini-list-content">
                            <strong>{user.name || user.email}</strong>
                            <small>{user.email}</small>
                          </div>

                          <div className="status-row status-row-compact">
                            <span className="status-pill">
                              {resolveRoleLabel(availableRoles, user.roleId)}
                            </span>
                            {currentSessionUserId === user.id ? (
                              <span className="status-pill status-pill-muted">Current session</span>
                            ) : null}
                            <span className="status-pill status-pill-muted">
                              {user.emailVerified ? "Joined" : "Invite pending"}
                            </span>
                          </div>

                          {canUpdateUsers ? (
                            <div className="permission-toolbar">
                              <label className="field field-inline">
                                <span>Assigned role</span>
                                <select
                                  onChange={(event) =>
                                    handleUserRoleDraftChange(user.id, event.target.value)
                                  }
                                  value={userRoleDrafts[user.id] ?? user.roleId ?? ""}
                                >
                                  <option disabled value="">
                                    Select role
                                  </option>
                                  {availableRoles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                className="mini-button"
                                disabled={
                                  updatingUserRoleId === user.id ||
                                  !userRoleDrafts[user.id] ||
                                  userRoleDrafts[user.id] === user.roleId
                                }
                                onClick={() => void handleUpdateUserRole(user)}
                                type="button"
                              >
                                {updatingUserRoleId === user.id ? "Saving..." : "Save role"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {usersLoadError && users.length > 0 ? (
                    <FlowStateBox
                      actionLabel="Retry users"
                      body={usersLoadError}
                      compact
                      onAction={handleRefreshUsers}
                      title="User refresh did not finish"
                      tone="warning"
                    />
                  ) : null}

                  <div className="section-stack">
                    <div>
                      <h4 className="section-title">Invite a teammate</h4>
                      <p className="section-copy">
                        Datamix emails a secure invite link and routes the recipient through
                        password setup on first sign-in with the role you choose here.
                      </p>
                    </div>

                    <form className="auth-form" onSubmit={handleInviteSubmit}>
                      <label className="field">
                        <span>Name</span>
                        <input
                          disabled={!canInviteUsers}
                          onChange={(event) => setInviteName(event.target.value)}
                          placeholder="Optional display name"
                          type="text"
                          value={inviteName}
                        />
                      </label>

                      <label className="field">
                        <span>Email</span>
                        <input
                          disabled={!canInviteUsers}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          required
                          type="email"
                          value={inviteEmail}
                        />
                      </label>

                      <label className="field">
                        <span>Starting role</span>
                        <select
                          disabled={!canInviteUsers || availableRoles.length === 0}
                          onChange={(event) => setInviteRoleId(event.target.value)}
                          value={inviteRoleId}
                        >
                          {availableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {inviteError ? <p className="form-error">{inviteError}</p> : null}
                      {inviteMessage ? <p className="form-success">{inviteMessage}</p> : null}

                      <div className="actions">
                        <button
                          className="button"
                          disabled={isInviting || !canInviteUsers}
                          type="submit"
                        >
                          {isInviting ? "Sending invite..." : "Send invite"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {canAccessTeamAccess && !canInviteUsers ? (
                <p className="helper-text">
                  Your {sessionRole?.label ?? "current"} role can sign in, but it cannot send
                  team invites.
                </p>
              ) : null}

              <div className="section-stack">
                <div>
                  <h4 className="section-title">Available roles</h4>
                  <p className="section-copy">
                    Built-in presets stay readable, and custom roles now flow through the
                    same shared permission model and protected API checks.
                  </p>
                </div>

                <div className="mini-list">
                  {rolePreviewItems.map((role) => (
                    <div className="mini-list-item mini-list-item-stacked" key={role.id}>
                      <div className="mini-list-content">
                        <strong>{role.label}</strong>
                        <small>{role.description}</small>
                      </div>

                      <div className="status-row status-row-compact">
                        <span className="status-pill">
                          {role.permissions.length} permissions
                        </span>
                        <span className="status-pill status-pill-muted">
                          {role.system ? "Built-in" : "Custom"}
                        </span>
                      </div>

                      <div className="section-stack">
                        {listDatamixPermissionGrantsForRole(role).map((grant) => (
                          <p className="helper-text" key={`${role.id}-${grant.resource.id}`}>
                            <strong>{grant.resource.label}:</strong>{" "}
                            {grant.actions
                              .map((action) => getDatamixPermissionActionDefinition(action).label)
                              .join(", ")}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="admin-card" id="settings">
              <p className="card-eyebrow">Session, API, and roles</p>
              <h3 className="card-title">Runtime posture, API keys, and role permissions</h3>
              {!canAccessSettingsWorkspace ? (
                <FlowStateBox
                  body={`Your ${sessionRole?.label ?? "current"} role cannot access settings yet.`}
                  title="Settings are restricted"
                  tone="warning"
                />
              ) : (
                <div className="section-stack">
                  <dl className="detail-list" id="session">
                    <div>
                      <dt>Signed in as</dt>
                      <dd>{userLabel}</dd>
                    </div>
                    <div>
                      <dt>Current role</dt>
                      <dd>{sessionRole?.label ?? "Unknown role"}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{session.data.user.email}</dd>
                    </div>
                    <div>
                      <dt>App environment</dt>
                      <dd>{adminPublicEnv.NEXT_PUBLIC_APP_ENV}</dd>
                    </div>
                    <div>
                      <dt>API origin</dt>
                      <dd>{adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}</dd>
                    </div>
                    <div>
                      <dt>Media origin</dt>
                      <dd>{adminPublicEnv.NEXT_PUBLIC_MEDIA_ORIGIN}</dd>
                    </div>
                    <div>
                      <dt>Auth posture</dt>
                      <dd>Persisted better-auth session on the API Worker origin</dd>
                    </div>
                  </dl>

                  {setupStatus.oauth ? (
                    <div className="section-stack">
                      <div>
                        <h4 className="section-title">Optional OAuth sign-in</h4>
                        <p className="section-copy">
                          GitHub and Google stay optional. Datamix only uses them for
                          existing or invited users, so password auth remains the baseline
                          sign-in path.
                        </p>
                      </div>

                      <div className="mini-list">
                        {setupStatus.oauth.providers.map((provider) => (
                          <div
                            className="mini-list-item mini-list-item-stacked"
                            key={provider.id}
                          >
                            <div className="mini-list-content">
                              <strong>{provider.label}</strong>
                              <small>{provider.message}</small>
                            </div>

                            <div className="status-row status-row-compact">
                              <span className="status-pill">
                                {formatAuthProviderStatus(provider.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="section-stack">
                    <div className="section-row">
                      <div>
                        <h4 className="section-title">Public API keys</h4>
                        <p className="section-copy">
                          Create read-only or write-capable keys for the generated JSON API.
                          Datamix shows each secret once, then stores only a hashed form.
                        </p>
                      </div>
                      <div className="actions actions-compact">
                        <button
                          className="mini-button"
                          disabled={!canRefreshApiKeys}
                          onClick={handleRefreshApiKeys}
                          type="button"
                        >
                          {isLoadingApiKeys ? "Refreshing..." : "Refresh"}
                        </button>
                      </div>
                    </div>

                    {publicApiRuntime ? (
                      <dl className="detail-list">
                        <div>
                          <dt>Public read access</dt>
                          <dd>{formatPublicApiAccessMode(publicApiRuntime.readAccess)}</dd>
                        </div>
                        <div>
                          <dt>Public write access</dt>
                          <dd>{formatPublicApiAccessMode(publicApiRuntime.writeAccess)}</dd>
                        </div>
                        <div>
                          <dt>Configured env read key</dt>
                          <dd>{publicApiRuntime.hasConfiguredReadKey ? "Present" : "Not set"}</dd>
                        </div>
                        <div>
                          <dt>Configured env write key</dt>
                          <dd>{publicApiRuntime.hasConfiguredWriteKey ? "Present" : "Not set"}</dd>
                        </div>
                      </dl>
                    ) : null}

                    {apiKeysMessage ? <p className="form-success">{apiKeysMessage}</p> : null}
                    {apiKeysLoadError ? <p className="form-error">{apiKeysLoadError}</p> : null}

                    {apiKeySecret ? (
                      <div className="type-specific-box">
                        <p className="section-title">Copy this secret now</p>
                        <p className="section-copy">
                          Datamix will not show this raw API key again after you leave this state.
                        </p>
                        <code className="record-json-preview">{apiKeySecret}</code>
                        {apiKeySecretMessage ? (
                          <p className="helper-text">{apiKeySecretMessage}</p>
                        ) : null}
                        <div className="actions">
                          <button
                            className="mini-button"
                            onClick={() => void handleCopyApiKeySecret()}
                            type="button"
                          >
                            Copy secret
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {canUpdateSettings ? (
                      <form className="auth-form" onSubmit={handleCreateApiKey}>
                        <label className="field">
                          <span>Key label</span>
                          <input
                            disabled={isCreatingApiKey}
                            onChange={(event) =>
                              handleCreateApiKeyDraftFieldChange("label", event.target.value)
                            }
                            placeholder="Production website"
                            type="text"
                            value={apiKeyDraft.label}
                          />
                        </label>

                        <label className="field">
                          <span>Access level</span>
                          <select
                            disabled={isCreatingApiKey}
                            onChange={(event) =>
                              handleCreateApiKeyDraftFieldChange("accessLevel", event.target.value)
                            }
                            value={apiKeyDraft.accessLevel}
                          >
                            {apiKeyAccessLevelOptions.map((accessLevel) => (
                              <option key={accessLevel} value={accessLevel}>
                                {formatApiKeyAccessLevel(accessLevel)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="actions">
                          <button className="button" disabled={isCreatingApiKey} type="submit">
                            {isCreatingApiKey ? "Creating key..." : "Create API key"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="helper-text">
                        Your {sessionRole?.label ?? "current"} role can inspect API keys, but it
                        cannot create or revoke them.
                      </p>
                    )}

                    {isLoadingApiKeys && apiKeys.length === 0 ? (
                      <FlowStateBox
                        body="Loading managed API keys from the API Worker."
                        compact
                        title="Loading API keys"
                      />
                    ) : apiKeys.length === 0 ? (
                      <FlowStateBox
                        body="No managed API keys have been created yet. Env keys can still be active if they are configured on the Worker."
                        compact
                        title="No managed keys"
                      />
                    ) : (
                      <div className="mini-list">
                        {apiKeys.map((apiKey) => {
                          const draft = apiKeyDrafts[apiKey.id] ?? createApiKeyDraftFromApiKey(apiKey);
                          const isSavingThisKey = savingApiKeyId === apiKey.id;
                          const isRevokingThisKey = revokingApiKeyId === apiKey.id;

                          return (
                            <div className="mini-list-item mini-list-item-stacked" key={apiKey.id}>
                              <div className="mini-list-content">
                                <strong>{apiKey.label}</strong>
                                <small>{apiKey.secretPreview}</small>
                              </div>

                              <div className="status-row status-row-compact">
                                <span className="status-pill">
                                  {formatApiKeyAccessLevel(apiKey.accessLevel)}
                                </span>
                                <span className="status-pill status-pill-muted">
                                  {apiKey.revokedAt ? "Revoked" : "Active"}
                                </span>
                                <span className="status-pill status-pill-muted">
                                  {apiKey.lastUsedAt
                                    ? `Last used ${formatRecordTimestamp(apiKey.lastUsedAt)}`
                                    : "Never used"}
                                </span>
                              </div>

                              <p className="helper-text">
                                Created {formatRecordTimestamp(apiKey.createdAt)}
                                {apiKey.revokedAt
                                  ? ` · Revoked ${formatRecordTimestamp(apiKey.revokedAt)}`
                                  : ""}
                              </p>

                              {canUpdateSettings ? (
                                <div className="permission-toolbar">
                                  <label className="field field-inline">
                                    <span>Label</span>
                                    <input
                                      disabled={Boolean(apiKey.revokedAt) || isSavingThisKey || isRevokingThisKey}
                                      onChange={(event) =>
                                        handleApiKeyDraftFieldChange(
                                          apiKey.id,
                                          "label",
                                          event.target.value,
                                        )
                                      }
                                      type="text"
                                      value={draft.label}
                                    />
                                  </label>
                                  <label className="field field-inline">
                                    <span>Access</span>
                                    <select
                                      disabled={Boolean(apiKey.revokedAt) || isSavingThisKey || isRevokingThisKey}
                                      onChange={(event) =>
                                        handleApiKeyDraftFieldChange(
                                          apiKey.id,
                                          "accessLevel",
                                          event.target.value,
                                        )
                                      }
                                      value={draft.accessLevel}
                                    >
                                      {apiKeyAccessLevelOptions.map((accessLevel) => (
                                        <option key={accessLevel} value={accessLevel}>
                                          {formatApiKeyAccessLevel(accessLevel)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button
                                    className="mini-button"
                                    disabled={
                                      Boolean(apiKey.revokedAt) ||
                                      isSavingThisKey ||
                                      isRevokingThisKey ||
                                      (draft.label === apiKey.label &&
                                        draft.accessLevel === apiKey.accessLevel)
                                    }
                                    onClick={() => void handleUpdateApiKey(apiKey)}
                                    type="button"
                                  >
                                    {isSavingThisKey ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    className="mini-button"
                                    disabled={Boolean(apiKey.revokedAt) || isSavingThisKey || isRevokingThisKey}
                                    onClick={() => void handleRevokeApiKey(apiKey)}
                                    type="button"
                                  >
                                    {isRevokingThisKey ? "Revoking..." : "Revoke"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="record-browser">
                    <div className="record-browser-list">
                      <div className="section-row">
                        <div>
                          <h4 className="section-title">Roles</h4>
                          <p className="section-copy">
                            Select a built-in preset to inspect it, or create a custom role with
                            just the permissions this instance needs.
                          </p>
                        </div>
                        <div className="actions actions-compact">
                          <button
                            className="mini-button"
                            disabled={!canRefreshRoles}
                            onClick={handleRefreshRoles}
                            type="button"
                          >
                            {isLoadingRoles ? "Refreshing..." : "Refresh"}
                          </button>
                          {canUpdateSettings ? (
                            <button
                              className="mini-button"
                              onClick={() => handleStartNewRole()}
                              type="button"
                            >
                              New custom role
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {rolesLoadError && availableRoles.length === 0 ? (
                        <FlowStateBox
                          actionLabel="Try again"
                          body={rolesLoadError}
                          compact
                          onAction={handleRefreshRoles}
                          title="Role list is unavailable"
                          tone="error"
                        />
                      ) : isLoadingRoles && availableRoles.length === 0 ? (
                        <FlowStateBox
                          body="Loading role definitions from the API Worker."
                          compact
                          title="Loading roles"
                        />
                      ) : (
                        <div className="mini-list">
                          {rolePreviewItems.map((role) => (
                            <button
                              className={
                                !isCreatingRole && selectedRoleId === role.id
                                  ? "mini-list-item mini-list-item-stacked is-selected"
                                  : "mini-list-item mini-list-item-stacked"
                              }
                              key={role.id}
                              onClick={() => handleSelectRole(role)}
                              type="button"
                            >
                              <div className="mini-list-content">
                                <span>{role.label}</span>
                                <small>{role.description}</small>
                              </div>
                              <small>{role.system ? "Built-in" : "Custom"}</small>
                            </button>
                          ))}
                        </div>
                      )}

                      {rolesLoadError && availableRoles.length > 0 ? (
                        <FlowStateBox
                          actionLabel="Retry roles"
                          body={rolesLoadError}
                          compact
                          onAction={handleRefreshRoles}
                          title="Role refresh did not finish"
                          tone="warning"
                        />
                      ) : null}
                    </div>

                    <aside className="generated-record-preview">
                      <p className="card-eyebrow">Role editor</p>
                      {isCreatingRole ? (
                        <>
                          <h4 className="section-title">Create custom role</h4>
                          <p className="section-copy">
                            Start from scratch or from a built-in preset copy, then choose only
                            the permissions this role should carry.
                          </p>
                        </>
                      ) : selectedRole ? (
                        <>
                          <h4 className="section-title">{selectedRole.label}</h4>
                          <p className="section-copy">{selectedRole.description}</p>
                        </>
                      ) : (
                        <>
                          <h4 className="section-title">Select a role</h4>
                          <p className="section-copy">
                            Choose a role from the list to inspect or edit it.
                          </p>
                        </>
                      )}

                      {!isCreatingRole && selectedRole?.system ? (
                        <div className="section-stack">
                          <FlowStateBox
                            body="Built-in presets stay locked so Datamix keeps a stable baseline. Create a custom copy when you want to tune permissions."
                            compact
                            title="Built-in role"
                          />
                          {canUpdateSettings ? (
                            <div className="actions">
                              <button
                                className="button"
                                onClick={() => handleStartNewRole(selectedRole)}
                                type="button"
                              >
                                Create custom copy
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : canUpdateSettings || (selectedRole && !selectedRole.system) ? (
                        <form className="generated-record-form" onSubmit={handleSaveRole}>
                          <fieldset
                            className="form-fieldset-reset"
                            disabled={!canUpdateSettings || isSavingRole}
                          >
                            <label className="field">
                              <span>Role label</span>
                              <input
                                onChange={(event) =>
                                  handleRoleDraftFieldChange("label", event.target.value)
                                }
                                placeholder="Content manager"
                                type="text"
                                value={roleDraft.label}
                              />
                            </label>

                            <label className="field">
                              <span>Role id</span>
                              <input
                                onChange={(event) =>
                                  handleRoleDraftFieldChange("id", event.target.value)
                                }
                                placeholder="content_manager"
                                type="text"
                                value={roleDraft.id}
                              />
                            </label>

                            <label className="field">
                              <span>Description</span>
                              <textarea
                                onChange={(event) =>
                                  handleRoleDraftFieldChange("description", event.target.value)
                                }
                                placeholder="Manages records and media without user administration."
                                rows={3}
                                value={roleDraft.description}
                              />
                            </label>

                            <div className="permission-section-list">
                              {rolePermissionSections.map((section) => (
                                <div className="type-specific-box" key={section.resource.id}>
                                  <p className="section-title">{section.resource.label}</p>
                                  <p className="section-copy">{section.resource.description}</p>
                                  <div className="permission-grid">
                                    {section.permissions.map((permission) => (
                                      <label className="permission-row" key={permission.key}>
                                        <input
                                          checked={roleDraft.permissions.includes(permission.key)}
                                          onChange={() =>
                                            handleToggleRolePermission(permission.key)
                                          }
                                          type="checkbox"
                                        />
                                        <span>
                                          <strong>{permission.label}</strong>
                                          <small>{permission.description}</small>
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </fieldset>

                          {rolesMessage ? (
                            <FlowStateBox
                              body={rolesMessage}
                              compact
                              title={roleIssues.length > 0 ? "Role needs attention" : "Role saved"}
                              tone={roleIssues.length > 0 ? "error" : "success"}
                            />
                          ) : null}
                          {roleIssues.length > 0 ? (
                            <ul className="issue-list">
                              {roleIssues.map((issue) => (
                                <li key={`${issue.path}-${issue.message}`}>
                                  <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="actions">
                            <button className="button" disabled={!canUpdateSettings} type="submit">
                              {isSavingRole ? "Saving role..." : "Save role"}
                            </button>
                            <button
                              className="button button-secondary"
                              disabled={!canUpdateSettings}
                              onClick={() =>
                                setRoleDraft(
                                  isCreatingRole
                                    ? createEmptyRoleDraft()
                                    : selectedRole
                                      ? createRoleDraftFromRole(selectedRole)
                                      : createEmptyRoleDraft(),
                                )
                              }
                              type="button"
                            >
                              Reset draft
                            </button>
                          </div>
                        </form>
                      ) : (
                        <FlowStateBox
                          body="Select a role to inspect its permissions."
                          compact
                          title="No role selected"
                        />
                      )}
                    </aside>
                  </div>
                </div>
              )}
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
