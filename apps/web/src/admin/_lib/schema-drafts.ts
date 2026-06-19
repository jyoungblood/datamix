import type {
  DatamixCollectionDefinition,
  DatamixFieldType,
  DatamixSelectOption,
} from "@datamix/core";

import type {
  SavedCollectionPlanSummary,
  StoredCollectionDefinition,
} from "@/lib/collection-definitions";

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

export type CollectionFieldDraft =
  | CollectionScalarFieldDraft
  | CollectionSelectFieldDraft
  | CollectionRelationshipFieldDraft;

export type CollectionDraft = {
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

export function createFieldDraft(
  type: DatamixFieldType = "text",
): CollectionFieldDraft {
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

export function createEmptyCollectionDraft(): CollectionDraft {
  return {
    description: "",
    fields: [],
    label: "",
    name: "",
  };
}

export function createDraftFromDefinition(
  definition: DatamixCollectionDefinition,
): CollectionDraft {
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

export function serializeDraft(
  draft: CollectionDraft,
): DatamixCollectionDefinition {
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

export function formatIssuePath(path: string) {
  if (path.startsWith("collection.")) {
    return path.slice("collection.".length);
  }

  if (path.startsWith("record.values.")) {
    return path.slice("record.values.".length);
  }

  return path;
}

export function formatCollectionSummary(
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

export function formatPlanSummary(plan: SavedCollectionPlanSummary) {
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

export function moveItem<TItem>(
  items: TItem[],
  fromIndex: number,
  direction: -1 | 1,
) {
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
