import type { DatamixCollectionDefinition, DatamixFieldDefinition } from "./collections";

export const datamixCollectionDefinitionsTableName = "dmx_collections";
export const datamixCollectionRecordTablePrefix = "dmx_records_";

export const datamixSystemColumnNames = ["id", "created_at", "updated_at"] as const;

export type DatamixSystemColumnName = (typeof datamixSystemColumnNames)[number];
export type DatamixSqliteColumnType = "INTEGER" | "REAL" | "TEXT";
export type DatamixFieldStorageMode = "json" | "scalar";
export type DatamixCollectionMutationMode = "add_columns" | "create" | "noop" | "rebuild";

export type DatamixCollectionStorageColumn = {
  columnName: string;
  fieldName: string;
  sqliteType: DatamixSqliteColumnType;
  storageMode: DatamixFieldStorageMode;
  storageSignature: string;
};

export type DatamixCollectionStorageShape = {
  collectionName: string;
  columns: DatamixCollectionStorageColumn[];
  tableName: string;
};

export type DatamixCollectionChangedColumn = {
  fieldName: string;
  next: DatamixCollectionStorageColumn;
  previous: DatamixCollectionStorageColumn;
};

export type DatamixCollectionStoragePlan = {
  addedColumns: DatamixCollectionStorageColumn[];
  changedColumns: DatamixCollectionChangedColumn[];
  mode: DatamixCollectionMutationMode;
  nextShape: DatamixCollectionStorageShape;
  previousShape: DatamixCollectionStorageShape | null;
  removedColumns: DatamixCollectionStorageColumn[];
  tableName: string;
};

function createStorageColumn(
  field: DatamixFieldDefinition,
  sqliteType: DatamixSqliteColumnType,
  storageMode: DatamixFieldStorageMode,
) {
  return {
    columnName: field.name,
    fieldName: field.name,
    sqliteType,
    storageMode,
    storageSignature: `${sqliteType}:${storageMode}`,
  };
}

function createFieldStorageColumn(field: DatamixFieldDefinition): DatamixCollectionStorageColumn {
  switch (field.type) {
    case "number":
      return createStorageColumn(field, "REAL", "scalar");
    case "boolean":
      return createStorageColumn(field, "INTEGER", "scalar");
    case "imageGallery":
      return createStorageColumn(field, "TEXT", "json");
    case "relationship":
      return createStorageColumn(field, "TEXT", field.multiple ? "json" : "scalar");
    case "text":
    case "date":
    case "select":
    case "richText":
    case "markdown":
    case "image":
      return createStorageColumn(field, "TEXT", "scalar");
  }
}

function createColumnMap(shape: DatamixCollectionStorageShape) {
  const entries = shape.columns.map((column) => [column.fieldName, column] as const);

  return new Map(entries);
}

export function createCollectionRecordTableName(collectionName: string) {
  return `${datamixCollectionRecordTablePrefix}${collectionName}`;
}

export function createCollectionStorageShape(
  definition: DatamixCollectionDefinition,
): DatamixCollectionStorageShape {
  return {
    collectionName: definition.name,
    columns: definition.fields.map(createFieldStorageColumn),
    tableName: createCollectionRecordTableName(definition.name),
  };
}

export function planCollectionStorageMutation(
  previousDefinition: DatamixCollectionDefinition | null,
  nextDefinition: DatamixCollectionDefinition,
): DatamixCollectionStoragePlan {
  const nextShape = createCollectionStorageShape(nextDefinition);

  if (!previousDefinition) {
    return {
      addedColumns: nextShape.columns,
      changedColumns: [],
      mode: "create",
      nextShape,
      previousShape: null,
      removedColumns: [],
      tableName: nextShape.tableName,
    };
  }

  const previousShape = createCollectionStorageShape(previousDefinition);
  const previousColumns = createColumnMap(previousShape);
  const nextColumns = createColumnMap(nextShape);

  const addedColumns = nextShape.columns.filter((column) => !previousColumns.has(column.fieldName));
  const removedColumns = previousShape.columns.filter((column) => !nextColumns.has(column.fieldName));
  const changedColumns = nextShape.columns.flatMap((column) => {
    const previousColumn = previousColumns.get(column.fieldName);

    if (!previousColumn || previousColumn.storageSignature === column.storageSignature) {
      return [];
    }

    return [
      {
        fieldName: column.fieldName,
        next: column,
        previous: previousColumn,
      },
    ];
  });

  const mode: DatamixCollectionMutationMode =
    removedColumns.length > 0 || changedColumns.length > 0
      ? "rebuild"
      : addedColumns.length > 0
        ? "add_columns"
        : "noop";

  return {
    addedColumns,
    changedColumns,
    mode,
    nextShape,
    previousShape,
    removedColumns,
    tableName: nextShape.tableName,
  };
}
