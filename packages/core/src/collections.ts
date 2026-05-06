export const datamixFieldTypes = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "relationship",
  "richText",
  "markdown",
  "image",
  "imageGallery",
] as const;

export type DatamixFieldType = (typeof datamixFieldTypes)[number];

export type DatamixSelectOption = {
  label: string;
  value: string;
};

type DatamixFieldBase<TType extends DatamixFieldType> = {
  type: TType;
  name: string;
  label: string;
  required: boolean;
  description?: string;
};

export type DatamixTextFieldDefinition = DatamixFieldBase<"text">;
export type DatamixNumberFieldDefinition = DatamixFieldBase<"number">;
export type DatamixBooleanFieldDefinition = DatamixFieldBase<"boolean">;
export type DatamixDateFieldDefinition = DatamixFieldBase<"date">;
export type DatamixRichTextFieldDefinition = DatamixFieldBase<"richText">;
export type DatamixMarkdownFieldDefinition = DatamixFieldBase<"markdown">;
export type DatamixImageFieldDefinition = DatamixFieldBase<"image">;
export type DatamixImageGalleryFieldDefinition = DatamixFieldBase<"imageGallery">;

export type DatamixSelectFieldDefinition = DatamixFieldBase<"select"> & {
  options: DatamixSelectOption[];
};

export type DatamixRelationshipFieldDefinition = DatamixFieldBase<"relationship"> & {
  multiple: boolean;
  targetCollection: string;
};

export type DatamixFieldDefinition =
  | DatamixTextFieldDefinition
  | DatamixNumberFieldDefinition
  | DatamixBooleanFieldDefinition
  | DatamixDateFieldDefinition
  | DatamixSelectFieldDefinition
  | DatamixRelationshipFieldDefinition
  | DatamixRichTextFieldDefinition
  | DatamixMarkdownFieldDefinition
  | DatamixImageFieldDefinition
  | DatamixImageGalleryFieldDefinition;

export type DatamixCollectionDefinition = {
  name: string;
  label: string;
  description?: string;
  fields: DatamixFieldDefinition[];
};

export type DatamixSchemaValidationIssue = {
  path: string;
  message: string;
};

export type DatamixValidationResult<TValue> =
  | {
      success: true;
      data: TValue;
    }
  | {
      success: false;
      issues: DatamixSchemaValidationIssue[];
    };

const identifierPattern = /^[a-z][a-z0-9_]*$/;
const reservedFieldNames = new Set(["id", "created_at", "updated_at"]);
const baseFieldKeys = ["description", "label", "name", "required", "type"] as const;
const collectionKeys = ["description", "fields", "label", "name"] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushIssue(
  issues: DatamixSchemaValidationIssue[],
  path: string,
  message: string,
) {
  issues.push({ path, message });
}

function pushUnexpectedKeyIssues(
  input: UnknownRecord,
  allowedKeys: readonly string[],
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      pushIssue(issues, `${path}.${key}`, "This property is not supported in the v0 schema model.");
    }
  }
}

function readTrimmedString(
  input: UnknownRecord,
  key: string,
  path: string,
  issues: DatamixSchemaValidationIssue[],
  options?: {
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  },
) {
  const value = input[key];

  if (typeof value !== "string") {
    pushIssue(issues, `${path}.${key}`, "Expected a string.");
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    pushIssue(issues, `${path}.${key}`, "This value is required.");
    return null;
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    pushIssue(
      issues,
      `${path}.${key}`,
      `Must be ${options.maxLength} characters or fewer.`,
    );
  }

  if (options?.pattern && !options.pattern.test(trimmed)) {
    pushIssue(
      issues,
      `${path}.${key}`,
      options.patternMessage ?? "This value has an invalid format.",
    );
  }

  return trimmed;
}

