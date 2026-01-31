/**
 * MathGraph Library Exports
 * 
 * Main entry point for all MathGraph modules
 */

// Core modules
export { ConstraintValidator, createNoEmptyConstraint } from './validation';
export { SQLGenerator, exportToSQL } from './sql-generator';
export { SchemaConverter } from './schema-converter';
export {
  graphStore,
  validationStore,
  nodeCountStore,
  edgeCountStore,
  isValidStore,
  getCurrentSchema,
  getCurrentPopulation,
  exportGraphState
} from './stores/graph-store';

// Canvas and visual modeling
export { canvasStore } from './stores/canvas-store';
export { theme } from './stores/theme-store';
export { TOOLS } from './canvas-types';

// Utility functions
export {
  generateId,
  createEntity,
  createLabelType,
  createBinaryFactType,
  createUnaryFactType,
  createUniqueConstraint,
  createTotalRoleConstraint,
  createSetConstraint,
  createCardinalityConstraint,
  createEnumerationConstraint,
  createFrequencyConstraint,
  serializeSchema,
  deserializeSchema,
  downloadSchema,
  downloadSQL,
  formatConstraintName,
  isValidEmail,
  matchesDataType
} from './utils';

// Constants and enums
export {
  ObjectKind,
  DataType,
  ConstraintType,
  SetConstraintType,
  ViolationSeverity,
  SQLDialect,
  ForeignKeyAction,
  GraphElementType,
  SQL_TYPE_MAPPING,
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_STRING_LENGTH,
  DEFAULT_DECIMAL_PRECISION,
  DEFAULT_DECIMAL_SCALE,
  VALIDATION_MESSAGES
} from './constants';



