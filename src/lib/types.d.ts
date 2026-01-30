/**
 * MathGraph: Mathematical Type System for Information Modeling
 * 
 * This defines the core mathematical framework based on formal information systems theory.
 * The system models information through sets, functions, and constraints.
 */

// ============================================================================
// CORE DOMAIN: Ω (Omega) - Universe of Discourse
// ============================================================================

/** 
 * Ω represents the universal set - the domain of all possible instances
 * In practice, this is a union of all entity instances in the system
 */
type Omega = string | number | boolean | Date | null;

// ============================================================================
// PRIMARY SETS: P, O, E, F, G, S, L
// ============================================================================

/**
 * P: Predicators (Roles in relationships)
 * A predicator represents a position/role within a fact type
 */
interface Predicator {
  id: string;
  name: string;
  factTypeId: string; // Reference to parent fact type
  position: number; // Order within the fact type (0-indexed)
  objectId: string; // Reference to the object this role connects to (Base function)
  isOptional: boolean; // Whether this role has a total role constraint
}

/**
 * O: Objects (Entity Types, Value Types)
 * Objects are the fundamental building blocks that can participate in facts
 */
interface ObjectType {
  id: string;
  name: string;
  kind: 'Entity' | 'Value' | 'Power' | 'Sequence' | 'Label';
  objectifiedFactTypeId?: string; // If this is an objectified fact type
  specializationOf?: string[]; // Parent object IDs for generalization/specialization
  isAbstract?: boolean; // For abstract supertypes
}

/**
 * E: Entities (Subset of O)
 * Entity types that have independent existence
 */
interface Entity extends ObjectType {
  kind: 'Entity';
  identifiers: UniqueConstraint[]; // At least one uniqueness constraint required
}

/**
 * F: Fact Types
 * Represent relationships between objects through their predicators
 */
interface FactType {
  id: string;
  name: string;
  predicators: string[]; // IDs of predicators (ordered)
  isUnary: boolean; // Special case: single predicator (boolean-like property)
  isObjectified: boolean; // Whether this fact type acts as an entity
  objectifiedAsId?: string; // If objectified, the resulting object ID
  arity: number; // Number of predicators (1 for unary, 2+ for n-ary)
}

/**
 * G: Power Types
 * Represent collections/sets of entities
 */
interface PowerType extends ObjectType {
  kind: 'Power';
  elementTypeId: string; // The entity type this is a power type of
}

/**
 * S: Sequence Types
 * Represent ordered collections
 */
interface SequenceType extends ObjectType {
  kind: 'Sequence';
  elementTypeId: string; // The object type this is a sequence of
  isOrdered: boolean; // Always true for sequences
  allowsDuplicates: boolean;
}

/**
 * L: Label Types (Value Types with enumeration)
 * Constrained value domains (enums, bounded integers, etc.)
 */
interface LabelType extends ObjectType {
  kind: 'Label';
  dataType: 'String' | 'Integer' | 'Decimal' | 'Boolean' | 'Date' | 'DateTime';
  enumeration?: Omega[]; // Restricted domain values
  minValue?: number;
  maxValue?: number;
  pattern?: string; // Regex pattern for string validation
}

// ============================================================================
// CORE FUNCTIONS: Base and Pop
// ============================================================================

/**
 * Base: P → O
 * Maps each predicator to its object type
 * This is represented by the `objectId` field in Predicator
 */
type BaseFunction = (predicator: Predicator) => ObjectType;

/**
 * Pop: O → P(Ω)
 * Population function - maps objects to their set of instances
 * P(Ω) is the power set of Omega
 */
interface Population {
  objectId: string;
  instances: Set<Omega>;
}

/**
 * Fact population: instances of fact types
 * Each fact is a tuple of values corresponding to the predicators
 */
interface FactPopulation {
  factTypeId: string;
  tuples: Array<Map<string, Omega>>; // Map predicatorId -> value
}

// ============================================================================
// CONSTRAINTS
// ============================================================================

/**
 * Uniqueness Constraint
 * Ensures combinations of predicators form unique keys
 */
interface UniqueConstraint {
  id: string;
  name: string;
  predicatorIds: string[]; // Single or composite
  isPrimary: boolean; // Primary identifier for an entity
  isPreferred?: boolean; // Preferred identifier if multiple exist
}

/**
 * Total Role Constraint (Mandatory)
 * Every instance of an object must participate in this role
 */
interface TotalRoleConstraint {
  id: string;
  name: string;
  predicatorId: string; // The role that is mandatory
  objectId: string; // The object that must participate
}

/**
 * Set Constraint (Subset, Equality, Exclusion)
 * Constraints between populations of predicators
 */
