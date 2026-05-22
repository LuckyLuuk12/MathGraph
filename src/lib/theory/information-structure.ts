import type {
  FactType,
  ObjectId,
  ObjectTypeDefinition,
  PredicatorId
} from './types';

/**
 * Conceptual Level: Information Structure (I)
 * Based on "Foundations of Information Systems" (Patrick van Bommel).
 * An information structure I is a structure <P, O, L, E, F, Base, Sub>.
 */
export class InformationStructure {
  // 1. Basic Sets 
  /** Set P of predicators. */
  public P: Set<PredicatorId> = new Set();

  /** Set O of object types (Map for DSL metadata lookup). */
  public O: Map<ObjectId, ObjectTypeDefinition> = new Map();

  /** Entity types E ⊆ O. */
  public E: Set<ObjectId> = new Set();

  /** Label types L ⊆ O. */
  public L: Set<ObjectId> = new Set();

  /** Fact types F ⊆ O. A partition of P. */
  public F: Set<FactType> = new Set();

  /** Generalization Types */
  public G: Set<ObjectId> = new Set();

  /** Sequence Types */
  public S: Set<ObjectId> = new Set();

  // 2. Basic Functions & Relations
  /** Base: P -> O function.  */
  private baseMap: Map<PredicatorId, ObjectId> = new Map();

  /** Sub ⊆ E x E (Specialization Relation).  */
  private subRelation: Map<ObjectId, ObjectId> = new Map();

  /** Generalization Relation G ⊆ E x E */
  private genRelation: Map<ObjectId, Set<ObjectId>> = new Map();

  /** Elt: G u S -> O */
  private eltMap: Map<ObjectId, ObjectId> = new Map();

  /** Generalization: Supertype is the union of its specifiers [1, 3.1.8] */
  public addGeneralization(supertype: ObjectId, specifiers: Set<ObjectId>): void {
    this.genRelation.set(supertype, specifiers);
  }

  /** Elt Function for Power/Sequence types [20, 21] */
  public setElement(complexType: ObjectId, elementType: ObjectId): void {
    this.eltMap.set(complexType, elementType);
  }

  /**
   * Adds an object type (Entity or Label) to the structure.
   */
  public addObjectType(id: ObjectId, kind: 'ENTITY' | 'LABEL', metadata?: Record<string, any>): void {
    const def: ObjectTypeDefinition = { id, kind, metadata };
    this.O.set(id, def);
    if (kind === 'ENTITY') this.E.add(id);
    if (kind === 'LABEL') this.L.add(id);
  }

  /**
   * Adds a Fact Type (f ∈ F), which is a non-empty set of predicators.
   * Ensures F is a partition of P. [Source 5, 2.2.2, Property 2]
   */
  public addFactType(f: FactType, id: ObjectId, metadata?: Record<string, any>): void {
    if (f.size === 0) throw new Error("Fact type cannot be empty.");

    // Ensure predicators don't belong to other fact types (Partition Property)
    for (const existingF of this.F) {
      for (const p of f) {
        if (existingF.has(p)) {
          throw new Error(`Predicator ${p} already belongs to another Fact Type.`);
        }
      }
    }

    this.F.add(f);
    this.O.set(id, { id, kind: 'FACT', metadata });

    // Populate P based on the union of F
    f.forEach(p => this.P.add(p));
  }

  /**
   * Base: P -> O
   * Specifies the object type associated to a predicator.
   */
  public setBase(p: PredicatorId, o: ObjectId): void {
    if (!this.P.has(p)) throw new Error(`Predicator ${p} not found in P.`);
    if (!this.O.has(o)) throw new Error(`Object Type ${o} not found in O.`);
    this.baseMap.set(p, o);
  }

  public getBase(p: PredicatorId): ObjectId {
    const o = this.baseMap.get(p);
    if (!o) throw new Error(`Base function not defined for predicator ${p}.`);
    return o;
  }

  /**
   * Fact: P -> F
   * Returns the fact type f that corresponds with a predicator p (p ∈ f).
   * 
   */
  public getFact(p: PredicatorId): FactType {
    for (const f of this.F) {
      if (f.has(p)) return f;
    }
    throw new Error(`Predicator ${p} is not part of any Fact Type.`);
  }

  /**
   * Objectification H ⊆ P
   * Set of predicators whose base is a fact type. 
   */
  public get H(): Set<PredicatorId> {
    const h = new Set<PredicatorId>();
    for (const p of this.P) {
      const baseObjId = this.getBase(p);
      const baseObj = this.O.get(baseObjId);
      if (baseObj?.kind === 'FACT') {
        h.add(p);
      }
    }
    return h;
  }

  /**
   * Subtyping (Specialization)
   * Formalized as a relation Sub ⊆ E x E. 
   */
  public addSpecialization(subtype: ObjectId, supertype: ObjectId): void {
    if (!this.E.has(subtype) || !this.E.has(supertype)) {
      throw new Error("Subtyping only allowed between Entity Types.");
    }
    // Acyclic check 
    let current: ObjectId | undefined = supertype;
    while (current) {
      if (current === subtype) throw new Error("Cycle detected in subtype hierarchy.");
      current = this.subRelation.get(current);
    }
    this.subRelation.set(subtype, supertype);
  }

  /**
   * Pater Familias function ⊓: E -> E
   * Returns the unique top parent of an entity type. 
   */
  public getPaterFamilias(e: ObjectId): ObjectId {
    let current = e;
    while (this.subRelation.has(current)) {
      current = this.subRelation.get(current)!;
    }
    return current;
  }

  /**
   * Type Relatedness p ~ q
   * Predicators are related if their base types share the same Pater Familias.
   * 
   */
  public areTypeRelated(p: PredicatorId, q: PredicatorId): boolean {
    const baseP = this.getBase(p);
    const baseQ = this.getBase(q);
    return this.getPaterFamilias(baseP) === this.getPaterFamilias(baseQ);
  }

  /**
   * Defoliation Preprocessing (Fd)
   * Restricts the structure to fact types that are not bridge types (L ∉ Base).
   * 
   */
  public defoliate(): Set<FactType> {
    const fd = new Set<FactType>();
    for (const f of this.F) {
      let isBridge = false;
      for (const p of f) {
        if (this.L.has(this.getBase(p))) {
          isBridge = true;
          break;
        }
      }
      if (!isBridge) fd.add(f);
    }
    return fd;
  }

  /**
   * Validates core partition and existence rules. 
   */
  public validate(): boolean {
    // 1. E ∩ L = ∅
    for (const e of this.E) if (this.L.has(e)) return false;

    // 2. Every predicator has a defined base
    for (const p of this.P) if (!this.baseMap.has(p)) return false;

    // 3. Fact types are non-empty and partition P (verified during addition)
    return true;
  }
}
