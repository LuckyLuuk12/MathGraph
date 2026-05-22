/**
 * MathGraph: Core Type Definitions for a Web-App DSL
 * Based strictly on Foundations of Information Systems Lecture Notes.
 */

// 1. Branded String Types (DSL Friendly)
// These allow you to pass strings from a web UI while maintaining 
// type safety in the backend algorithms.
export type PredicatorId = string & { readonly __brand: unique symbol };
export type ObjectId = string & { readonly __brand: unique symbol };

/** A Fact Type is defined as a Set of predicators. */
export type FactType = Set<PredicatorId>;

// 2. Conceptual Schema Definition
/** Basic categories of object types in the theory. */
export type ObjectKind = 'ENTITY' | 'LABEL' | 'FACT';

/** 
 * Interface for the basic building blocks. 
 * Users can extend this with custom metadata in the DSL.
 */
export interface ObjectTypeDefinition {
  id: ObjectId;
  kind: ObjectKind;
  metadata?: Record<string, any>; // Slot for custom DSL extensions
}

// 3. Constraints (DSL-Extensible)
/** Standard constraints defined in the theory. */
export type CoreConstraintKind =
  | 'UNIQUE'              // uniqueness constraint unique(σ)
  | 'TOTAL'               // total role constraint total(τ)
  | 'SUBTYPE_EXCLUSION'   // Pop(B) ∩ Pop(C) = ∅
  | 'SUBTYPE_TOTAL';      // Pop(B) ∪ Pop(C) = Pop(A)

export interface ConstraintDefinition {
  id: string;
  kind: CoreConstraintKind | string; // Allows for "Custom" kinds from users
  predicators: Set<PredicatorId>;
  logic: (population: any) => boolean; // Functional slot for custom rules
}

// 4. Internal Level: Tree Representations
/** T = <N, E, ℓ>. */
export type TreeNode = Set<PredicatorId>; // N is a partition of P

/** Edges are pairs of Nodes (N x N). */
export interface TreeEdge {
  from: TreeNode;
  to: TreeNode;
}

// 5. Population & Instances
/** Ω (Universe of Instances) includes atomic and composed values. */
export type UniverseInstance =
  | string
  | number
  | boolean
  | FactInstance
  | InternalInstance;

/** A Fact Instance (tuple) is a mapping t: f -> Ω. */
export type FactInstance = Map<PredicatorId, UniverseInstance>;

/** 
 * Internal population instances for tree nodes. 
 * Must satisfy the Partitioning Rule (unique root values). 
 */
export interface InternalInstance {
  rootValue: UniverseInstance; // t(m)
  /** Children mapping according to Fact Representation Rule. */
  children: Map<FactType, Set<UniverseInstance[]>>;
}

// 6. Algorithm Guidance (Web App Prefs)
/** 
 * Parameters for the Advanced Generation Algorithm (CanExtendReduced).
 * Users can toggle these in the Web UI to change the resulting schema.
 */
export interface GenerationPreferences {
  /** unique(Anchor(n)) - prevents duplicate data in trees. */
  noRedundancy: boolean;
  /** total(Anchor(n)) - prevents unreachable child data. */
  noInformationLoss: boolean;
  /** unique(p) - forces flat tables over nested ones. */
  flatRelational: boolean;
  /** total(p) - ensures no null/empty fields in tables. */
  noOptionals: boolean;
  /** γ - Limit for fact types per table. */
  sizeLimit?: number;
  /** δ - Max depth of the hierarchy. */
  depthLimit?: number;
}