interface SetConstraint {
  id: string;
  name: string;
  type: 'Subset' | 'Equality' | 'Exclusion';
  sourcePredicatorIds: string[]; // Left side of constraint
  targetPredicatorIds: string[]; // Right side of constraint
}

/**
 * Cardinality Constraint
 * Restricts how many times an instance can participate
 */
interface CardinalityConstraint {
  id: string;
  name: string;
  predicatorId: string;
  min?: number; // at_least(g, n)
  max?: number; // limit(g, m)
}

/**
 * Frequency Constraint
 * Restricts count of tuples for a fact type
 * frequency(σ, n, m): fact type σ has between n and m instances
 */
interface FrequencyConstraint {
  id: string;
  name: string;
  factTypeId: string;
  min?: number;
  max?: number;
}

/**
 * Enumeration Constraint (for Label Types)
 * Restricts label type to specific domain
 */
interface EnumerationConstraint {
  id: string;
  name: string;
  labelTypeId: string;
  allowedValues: Omega[];
}

/**
 * Custom Constraint (Extensible)
 * Allows user-defined constraint functions like no_empty(e)
 */
interface CustomConstraint {
  id: string;
  name: string;
  description: string;
  constraintFunction: (schema: InformationSchema, population: SchemaPopulation) => ValidationResult;
  appliesTo: string[]; // IDs of objects/fact types this applies to
}

// ============================================================================
// SCHEMA & VALIDATION
// ============================================================================

/**
 * Complete Information Schema
 * Represents the entire model structure
 */
interface InformationSchema {
  id: string;
  name: string;
  version: string;

  // Core sets
  objects: Map<string, ObjectType>;
  entities: Map<string, Entity>;
  factTypes: Map<string, FactType>;
  predicators: Map<string, Predicator>;
  powerTypes: Map<string, PowerType>;
  sequenceTypes: Map<string, SequenceType>;
  labelTypes: Map<string, LabelType>;

  // Constraints
  uniqueConstraints: Map<string, UniqueConstraint>;
  totalRoleConstraints: Map<string, TotalRoleConstraint>;
  setConstraints: Map<string, SetConstraint>;
  cardinalityConstraints: Map<string, CardinalityConstraint>;
  frequencyConstraints: Map<string, FrequencyConstraint>;
  enumerationConstraints: Map<string, EnumerationConstraint>;
  customConstraints: Map<string, CustomConstraint>;
}

/**
 * Schema Population (instances)
 */
interface SchemaPopulation {
  schemaId: string;
  objectPopulations: Map<string, Population>;
  factPopulations: Map<string, FactPopulation>;
}

/**
 * Validation Result
 */
interface ValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
}

/**
 * Constraint Violation
 */
interface ConstraintViolation {
  constraintId: string;
  constraintType: string;
  severity: 'Error' | 'Warning';
  message: string;
  affectedObjects: string[];
  affectedFacts?: Array<Map<string, Omega>>;
}

// ============================================================================
// SQL MAPPING STRUCTURES
// ============================================================================

/**
 * SQL Table Definition (mapped from Entity or Objectified Fact Type)
 */
interface SQLTable {
  name: string;
  columns: SQLColumn[];
  primaryKey?: string[];
  foreignKeys: SQLForeignKey[];
  uniqueConstraints: string[][];
  checkConstraints: SQLCheckConstraint[];
}

/**
 * SQL Column Definition
 */
interface SQLColumn {
  name: string;
  dataType: string; // SQL data type (varies by dialect)
  isNullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
}

/**
 * SQL Foreign Key
 */
interface SQLForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

/**
 * SQL Check Constraint
 */
interface SQLCheckConstraint {
  name: string;
  expression: string;
}

/**
 * Complete SQL Schema
 */
interface SQLSchema {
  dialect: 'PostgreSQL' | 'MySQL' | 'SQLite' | 'SQL Server';
  tables: SQLTable[];
  views?: string[];
  indexes?: SQLIndex[];
}

/**
 * SQL Index
 */
interface SQLIndex {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
}

// ============================================================================
// GRAPH REPRESENTATION (for SvelteKit Store)
// ============================================================================

/**
 * Graph Node (represents Objects)
 */
interface GraphNode {
  id: string;
  type: 'Entity' | 'Value' | 'Power' | 'Sequence' | 'Label' | 'ObjectifiedFact';
  data: ObjectType;
  position: { x: number; y: number };
  isSelected: boolean;
}

/**
 * Graph Edge (represents Predicators/Relationships)
 */
interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  label: string; // Predicator name
  predicatorId: string;
  factTypeId: string;
  isSelected: boolean;
}

/**
 * Graph State
 */
interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  schema: InformationSchema;
  population: SchemaPopulation;
}
