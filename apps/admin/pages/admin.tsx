import {
  datamixFieldTypes,
  type DatamixCollectionDefinition,
  type DatamixFieldDefinition,
  type DatamixFieldType,
  type DatamixSchemaValidationIssue,
  type DatamixSelectOption,
} from "@datamix/core";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
import {
  CollectionDefinitionRequestError,
  listCollectionDefinitions,
  saveCollectionDefinition,
  type SavedCollectionPlanSummary,
  type StoredCollectionDefinition,
} from "../lib/collection-definitions";
import { sendInvite } from "../lib/invite";
import { adminPublicEnv } from "../lib/runtime";
import { useSetupStatus } from "../lib/setup";

const loginHref = "/login?next=/admin";
const apiHealthHref = `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/health`;
const fieldTypeOptions = [...datamixFieldTypes];

const adminNavItems = [
  {
    id: "overview",
    label: "Dashboard",
    description: "Collection modeling, status, and next actions",
    state: "current",
  },
  {
    id: "collections-builder",
    label: "Collections",
    description: "Create, edit, and reorder field definitions",
    state: "ready",
  },
  {
    id: "invite",
    label: "Team access",
    description: "Invite another admin through email",
    state: "ready",
  },
  {
    id: "media",
    label: "Media library",
    description: "Shared asset flows arrive in M4",
    state: "soon",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Project controls will expand later",
    state: "soon",
  },
] as const;

const shellCapabilities = [
  "Persistent browser session is active on the API origin.",
  "First-run setup is complete and public sign-up is closed again.",
  "Password reset and invite emails share the same auth email provider layer.",
] as const;

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
  return path.startsWith("collection.") ? path.slice("collection.".length) : path;
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

