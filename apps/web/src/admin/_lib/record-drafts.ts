import {
  isRecordCrudFieldDefinition,
  type DatamixCollectionDefinition,
  type DatamixFieldDefinition,
} from "@datamix/core";

import type {
  PrimitiveRecordValue,
  StoredCollectionRecord,
} from "@/lib/records";

export type GeneratedRecordFormValue = boolean | string;
export type GeneratedRecordFormState = Record<string, GeneratedRecordFormValue>;

type GeneratedRecordPayloadValue = boolean | number | string | string[] | null;

export function createGeneratedRecordFormState(
  definition: DatamixCollectionDefinition,
): GeneratedRecordFormState {
  return Object.fromEntries(
    definition.fields.map((field) => [
      field.name,
      field.type === "boolean" ? false : "",
    ]),
  );
}

export function createGeneratedRecordFormStateFromRecord(
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

export function createGeneratedRecordPayload(
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

export function createPersistedRecordPayload(
  definition: DatamixCollectionDefinition,
  values: GeneratedRecordFormState,
): Record<string, PrimitiveRecordValue> {
  const payload: Record<string, PrimitiveRecordValue> = {};

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
        payload[field.name] =
          typeof rawValue === "string" ? readListValues(rawValue) : [];
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

export function createGeneratedFieldHint(field: DatamixFieldDefinition) {
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

export function createGeneratedFieldPlaceholder(field: DatamixFieldDefinition) {
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

export function summarizeRecord(
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

export function upsertRecord(
  records: StoredCollectionRecord[],
  nextRecord: StoredCollectionRecord,
) {
  return [...records.filter((record) => record.id !== nextRecord.id), nextRecord].sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  );
}
