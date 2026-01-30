/**
 * Visual Canvas Types
 * 
 * Type definitions for the visual modeling canvas
 * Supports full Information System theory including:
 * - Structural types (Entity, Fact, Objectification, Power Type, Sequence Type, Label Type)
 * - Subtyping (Generalization, Specialization)
 * - Constraints (Uniqueness, Mandatory, Exclusion, Subset, Frequency, Enumeration)
 */

export type ShapeType = 'circle' | 'square' | 'custom';

export type NodeShape = 'circle' | 'square' | 'diamond' | 'hexagon';

export type NodeType =
  | 'entity'        // E: Basic entity type (circle)
  | 'factType'      // F: Fact type (squares)
  | 'labelType'     // L: Label type (diamond)
  | 'objectified'   // Objectified fact (circle around fact type)
  | 'powerType'     // G: Power type (double circle)
  | 'sequenceType'; // S: Sequence type (rectangle around entity)

export type EdgeType =
  | 'predicator'      // P: Standard predicator line
  | 'generalization'  // Dotted arrow (multiple to one supertype)
  | 'specialization'; // Solid arrow (subtype to supertype)

export type LabelDataType =
  | 'string'
  | 'integer'
  | 'float'
  | 'double'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'char'
  | 'text'
  | 'decimal';

export type ConstraintType =
  | 'uniqueness'      // Double-headed arrow or circle with 'u'
  | 'mandatory'       // Total role - thick dot at junction
  | 'exclusion'       // Circle with 'X'
  | 'subset'          // ⊆ symbol
  | 'equality'        // = symbol
  | 'frequency'       // Range in box (min...max)
  | 'enumeration'     // Circle with 'Enum'
  | 'noEmpty'         // Custom: no_empty(e)
  | 'moreThanEmpty'   // Custom: more_than_empty(e)
  | 'atLeast'         // Custom: at_least(g,n)
  | 'limit';          // Custom: limit(g,m)

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  shape: NodeShape;
  position: Point;
  size: Size;
  label: string;
  color: string;
  isSelected: boolean;
  isDragging: boolean;

  // For fact types (n-ary)
  arity?: number; // Number of predicates
  squares?: { id: string; position: Point }[]; // For n-ary fact types

  // For objectified facts (reference to the fact type being objectified)
  objectifiedFactId?: string;

  // For power types and sequence types (reference to the member entity)
  memberEntityId?: string;

  // For label types (data type specification)
  dataType?: LabelDataType;

  // Reference to schema object
  schemaObjectId: string;
}

export interface CanvasEdge {
  id: string;
  type: EdgeType;
  sourceNodeId: string;
  targetNodeId: string;

  // For n-ary facts, specify which square the edge connects to
  sourceSquareId?: string;
  targetSquareId?: string;

  label: string;
  color: string;
  isSelected: boolean;

  // Control points for curved lines
  controlPoints?: Point[];

  // Visual style for different edge types
  style?: {
    lineStyle: 'solid' | 'dashed' | 'dotted';
    arrowhead: 'none' | 'simple' | 'diamond' | 'hollow';
  };

  // Reference to predicator or relationship
  predicatorId: string;
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  name?: string;

  // References to nodes/edges/predicators this constraint applies to
  appliesTo: string[]; // IDs of nodes, edges, or predicator squares

  // For constraints spanning multiple fact types
  predicatorIds?: string[];

  // Parameters for specific constraints
  parameters?: {
    // For frequency constraints
    min?: number;
    max?: number | 'infinity';

    // For enumeration constraints
    values?: string[];

    // For at_least/limit constraints
    n?: number;
    m?: number;
  };

  // Visual position for constraint symbols
  position?: Point;
}

export interface CanvasState {
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
  constraints: Map<string, Constraint>;
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  selectedConstraints: Set<string>;

  // Canvas view state
  zoom: number;
  pan: Point;

  // Drawing state
  isDrawingEdge: boolean;
  drawingEdgeStart?: { nodeId: string; squareId?: string };
  tempEdgeEnd?: Point;

  // Constraint creation state
  isCreatingConstraint: boolean;
  constraintType?: ConstraintType;
  selectedPredicators?: string[];

  // Edge reconnection state
  isReconnectingEdge?: boolean;
  reconnectingEdgeId?: string;
  reconnectingEnd?: 'source' | 'target';
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  cursor: string;
  category?: 'structure' | 'subtype' | 'constraint';
}

export const TOOLS = {
  // Selection and navigation
  SELECT: { id: 'select', name: 'Select', icon: '↖', cursor: 'default', category: 'structure' },
  PAN: { id: 'pan', name: 'Pan', icon: '✋', cursor: 'grab', category: 'structure' },

  // Structural types
  ENTITY: { id: 'entity', name: 'Entity', icon: '○', cursor: 'crosshair', category: 'structure' },
  FACT_TYPE: { id: 'factType', name: 'Fact Type', icon: '□', cursor: 'crosshair', category: 'structure' },
  LABEL_TYPE: { id: 'labelType', name: 'Label Type', icon: '◇', cursor: 'crosshair', category: 'structure' },
  POWER_TYPE: { id: 'powerType', name: 'Power Type', icon: '◎', cursor: 'crosshair', category: 'structure' },
  SEQUENCE_TYPE: { id: 'sequenceType', name: 'Sequence Type', icon: '▭', cursor: 'crosshair', category: 'structure' },
  OBJECTIFY: { id: 'objectify', name: 'Objectify Fact', icon: '⊙', cursor: 'pointer', category: 'structure' },

  // Relationships
  PREDICATOR: { id: 'predicator', name: 'Predicator', icon: '—', cursor: 'crosshair', category: 'structure' },
  GENERALIZATION: { id: 'generalization', name: 'Generalization', icon: '⇢', cursor: 'crosshair', category: 'subtype' },
  SPECIALIZATION: { id: 'specialization', name: 'Specialization', icon: '→', cursor: 'crosshair', category: 'subtype' },

  // Constraints
  UNIQUENESS: { id: 'uniqueness', name: 'Uniqueness', icon: 'U', cursor: 'crosshair', category: 'constraint' },
  MANDATORY: { id: 'mandatory', name: 'Mandatory', icon: '●', cursor: 'pointer', category: 'constraint' },
  EXCLUSION: { id: 'exclusion', name: 'Exclusion', icon: '⊗', cursor: 'crosshair', category: 'constraint' },
  SUBSET: { id: 'subset', name: 'Subset', icon: '⊆', cursor: 'crosshair', category: 'constraint' },
  FREQUENCY: { id: 'frequency', name: 'Frequency', icon: '1..n', cursor: 'crosshair', category: 'constraint' },
} as const;