function readOptionalTrimmedString(
  input: UnknownRecord,
  key: string,
  path: string,
  issues: DatamixSchemaValidationIssue[],
  options?: {
    maxLength?: number;
  },
) {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    pushIssue(issues, `${path}.${key}`, "Expected a string.");
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    pushIssue(
      issues,
      `${path}.${key}`,
      `Must be ${options.maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function readBoolean(
  input: UnknownRecord,
  key: string,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  const value = input[key];

  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    pushIssue(issues, `${path}.${key}`, "Expected a boolean.");
    return false;
  }

  return value;
}

function readIdentifier(
  input: UnknownRecord,
  key: string,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  return readTrimmedString(input, key, path, issues, {
    maxLength: 64,
    pattern: identifierPattern,
    patternMessage:
      "Use lowercase letters, numbers, and underscores, starting with a letter.",
  });
}

function readLabel(
  input: UnknownRecord,
  key: string,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  return readTrimmedString(input, key, path, issues, {
    maxLength: 80,
  });
}

function readFieldType(
  input: UnknownRecord,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  const type = input.type;

  if (typeof type !== "string") {
    pushIssue(issues, `${path}.type`, "Expected a supported field type.");
    return null;
  }

  if (!isDatamixFieldType(type)) {
    pushIssue(
      issues,
      `${path}.type`,
      `Unsupported field type "${type}".`,
    );
    return null;
  }

  return type;
}

function readSelectOptions(
  input: UnknownRecord,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  const value = input.options;

  if (!Array.isArray(value)) {
    pushIssue(issues, `${path}.options`, "Expected an array of select options.");
    return null;
  }

  if (value.length === 0) {
    pushIssue(issues, `${path}.options`, "At least one select option is required.");
  }

  const optionValues = new Set<string>();
  const options: DatamixSelectOption[] = [];

  value.forEach((item, index) => {
    const optionPath = `${path}.options[${index}]`;

    if (!isRecord(item)) {
      pushIssue(issues, optionPath, "Each select option must be an object.");
      return;
    }

    pushUnexpectedKeyIssues(item, ["label", "value"], optionPath, issues);

    const label = readLabel(item, "label", optionPath, issues);
    const optionValue = readTrimmedString(item, "value", optionPath, issues, {
      maxLength: 64,
      pattern: identifierPattern,
      patternMessage:
        "Use lowercase letters, numbers, and underscores, starting with a letter.",
    });

    if (!label || !optionValue) {
      return;
    }

    if (optionValues.has(optionValue)) {
      pushIssue(issues, `${optionPath}.value`, `Duplicate option value "${optionValue}".`);
      return;
    }

    optionValues.add(optionValue);
    options.push({
      label,
      value: optionValue,
    });
  });

  return options;
}

function readRelationshipTarget(
  input: UnknownRecord,
  path: string,
  issues: DatamixSchemaValidationIssue[],
) {
  return readTrimmedString(input, "targetCollection", path, issues, {
    maxLength: 64,
    pattern: identifierPattern,
    patternMessage:
      "Use lowercase letters, numbers, and underscores, starting with a letter.",
  });
}

function parseFieldDefinition(
  input: unknown,
  index: number,
  issues: DatamixSchemaValidationIssue[],
) {
  const path = `fields[${index}]`;

  if (!isRecord(input)) {
    pushIssue(issues, path, "Each field definition must be an object.");
    return null;
  }

  const type = readFieldType(input, path, issues);
  const allowedKeys: string[] = [...baseFieldKeys];

  if (type === "select") {
    allowedKeys.push("options");
  }

  if (type === "relationship") {
    allowedKeys.push("multiple", "targetCollection");
  }

  pushUnexpectedKeyIssues(input, allowedKeys, path, issues);

  const name = readIdentifier(input, "name", path, issues);
  const label = readLabel(input, "label", path, issues);
  const description = readOptionalTrimmedString(input, "description", path, issues, {
    maxLength: 280,
  });
  const required = readBoolean(input, "required", path, issues);

  if (name && reservedFieldNames.has(name)) {
    pushIssue(
      issues,
      `${path}.name`,
      `"${name}" is reserved for Datamix system fields.`,
    );
  }

  if (!type || !name || !label) {
    return null;
  }

  const baseField = {
    label,
    name,
    required,
    type,
    ...(description ? { description } : {}),
  };

  if (type === "select") {
    const options = readSelectOptions(input, path, issues);

    if (!options) {
      return null;
    }

    return {
      ...baseField,
      type: "select" as const,
      options,
    };
  }

  if (type === "relationship") {
    const targetCollection = readRelationshipTarget(input, path, issues);
    const multiple = readBoolean(input, "multiple", path, issues);

    if (!targetCollection) {
      return null;
    }

    return {
      ...baseField,
      type: "relationship" as const,
      multiple,
      targetCollection,
    };
  }

  return {
    ...baseField,
    type,
  };
}

export function isDatamixFieldType(value: string): value is DatamixFieldType {
  return datamixFieldTypes.includes(value as DatamixFieldType);
}

export function validateCollectionDefinition(
  input: unknown,
): DatamixValidationResult<DatamixCollectionDefinition> {
  const issues: DatamixSchemaValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ path: "collection", message: "Collection definition must be an object." }],
    };
  }

  pushUnexpectedKeyIssues(input, collectionKeys, "collection", issues);

  const name = readIdentifier(input, "name", "collection", issues);
  const label = readLabel(input, "label", "collection", issues);
  const description = readOptionalTrimmedString(input, "description", "collection", issues, {
    maxLength: 280,
  });

  const fieldValue = input.fields;

  if (!Array.isArray(fieldValue)) {
    pushIssue(issues, "collection.fields", "Expected an array of field definitions.");
  }

  const fields = Array.isArray(fieldValue)
    ? fieldValue
        .map((field, index) => parseFieldDefinition(field, index, issues))
        .filter((field): field is DatamixFieldDefinition => field !== null)
    : [];

  const fieldNames = new Set<string>();

  fields.forEach((field, index) => {
    if (fieldNames.has(field.name)) {
      pushIssue(
        issues,
        `fields[${index}].name`,
        `Duplicate field name "${field.name}".`,
      );
      return;
    }

    fieldNames.add(field.name);
  });

  if (issues.length > 0 || !name || !label || !Array.isArray(fieldValue)) {
    return {
      success: false,
      issues,
    };
  }

  return {
    success: true,
    data: {
      name,
      label,
      fields,
      ...(description ? { description } : {}),
    },
  };
}

export function assertCollectionDefinition(input: unknown) {
  const result = validateCollectionDefinition(input);

  if (!result.success) {
    const errorLines = result.issues.map((issue) => `${issue.path}: ${issue.message}`);

    throw new Error(
      `Invalid Datamix collection definition.\n${errorLines.join("\n")}`,
    );
  }

  return result.data;
}
