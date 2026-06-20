"use client";

import {
  datamixFieldTypes,
  type DatamixFieldType,
  type DatamixSchemaValidationIssue,
  type DatamixSelectOption,
} from "@datamix/core";
import { Plus } from "lucide-react";
import type { SubmitEvent } from "react";
import * as React from "react";

import { AdminField, AdminSectionCard } from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import { useAdminCollectionsState } from "../_state/admin-collections-state";
import { adminRoutes } from "../_workspace/admin-routes";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";
import {
  createDraftFromDefinition,
  createEmptyCollectionDraft,
  createFieldDraft,
  formatIssuePath,
  formatPlanSummary,
  moveItem,
  serializeDraft,
  type CollectionDraft,
  type CollectionFieldDraft,
} from "../_lib/schema-drafts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CollectionDefinitionRequestError,
  saveCollectionDefinition,
  type StoredCollectionDefinition,
} from "@/lib/collection-definitions";
import { cn } from "@/lib/utils";

const fieldTypeOptions = [...datamixFieldTypes];
const selectClassName =
  "h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";
const schemaBuilderSavingEventName = "datamix:schema-builder-saving";

type SchemaBuilderRouteModeProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      schemaId: string;
    };

type SchemaBuilderFormIslandProps = {
  collectionLoadError?: string | null;
  collections?: StoredCollectionDefinition[];
  collectionsLoaded?: boolean;
  mode: SchemaBuilderRouteModeProps["mode"];
  schemaId?: string;
  workspace: AdminWorkspaceProps;
};

type SchemaBuilderSaveButtonIslandProps = {
  canSave: boolean;
  mode: SchemaBuilderRouteModeProps["mode"];
};

function formatFieldTypeLabel(type: DatamixFieldType) {
  switch (type) {
    case "richText":
      return "Rich text";
    case "imageGallery":
      return "Image gallery";
    default:
      return type[0]?.toUpperCase() + type.slice(1);
  }
}

function formatSchemaLanguage(value: string) {
  return value
    .replaceAll("Collection definition", "Schema")
    .replaceAll("collection definition", "schema")
    .replaceAll("Collection", "Schema")
    .replaceAll("collection", "schema");
}

function decodeSchemaId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasDraftInput(draft: CollectionDraft) {
  return Boolean(
    draft.name || draft.label || draft.description || draft.fields.length > 0,
  );
}

function createFieldSummary(field: CollectionFieldDraft) {
  return `${field.type} · ${field.required ? "Required" : "Optional"}`;
}

function publishSchemaBuilderSavingState(isSaving: boolean) {
  window.dispatchEvent(
    new CustomEvent(schemaBuilderSavingEventName, {
      detail: { isSaving },
    }),
  );
}

export function SchemaBuilderSaveButtonIsland({
  canSave,
  mode,
}: SchemaBuilderSaveButtonIslandProps) {
  const [isSavingCollection, setIsSavingCollection] = React.useState(false);
  const isEditingExistingSchema = mode === "edit";

  React.useEffect(() => {
    const handleSavingState = (event: Event) => {
      const detail = (event as CustomEvent<{ isSaving?: boolean }>).detail;

      setIsSavingCollection(Boolean(detail?.isSaving));
    };

    window.addEventListener(schemaBuilderSavingEventName, handleSavingState);

    return () => {
      window.removeEventListener(
        schemaBuilderSavingEventName,
        handleSavingState,
      );
    };
  }, []);

  return (
    <Button
      disabled={isSavingCollection || !canSave}
      form="schema-builder-form"
      type="submit"
    >
      {isSavingCollection
        ? "Saving schema..."
        : isEditingExistingSchema
          ? "Save schema"
          : "Create schema"}
    </Button>
  );
}