export default function AdminPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const [collections, setCollections] = useState<StoredCollectionDefinition[]>([]);
  const [draft, setDraft] = useState<CollectionDraft>(createEmptyCollectionDraft);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const [collectionIssues, setCollectionIssues] = useState<DatamixSchemaValidationIssue[]>([]);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
  const [collectionLoadError, setCollectionLoadError] = useState<string | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [newFieldType, setNewFieldType] = useState<DatamixFieldType>("text");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

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
      return;
    }

    let cancelled = false;

    async function loadCollections() {
      setIsLoadingCollections(true);
      setCollectionLoadError(null);

      try {
        const nextCollections = await listCollectionDefinitions();

        if (cancelled) {
          return;
        }

        setCollections(nextCollections);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCollectionLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load collection definitions.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingCollections(false);
        }
      }
    }

    void loadCollections();

    return () => {
      cancelled = true;
    };
  }, [session.data]);

  if (session.isPending || setupStatus.isPending) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Checking your session</h1>
          <p className="body">
            Datamix is asking the API Worker whether this browser already has a valid session.
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

  const userLabel = session.data.user.name || session.data.user.email;
  const activeCollection = collections.find(
    (collection) => collection.definition.name === selectedCollectionName,
  );
  const isEditingExistingCollection = selectedCollectionName !== null;

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/login");
  };

  const handleStartNewCollection = () => {
    setSelectedCollectionName(null);
    setDraft(createEmptyCollectionDraft());
    setCollectionIssues([]);
    setCollectionMessage(null);
  };

  const handleEditCollection = (collection: StoredCollectionDefinition) => {
    setSelectedCollectionName(collection.definition.name);
    setDraft(createDraftFromDefinition(collection.definition));
    setCollectionIssues([]);
    setCollectionMessage(null);
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
      setSelectedCollectionName(nextStoredCollection.definition.name);
      setDraft(createDraftFromDefinition(nextStoredCollection.definition));
      setCollectionMessage(`${result.message} ${formatPlanSummary(result.plan)}`);
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
    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(true);

    try {
      const message = await sendInvite(
        inviteName
          ? {
              email: inviteEmail,
              name: inviteName,
            }
          : {
              email: inviteEmail,
            },
      );

      setInviteMessage(message);
      setInviteEmail("");
      setInviteName("");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <main className="admin-shell-page">
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-brand">
            <p className="eyebrow">Datamix admin</p>
            <h1 className="admin-brand-title">Dashboard</h1>
            <p className="admin-brand-copy">
              Calm control room for auth, collection modeling, and the slices that land
              next.
            </p>
          </div>

          <nav className="admin-nav">
            {adminNavItems.map((item) => {
              const itemClassName =
                item.state === "current"
                  ? "admin-nav-item is-current"
                  : item.state === "ready"
                    ? "admin-nav-item"
                    : "admin-nav-item is-muted";

              return item.state === "soon" ? (
                <div className={itemClassName} key={item.id}>
                  <div>
                    <p className="admin-nav-label">{item.label}</p>
                    <p className="admin-nav-copy">{item.description}</p>
                  </div>
                  <span className="status-pill status-pill-muted">Soon</span>
                </div>
              ) : (
                <a
                  aria-current={item.state === "current" ? "page" : undefined}
                  className={itemClassName}
                  href={`#${item.id}`}
                  key={item.id}
                >
                  <div>
                    <p className="admin-nav-label">{item.label}</p>
                    <p className="admin-nav-copy">{item.description}</p>
                  </div>
                  <span className="status-pill">
                    {item.state === "current" ? "Live" : "Ready"}
                  </span>
                </a>
              );
            })}
          </nav>

          <section className="admin-sidebar-card">
            <p className="admin-sidebar-heading">Current session</p>
            <p className="admin-sidebar-user">{userLabel}</p>
            <p className="admin-sidebar-copy">{session.data.user.email}</p>
            <div className="status-row">
              <span className="status-pill">Setup complete</span>
              <span className="status-pill">Collection builder live</span>
              <span className="status-pill status-pill-muted">
                {adminPublicEnv.NEXT_PUBLIC_APP_ENV}
              </span>
            </div>
          </section>

          <section className="admin-sidebar-card">
            <div className="section-row">
              <p className="admin-sidebar-heading">Collections</p>
              <button className="mini-button" onClick={handleStartNewCollection} type="button">
                New
              </button>
            </div>
            <div className="mini-list">
              {isLoadingCollections ? (
                <p className="admin-sidebar-copy">Loading collection definitions...</p>
              ) : collections.length === 0 ? (
                <p className="admin-sidebar-copy">
                  No saved collections yet. Start with a simple model and add fields in the
                  builder.
                </p>
              ) : (
                collections.map((collection) => (
                  <button
                    className={
                      collection.definition.name === selectedCollectionName
                        ? "mini-list-item is-selected"
                        : "mini-list-item"
                    }
                    key={collection.definition.name}
                    onClick={() => handleEditCollection(collection)}
                    type="button"
                  >
                    <span>{collection.definition.label}</span>
                    <small>{collection.definition.fields.length} fields</small>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">Authenticated shell</p>
              <h2 className="admin-page-title">Define collections directly from the admin</h2>
              <p className="admin-page-copy">
                The collection schema is the edit-form contract. This first builder keeps
                the UI simple and readable while letting you create, adjust, and reorder
                fields without leaving the browser.
              </p>
            </div>

            <div className="actions">
              <a className="button button-secondary" href="#collections-builder">
                Open builder
              </a>
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

          <section className="admin-grid" id="overview">
            <article className="admin-card admin-card-hero">
              <p className="card-eyebrow">Collection modeling</p>
              <h3 className="card-title">Schema definition now starts in this shell</h3>
              <p className="card-copy">
                Use the builder below to define a collection name, add field types, and
                move them into the order the future record editor should follow.
              </p>
              <div className="status-row">
                <span className="status-pill">Authenticated</span>
                <span className="status-pill">Schema validation live</span>
                <span className="status-pill">D1 planning live</span>
              </div>
            </article>

            <article className="admin-card" id="collections">
              <p className="card-eyebrow">Instance state</p>
              <h3 className="card-title">
                {collections.length === 0
                  ? "No collections saved yet"
                  : `${collections.length} collection${collections.length === 1 ? "" : "s"} saved`}
              </h3>
              <p className="card-copy">
                {collections.length === 0
                  ? "Start with a narrow content model and iterate. Additive field changes are the smoothest first path."
                  : "Select an existing collection from the sidebar or start a fresh one to shape another content type."}
              </p>
              <div className="actions">
                <button className="button button-secondary" onClick={handleStartNewCollection} type="button">
                  New collection
                </button>
                <a className="button button-secondary" href="#invite">
                  Invite teammate
                </a>
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
                  future editing order for records.
                </p>
              </div>
              <div className="actions">
                <button className="button button-secondary" onClick={handleStartNewCollection} type="button">
                  Reset draft
                </button>
              </div>
            </div>

            <form className="collection-form" onSubmit={handleSaveCollection}>
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
                    Add field definitions, then move them into the order future record
                    editors should follow.
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

              {collectionLoadError ? <p className="form-error">{collectionLoadError}</p> : null}
              {collectionMessage ? (
                <p
                  className={
                    collectionIssues.length > 0 ? "form-error form-message-block" : "form-success form-message-block"
                  }
                >
                  {collectionMessage}
                </p>
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
                <button className="button" disabled={isSavingCollection} type="submit">
                  {isSavingCollection
                    ? "Saving collection..."
                    : isEditingExistingCollection
                      ? "Save collection changes"
                      : "Create collection"}
                </button>
              </div>
            </form>
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
              <p className="card-eyebrow">Coming online later</p>
              <h3 className="card-title">Media and richer editors still stay in later slices</h3>
              <p className="card-copy">
                This builder intentionally stops at schema definition. Record editing,
                markdown/rich text ergonomics, and media picking stay decoupled until the
                next milestones.
              </p>
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-card" id="invite">
              <p className="card-eyebrow">Team access</p>
              <h3 className="card-title">Invite a teammate</h3>
              <p className="card-copy">
                Datamix emails a secure invite link and routes the recipient through
                password setup on first sign-in.
              </p>

              <form className="auth-form" onSubmit={handleInviteSubmit}>
                <label className="field">
                  <span>Name</span>
                  <input
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Optional display name"
                    type="text"
                    value={inviteName}
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                    type="email"
                    value={inviteEmail}
                  />
                </label>

                {inviteError ? <p className="form-error">{inviteError}</p> : null}
                {inviteMessage ? <p className="form-success">{inviteMessage}</p> : null}

                <div className="actions">
                  <button className="button" disabled={isInviting} type="submit">
                    {isInviting ? "Sending invite..." : "Send invite"}
                  </button>
                </div>
              </form>
            </article>

            <article className="admin-card" id="settings">
              <p className="card-eyebrow">Session and runtime</p>
              <h3 className="card-title">Stable foundation for the next slices</h3>
              <dl className="detail-list" id="session">
                <div>
                  <dt>Signed in as</dt>
                  <dd>{userLabel}</dd>
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
                  <dt>Auth posture</dt>
                  <dd>Persisted better-auth session on the API Worker origin</dd>
                </div>
              </dl>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
