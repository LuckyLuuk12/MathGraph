/**
 * MathGraph: Utility Functions
 * 
 * Helper functions for common operations
 */

/**
 * Generate a unique identifier
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a simple entity with default settings
 */
export function createEntity(name: string): Entity {
  const id = generateId();
  return {
    id,
    name,
    kind: 'Entity',
    identifiers: [{
      id: generateId(),
      name: `PK_${name}`,
      predicatorIds: [],
      isPrimary: true
    }]
  };
}

/**
 * Create a label type with default settings
 */
export function createLabelType(
  name: string,
  dataType: 'String' | 'Integer' | 'Decimal' | 'Boolean' | 'Date' | 'DateTime' = 'String'
): LabelType {
  return {
    id: generateId(),
    name,
    kind: 'Label',
    dataType
  };
}

/**
 * Create a binary fact type between two objects
 */
export function createBinaryFactType(
  name: string,
  sourceObjectId: string,
  targetObjectId: string,
  sourceName: string = 'source',
  targetName: string = 'target',
  sourceOptional: boolean = false,
  targetOptional: boolean = false
): { factType: FactType; predicators: [Predicator, Predicator] } {
  const factTypeId = generateId();

  const pred1: Predicator = {
    id: generateId(),
    name: sourceName,
    factTypeId,
    position: 0,
    objectId: sourceObjectId,
    isOptional: sourceOptional
  };

  const pred2: Predicator = {
    id: generateId(),
    name: targetName,
    factTypeId,
    position: 1,
    objectId: targetObjectId,
    isOptional: targetOptional
  };

  const factType: FactType = {
    id: factTypeId,
    name,
    predicators: [pred1.id, pred2.id],
    isUnary: false,
    isObjectified: false,
    arity: 2
  };

  return { factType, predicators: [pred1, pred2] };
}

/**
 * Create a unary fact type (boolean property)
 */
export function createUnaryFactType(
  name: string,
  objectId: string
): { factType: FactType; predicator: Predicator } {
  const factTypeId = generateId();

  const predicator: Predicator = {
    id: generateId(),
    name: name,
    factTypeId,
    position: 0,
    objectId,
    isOptional: true
  };

  const factType: FactType = {
    id: factTypeId,
    name,
    predicators: [predicator.id],
    isUnary: true,
    isObjectified: false,
    arity: 1
  };

  return { factType, predicator };
}

/**
 * Create a uniqueness constraint
 */
export function createUniqueConstraint(
  name: string,
  predicatorIds: string[],
  isPrimary: boolean = false
): UniqueConstraint {
  return {
    id: generateId(),
    name,
    predicatorIds,
    isPrimary,
    isPreferred: isPrimary
  };
}

/**
 * Create a total role constraint (mandatory)
 */
export function createTotalRoleConstraint(
  name: string,
  predicatorId: string,
  objectId: string
): TotalRoleConstraint {
  return {
    id: generateId(),
    name,
    predicatorId,
    objectId
  };
}

/**
 * Create a set constraint
 */
export function createSetConstraint(
  name: string,
  type: 'Subset' | 'Equality' | 'Exclusion',
  sourcePredicatorIds: string[],
  targetPredicatorIds: string[]
): SetConstraint {
  return {
    id: generateId(),
    name,
    type,
    sourcePredicatorIds,
    targetPredicatorIds
  };
}

/**
 * Create a cardinality constraint
 */
export function createCardinalityConstraint(
  name: string,
  predicatorId: string,
  min?: number,
  max?: number
): CardinalityConstraint {
  return {
    id: generateId(),
    name,
    predicatorId,
    min,
    max
  };
}

/**
 * Create an enumeration constraint
 */
export function createEnumerationConstraint(
  name: string,
  labelTypeId: string,
  allowedValues: Omega[]
): EnumerationConstraint {
  return {
    id: generateId(),
    name,
    labelTypeId,
    allowedValues
  };
}

/**
 * Create a frequency constraint
 */
export function createFrequencyConstraint(
  name: string,
  factTypeId: string,
  min?: number,
  max?: number
): FrequencyConstraint {
  return {
    id: generateId(),
    name,
    factTypeId,
    min,
    max
  };
}

/**
 * Serialize schema to JSON (for export/save)
 */
export function serializeSchema(schema: InformationSchema): string {
  const serializable = {
    ...schema,
    objects: Array.from(schema.objects.entries()),
    entities: Array.from(schema.entities.entries()),
    factTypes: Array.from(schema.factTypes.entries()),
    predicators: Array.from(schema.predicators.entries()),
    powerTypes: Array.from(schema.powerTypes.entries()),
    sequenceTypes: Array.from(schema.sequenceTypes.entries()),
    labelTypes: Array.from(schema.labelTypes.entries()),
    uniqueConstraints: Array.from(schema.uniqueConstraints.entries()),
    totalRoleConstraints: Array.from(schema.totalRoleConstraints.entries()),
    setConstraints: Array.from(schema.setConstraints.entries()),
    cardinalityConstraints: Array.from(schema.cardinalityConstraints.entries()),
    frequencyConstraints: Array.from(schema.frequencyConstraints.entries()),
    enumerationConstraints: Array.from(schema.enumerationConstraints.entries()),
    customConstraints: Array.from(schema.customConstraints.entries())
  };

  return JSON.stringify(serializable, null, 2);
}

/**
 * Deserialize schema from JSON (for import/load)
 */
export function deserializeSchema(json: string): InformationSchema {
  const data = JSON.parse(json);

  return {
    ...data,
    objects: new Map(data.objects),
    entities: new Map(data.entities),
    factTypes: new Map(data.factTypes),
    predicators: new Map(data.predicators),
    powerTypes: new Map(data.powerTypes),
    sequenceTypes: new Map(data.sequenceTypes),
    labelTypes: new Map(data.labelTypes),
    uniqueConstraints: new Map(data.uniqueConstraints),
    totalRoleConstraints: new Map(data.totalRoleConstraints),
    setConstraints: new Map(data.setConstraints),
    cardinalityConstraints: new Map(data.cardinalityConstraints),
    frequencyConstraints: new Map(data.frequencyConstraints),
    enumerationConstraints: new Map(data.enumerationConstraints),
    customConstraints: new Map(data.customConstraints)
  };
}

/**
 * Download schema as JSON file
 */
export function downloadSchema(schema: InformationSchema, filename: string = 'schema.json') {
  const json = serializeSchema(schema);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Download SQL as .sql file
 */
export function downloadSQL(sql: string, filename: string = 'schema.sql') {
  const blob = new Blob([sql], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Format constraint name from predicator names
 */
export function formatConstraintName(prefix: string, predicatorNames: string[]): string {
  const names = predicatorNames.join('_');
  return `${prefix}_${names}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

/**
 * Check if value matches a data type
 */
export function matchesDataType(value: Omega, dataType: 'String' | 'Integer' | 'Decimal' | 'Boolean' | 'Date' | 'DateTime'): boolean {
  switch (dataType) {
    case 'String':
      return typeof value === 'string';
    case 'Integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'Decimal':
      return typeof value === 'number';
    case 'Boolean':
      return typeof value === 'boolean';
    case 'Date':
    case 'DateTime':
      return value instanceof Date;
    default:
      return false;
  }
}