export function SchemaBuilderFormIsland({
  collectionLoadError: initialCollectionLoadError,
  collections: initialCollections,
  collectionsLoaded: initialCollectionsLoaded,
  mode,
  schemaId,
  workspace,
}: SchemaBuilderFormIslandProps) {
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
  } = useAdminCollectionsState({
    initialCollectionLoadError,
    initialCollections,
    initialCollectionsLoaded,
  });
  const { permissions } = workspace;
  const decodedSchemaId = schemaId ? decodeSchemaId(schemaId) : null;
  const activeCollection =
    decodedSchemaId === null
      ? null
      : (collections.find((collection) => collection.id === decodedSchemaId) ??
        null);
  const [draft, setDraft] = React.useState<CollectionDraft>(() =>
    activeCollection
      ? createDraftFromDefinition(activeCollection.definition)
      : createEmptyCollectionDraft(),
  );
  const [draftSourceName, setDraftSourceName] = React.useState<string | null>(
    mode === "create" ? "new" : (activeCollection?.id ?? null),
  );
  const [collectionIssues, setCollectionIssues] = React.useState<
    DatamixSchemaValidationIssue[]
  >([]);
  const [collectionMessage, setCollectionMessage] = React.useState<
    string | null
  >(null);
  const [isSavingCollection, setIsSavingCollection] = React.useState(false);
  const [newFieldType, setNewFieldType] =
    React.useState<DatamixFieldType>("text");
  const isEditingExistingSchema = mode === "edit";
  const canSaveCurrentSchema = isEditingExistingSchema
    ? permissions.canUpdateCollections
    : permissions.canCreateCollections;
  const hasUnsavedSchemaChanges =
    activeCollection !== null
      ? JSON.stringify(activeCollection.definition) !==
        JSON.stringify(serializeDraft(draft))
      : hasDraftInput(draft);
  const statusTone = collectionIssues.length > 0 ? "error" : "success";

  React.useEffect(() => {
    if (
      !permissions.canViewCollections ||
      hasLoadedCollections ||
      isLoadingCollections
    ) {
      return;
    }

    void loadCollections();
  }, [
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    permissions.canViewCollections,
  ]);

  React.useEffect(() => {
    if (mode === "create" && draftSourceName !== "new") {
      setDraft(createEmptyCollectionDraft());
      setDraftSourceName("new");
      setCollectionIssues([]);
      setCollectionMessage(null);
    }
  }, [draftSourceName, mode]);

  React.useEffect(() => {
    if (mode !== "edit" || !activeCollection) {
      return;
    }

    if (draftSourceName === activeCollection.id) {
      return;
    }

    setDraft(createDraftFromDefinition(activeCollection.definition));
    setDraftSourceName(activeCollection.id);
    setCollectionIssues([]);
    setCollectionMessage(null);
  }, [activeCollection, draftSourceName, mode]);

  const clearCollectionStatus = React.useCallback(() => {
    setCollectionIssues([]);
    setCollectionMessage(null);
  }, []);

  const updateDraft = React.useCallback(
    (partial: Partial<CollectionDraft>) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        ...partial,
      }));
      clearCollectionStatus();
    },
    [clearCollectionStatus],
  );

  const updateField = React.useCallback(
    (
      fieldKey: string,
      updater: (field: CollectionFieldDraft) => CollectionFieldDraft,
    ) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        fields: currentDraft.fields.map((field) =>
          field.key === fieldKey ? updater(field) : field,
        ),
      }));
      clearCollectionStatus();
    },
    [clearCollectionStatus],
  );

  const handleAddField = () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: [...currentDraft.fields, createFieldDraft(newFieldType)],
    }));
    clearCollectionStatus();
  };

  const handleRemoveField = (fieldKey: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.filter((field) => field.key !== fieldKey),
    }));
    clearCollectionStatus();
  };

  const handleMoveField = (fieldKey: string, direction: -1 | 1) => {
    setDraft((currentDraft) => {
      const fieldIndex = currentDraft.fields.findIndex(
        (field) => field.key === fieldKey,
      );

      if (fieldIndex === -1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        fields: moveItem(currentDraft.fields, fieldIndex, direction),
      };
    });
    clearCollectionStatus();
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
    clearCollectionStatus();
  };

  const resetDraft = () => {
    if (activeCollection) {
      setDraft(createDraftFromDefinition(activeCollection.definition));
      setDraftSourceName(activeCollection.id);
    } else {
      setDraft(createEmptyCollectionDraft());
      setDraftSourceName("new");
    }

    clearCollectionStatus();
  };

  const handleSaveSchema = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveCurrentSchema) {
      return;
    }

    setIsSavingCollection(true);
    publishSchemaBuilderSavingState(true);
    setCollectionIssues([]);
    setCollectionMessage(null);

    try {
      const result = await saveCollectionDefinition(serializeDraft(draft));

      if (permissions.canViewCollections) {
        await loadCollections();
      }

      if (mode === "create") {
        window.location.href = adminRoutes.schema.detail(
          result.collection.id,
        ).href;
        return;
      }

      setDraft(createDraftFromDefinition(result.collection.definition));
      setDraftSourceName(result.collection.id);
      setCollectionMessage(
        formatSchemaLanguage(
          `${result.message} ${formatPlanSummary(result.plan)}`,
        ),
      );
    } catch (error) {
      if (error instanceof CollectionDefinitionRequestError) {
        setCollectionIssues(error.issues ?? []);
        setCollectionMessage(formatSchemaLanguage(error.message));
      } else {
        setCollectionMessage(
          error instanceof Error
            ? formatSchemaLanguage(error.message)
            : "Unable to save schema.",
        );
      }
    } finally {
      setIsSavingCollection(false);
      publishSchemaBuilderSavingState(false);
    }
  };

  return (
    <form
      className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]"
      id="schema-builder-form"
      onSubmit={handleSaveSchema}
    >
      <aside className="space-y-4">
        <AdminSectionCard
          description={
            isEditingExistingSchema
              ? "The schema name is the stable storage identifier."
              : "Name the schema before saving it."
          }
          title="Schema details"
        >
          <fieldset
            className="space-y-3"
            disabled={isSavingCollection || !canSaveCurrentSchema}
          >
            <AdminField
              label="Schema label"
              onChange={(event) => updateDraft({ label: event.target.value })}
              placeholder="Articles"
              value={draft.label}
            />
            <AdminField
              disabled={isEditingExistingSchema}
              hint={
                isEditingExistingSchema
                  ? "Schema names cannot be edited after save."
                  : "Use lowercase letters, numbers, and underscores."
              }
              label="Schema name"
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="articles"
              value={draft.name}
            />
            <div className="space-y-1.5">
              <Label htmlFor="schema-description">Description</Label>
              <Textarea
                className="min-h-24 bg-white"
                id="schema-description"
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                placeholder="Long-form content for the public site"
                value={draft.description}
              />
            </div>
          </fieldset>
        </AdminSectionCard>

        <AdminSectionCard
          description="Field order here becomes the generated content editing order."
          title="Fields"
        >
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="new-field-type">New field type</Label>
              <div className="flex gap-2">
                <select
                  className={selectClassName}
                  disabled={isSavingCollection || !canSaveCurrentSchema}
                  id="new-field-type"
                  onChange={(event) =>
                    setNewFieldType(event.target.value as DatamixFieldType)
                  }
                  value={newFieldType}
                >
                  {fieldTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {formatFieldTypeLabel(type)}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={isSavingCollection || !canSaveCurrentSchema}
                  onClick={handleAddField}
                  type="button"
                >
                  <Plus />
                  Add
                </Button>
              </div>
            </div>

            {draft.fields.length === 0 ? (
              <AdminStateBox
                body="Start with a text or markdown field, then layer on selects, relationships, and media references."
                compact
                title="No fields yet"
              />
            ) : (
              <div className="space-y-2">
                {draft.fields.map((field, index) => (
                  <div
                    className={cn(
                      "rounded-lg border p-3 text-left",
                      index === 0
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-border bg-white text-slate-950",
                    )}
                    key={field.key}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {field.label || `Field ${index + 1}`}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-[10px]",
                        index === 0 ? "text-slate-300" : "text-slate-500",
                      )}
                    >
                      {createFieldSummary(field)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminSectionCard>
      </aside>

      <AdminSectionCard
        action={
          <Button
            disabled={
              !hasUnsavedSchemaChanges ||
              isSavingCollection ||
              !canSaveCurrentSchema
            }
            onClick={resetDraft}
            size="sm"
            type="button"
            variant="outline"
          >
            Reset draft
          </Button>
        }
        description="Configure labels, API names, required state, and type-specific settings."
        title="Field settings"
      >
        {!canSaveCurrentSchema ? (
          <AdminStateBox
            body={
              isEditingExistingSchema
                ? "Your current role can view this schema, but it cannot save schema changes."
                : "Your current role cannot create schemas."
            }
            compact
            title="Schema changes are read-only"
            tone="warning"
          />
        ) : null}
        {collectionMessage ? (
          <AdminStateBox
            body={
              collectionIssues.length > 0
                ? collectionMessage
                : `${collectionMessage} The generated content editor will use this saved schema.`
            }
            compact
            title={
              collectionIssues.length > 0
                ? "Schema needs attention"
                : "Schema saved"
            }
            tone={statusTone}
          />
        ) : null}
        {collectionLoadError && collections.length > 0 ? (
          <AdminStateBox
            body={`${collectionLoadError} You can keep editing the current draft with the last saved schema list that loaded.`}
            compact
            title="Saved schema list may be out of date"
            tone="warning"
          />
        ) : null}
        {collectionIssues.length > 0 ? (
          <ul className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {collectionIssues.map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>
                <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        <fieldset
          className="mt-4 space-y-4"
          disabled={isSavingCollection || !canSaveCurrentSchema}
        >
          {draft.fields.length === 0 ? (
            <AdminStateBox
              body="Add a field from the left panel to begin configuring this schema."
              title="No field settings"
            />
          ) : (
            draft.fields.map((field, index) => (
              <article
                className="rounded-lg border border-border bg-white p-4"
                key={field.key}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-semibold text-slate-950">
                      Field {index + 1}: {field.label || "Untitled field"}
                    </p>
                    <p className="text-xs text-slate-500">
                      <Badge className="mr-2" variant="outline">
                        {formatFieldTypeLabel(field.type)}
                      </Badge>
                      {field.required ? "Required" : "Optional"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={index === 0}
                      onClick={() => handleMoveField(field.key, -1)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Move up
                    </Button>
                    <Button
                      disabled={index === draft.fields.length - 1}
                      onClick={() => handleMoveField(field.key, 1)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Move down
                    </Button>
                    <Button
                      onClick={() => handleRemoveField(field.key)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField
                    label="Label"
                    onChange={(event) =>
                      updateField(field.key, (currentField) => ({
                        ...currentField,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Title"
                    value={field.label}
                  />
                  <AdminField
                    label="API name"
                    onChange={(event) =>
                      updateField(field.key, (currentField) => ({
                        ...currentField,
                        name: event.target.value,
                      }))
                    }
                    placeholder="title"
                    value={field.name}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor={`${field.key}-type`}>Field type</Label>
                    <select
                      className={selectClassName}
                      id={`${field.key}-type`}
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
                          {formatFieldTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 self-end rounded-md border border-border bg-white px-3 py-2 text-sm">
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
                    Required field
                  </label>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor={`${field.key}-description`}>
                    Description
                  </Label>
                  <Textarea
                    className="min-h-20 bg-white"
                    id={`${field.key}-description`}
                    onChange={(event) =>
                      updateField(field.key, (currentField) => ({
                        ...currentField,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What this field is for"
                    value={field.description}
                  />
                </div>

                {field.type === "select" ? (
                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Select options
                        </p>
                        <p className="text-xs text-slate-500">
                          Keep option values stable and lowercase.
                        </p>
                      </div>
                      <Button
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
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Add option
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {field.options.map((option, optionIndex) => (
                        <div
                          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                          key={`${field.key}-option-${optionIndex}`}
                        >
                          <AdminField
                            label="Option label"
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
                            value={option.label}
                          />
                          <AdminField
                            label="Option value"
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
                            value={option.value}
                          />
                          <Button
                            className="self-end"
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
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {field.type === "relationship" ? (
                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <AdminField
                        hint="Use the target schema API name."
                        label="Target schema"
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
                        value={field.targetCollection}
                      />
                      <label className="flex items-center gap-2 self-end rounded-md border border-border bg-white px-3 py-2 text-sm">
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
                        Allow multiple content items
                      </label>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </fieldset>
      </AdminSectionCard>
    </form>
  );
}
