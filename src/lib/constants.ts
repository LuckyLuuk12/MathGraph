/**
 * MathGraph: Constant Enumerations
 * 
 * Enums for type safety across the application
 */

// ============================================================================
// OBJECT KINDS
// ============================================================================

export enum ObjectKind {
  Entity = 'Entity',
  Value = 'Value',
  Power = 'Power',
  Sequence = 'Sequence',
  Label = 'Label'
}

// ============================================================================
// DATA TYPES (for Label Types)
// ============================================================================

export enum DataType {
  String = 'String',
  Integer = 'Integer',
  Decimal = 'Decimal',
  Boolean = 'Boolean',
  Date = 'Date',
  DateTime = 'DateTime'
}

// ============================================================================
// CONSTRAINT TYPES
// ============================================================================

export enum ConstraintType {
  Uniqueness = 'Uniqueness',
  TotalRole = 'TotalRole',
  SetConstraint = 'SetConstraint',
  Cardinality = 'Cardinality',
  Frequency = 'Frequency',
  Enumeration = 'Enumeration',
  Custom = 'Custom'
}

export enum SetConstraintType {
  Subset = 'Subset',
  Equality = 'Equality',
  Exclusion = 'Exclusion'
}

export enum ViolationSeverity {
  Error = 'Error',
  Warning = 'Warning'
}

// ============================================================================
// SQL DIALECTS
// ============================================================================

export enum SQLDialect {
  PostgreSQL = 'PostgreSQL',
  MySQL = 'MySQL',
  SQLite = 'SQLite',
  SQLServer = 'SQL Server'
}

// ============================================================================
// SQL DATA TYPES (mapped from DataType)
// ============================================================================

export const SQL_TYPE_MAPPING = {
  [SQLDialect.PostgreSQL]: {
    [DataType.String]: 'VARCHAR(255)',
    [DataType.Integer]: 'INTEGER',
    [DataType.Decimal]: 'NUMERIC(10,2)',
    [DataType.Boolean]: 'BOOLEAN',
    [DataType.Date]: 'DATE',
    [DataType.DateTime]: 'TIMESTAMP'
  },
  [SQLDialect.MySQL]: {
    [DataType.String]: 'VARCHAR(255)',
    [DataType.Integer]: 'INT',
    [DataType.Decimal]: 'DECIMAL(10,2)',
    [DataType.Boolean]: 'BOOLEAN',
    [DataType.Date]: 'DATE',
    [DataType.DateTime]: 'DATETIME'
  },
  [SQLDialect.SQLite]: {
    [DataType.String]: 'TEXT',
    [DataType.Integer]: 'INTEGER',
    [DataType.Decimal]: 'REAL',
    [DataType.Boolean]: 'INTEGER', // SQLite uses 0/1
    [DataType.Date]: 'TEXT',
    [DataType.DateTime]: 'TEXT'
  },
  [SQLDialect.SQLServer]: {
    [DataType.String]: 'NVARCHAR(255)',
    [DataType.Integer]: 'INT',
    [DataType.Decimal]: 'DECIMAL(10,2)',
    [DataType.Boolean]: 'BIT',
    [DataType.Date]: 'DATE',
    [DataType.DateTime]: 'DATETIME2'
  }
} as const;

// ============================================================================
// FOREIGN KEY ACTIONS
// ============================================================================

export enum ForeignKeyAction {
  CASCADE = 'CASCADE',
  SET_NULL = 'SET NULL',
  RESTRICT = 'RESTRICT',
  NO_ACTION = 'NO ACTION'
}

// ============================================================================
// GRAPH ELEMENT TYPES
// ============================================================================

export enum GraphElementType {
  Entity = 'Entity',
  Value = 'Value',
  Power = 'Power',
  Sequence = 'Sequence',
  Label = 'Label',
  ObjectifiedFact = 'ObjectifiedFact'
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SCHEMA_VERSION = '1.0.0';
export const DEFAULT_STRING_LENGTH = 255;
export const DEFAULT_DECIMAL_PRECISION = 10;
export const DEFAULT_DECIMAL_SCALE = 2;

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  UNIQUENESS_VIOLATION: 'Uniqueness constraint violated',
  TOTAL_ROLE_VIOLATION: 'Total role constraint violated - mandatory participation required',
  SUBSET_VIOLATION: 'Subset constraint violated',
  EQUALITY_VIOLATION: 'Equality constraint violated',
  EXCLUSION_VIOLATION: 'Exclusion constraint violated',
  CARDINALITY_MIN_VIOLATION: 'Minimum cardinality constraint violated',
  CARDINALITY_MAX_VIOLATION: 'Maximum cardinality constraint violated',
  FREQUENCY_MIN_VIOLATION: 'Minimum frequency constraint violated',
  FREQUENCY_MAX_VIOLATION: 'Maximum frequency constraint violated',
  ENUMERATION_VIOLATION: 'Value not in allowed enumeration',
  INVALID_POPULATION: 'Illegal population detected'
} as const;
