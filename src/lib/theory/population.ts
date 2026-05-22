import { InformationStructure } from './information-structure';
import { TreeRepresentation } from './tree-representation';
import type {
  FactInstance,
  FactType,
  InternalInstance,
  ObjectId,
  PredicatorId,
  TreeNode,
  UniverseInstance
} from './types';

/**
 * Transformation of Populations and Operations (Chapter 4)
 * Handles the mapping of data instances between conceptual and internal levels.
 */
export class Population {
  /** Conceptual Population: ObjectType -> Set of Instances.  */
  private conceptualPop: Map<ObjectId, Set<UniverseInstance>> = new Map();

  /** Internal Population: TreeNode -> Set of Internal Instances.  */
  private nodePop: Map<TreeNode, Set<InternalInstance>> = new Map();

  constructor(
    public structure: InformationStructure,
    public tree: TreeRepresentation
  ) { }

  // 1. Basic Population Management

  public getPop(id: ObjectId): Set<UniverseInstance> {
    return this.conceptualPop.get(id) || new Set();
  }

  public setPop(id: ObjectId, instances: Set<UniverseInstance>): void {
    this.conceptualPop.set(id, instances);
  }

  /**
   * Conformity Rule: ∀f ∈ F ∀t ∈ Pop(f) ∀p ∈ f [t(p) ∈ Pop(Base(p))].
   * Ensures every value in a fact instance exists in its base object type's population.
   */
  public validateConformity(): boolean {
    for (const f of this.structure.F) {
      const factTypeId = f as unknown as ObjectId; // Simplified for lookup
      const popF = this.getPop(factTypeId) as Set<FactInstance>;

      for (const t of popF) {
        for (const p of f) {
          const baseObj = this.structure.getBase(p);
          const val = t.get(p);
          if (val === undefined || !this.getPop(baseObj).has(val)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // 2. Internal Level (Tree) Rules

  /**
   * Partitioning Rule: ∀t1, t2 ∈ Pop(m) [t1(m) = t2(m) => t1 = t2].
   * Every internal tuple in a node must have a unique root value.
   */
  public validatePartitioning(m: TreeNode): boolean {
    const popM = this.nodePop.get(m);
    if (!popM) return true;

    const seenRoots = new Set<UniverseInstance>();
    for (const t of popM) {
      if (seenRoots.has(t.rootValue)) return false;
      seenRoots.add(t.rootValue);
    }
    return true;
  }

  /**
   * Fitting Rule: Ensures child instances in a nested structure belong
   * to the child node's own population. 
   */
  public validateFitting(m: TreeNode, t: InternalInstance): boolean {
    for (const [f, childTuples] of t.children.entries()) {
      const childrenNodes = Array.from(this.tree.getExt(f));
      for (const tuple of childTuples) {
        // tuple is UniverseInstance[] where each element i corresponds to child node i
        for (let i = 0; i < tuple.length; i++) {
          const childNode = childrenNodes[i];
          if (!this.existsInNodePop(childNode, tuple[i])) return false;
        }
      }
    }
    return true;
  }

  // 3. Transformation Operations

  /**
   * TransformInsertion: Stepwise insertion of a conceptual fact into internal trees.
   * 1. Insert Atomic Tuples: Ensure root values exist in nodes.
   * 2. Connect: Establishing the hierarchical links via Modify operation.
   */
  public transformInsertion(f: FactType, t: FactInstance): void {
    // Phase 1: InsertAtomicTuples
    for (const p of f) {
      const n = this.getNodeOfPredicator(p);
      const rootVal = t.get(p)!;
      if (!this.existsInNodePop(n, rootVal)) {
        const atomicTuple: InternalInstance = {
          rootValue: rootVal,
          children: new Map()
        };
        this.addInternalInstance(n, atomicTuple);
      }
    }

    // Phase 2: Connect
    const hook = this.tree.getHook(f);
    const upperNode = this.getNodeOfPredicator(hook);
    const targetTuple = this.findTupleInNode(upperNode, t.get(hook)!);

    if (targetTuple) {
      this.modifyInternalTuple(upperNode, targetTuple, f, t);
    }
  }

  /**
   * TransformDeletion: Disconnects hierarchical links and removes unused atomic values.
   */
  public transformDeletion(f: FactType, t: FactInstance): void {
    // Phase 1: Disconnect (Inverse of Connect)
    const hook = this.tree.getHook(f);
    const upperNode = this.getNodeOfPredicator(hook);
    const targetTuple = this.findTupleInNode(upperNode, t.get(hook)!);

    if (targetTuple) {
      this.disconnectFactFromTuple(targetTuple, f, t);
    }

    // Phase 2: DeleteAtomicTuples
    // Only delete if value is not used by a parent or other fact type
    for (const p of f) {
      const n = this.getNodeOfPredicator(p);
      const rootVal = t.get(p)!;
      if (this.isOrphaned(n, rootVal)) {
        this.removeInternalInstance(n, rootVal);
      }
    }
  }

  // Helpers

  private getNodeOfPredicator(p: PredicatorId): TreeNode {
    for (const n of this.tree.N) {
      if (n.has(p)) return n;
    }
    throw new Error("Predicator not found in any node.");
  }

  private existsInNodePop(n: TreeNode, val: UniverseInstance): boolean {
    return !!this.findTupleInNode(n, val);
  }

  private findTupleInNode(n: TreeNode, rootVal: UniverseInstance): InternalInstance | undefined {
    const popN = this.nodePop.get(n);
    if (!popN) return undefined;
    return Array.from(popN).find(t => t.rootValue === rootVal);
  }

  private addInternalInstance(n: TreeNode, instance: InternalInstance): void {
    if (!this.nodePop.has(n)) this.nodePop.set(n, new Set());
    this.nodePop.get(n)!.add(instance);
  }

  /**
   * Phase 2 of TransformInsertion: Connect.
   * Establishes hierarchical links in the parent tuple using the Fact Representation Rule.
   * Performs the operation: m(f) = t'(f) ∪ ε(f, t) 
   */
  private modifyInternalTuple(
    n: TreeNode,
    t: InternalInstance,
    f: FactType,
    ConceptualT: FactInstance
  ): void {
    // 1. Identify the extension Ext(f) = {n1, ..., nl} 
    const extF = Array.from(this.tree.getExt(f));

    // 2. Calculate ε(f, t): the sequence of existing child instances whose 
    // root values match those in the conceptual tuple 
    const epsilonTuple: UniverseInstance[] = [];

    for (const ni of extF) {
      // Find the unique predicator p in node ni such that p ∈ f 
      const p = Array.from(ni).find((pred: PredicatorId) => f.has(pred));
      if (!p) throw new Error(`Node in extension of ${f} has no predicator in the fact type.`);

      const rootVal = ConceptualT.get(p)!;

      // Ensure the child instance exists (it should have been added in Phase 1)
      if (!this.existsInNodePop(ni, rootVal)) {
        throw new Error("Fitting Rule violation: Child instance missing during connection phase.");
      }

      epsilonTuple.push(rootVal);
    }

    // 3. Update the parent tuple's children set for this fact type
    if (!t.children.has(f)) {
      t.children.set(f, new Set());
    }
    t.children.get(f)!.add(epsilonTuple);
  }

  /**
   * Phase 1 of TransformDeletion: Disconnect.
   * Removes the hierarchical links from the parent tuple.
   * Performs the operation: m(f) = t'(f) - ε(f, t)
   */
  private disconnectFactFromTuple(
    t: InternalInstance,
    f: FactType,
    ConceptualT: FactInstance
  ): void {
    const childTuplesSet = t.children.get(f);
    if (!childTuplesSet) return;

    const extF = Array.from(this.tree.getExt(f));

    // Find the sequence in the set that matches the conceptual values
    for (const existingTuple of childTuplesSet) {
      let isMatch = true;

      for (let i = 0; i < extF.length; i++) {
        const ni = extF[i];
        const p = Array.from(ni).find((pred: PredicatorId) => f.has(pred))!;

        if (existingTuple[i] !== ConceptualT.get(p)) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        // Remove the connection (Disconnect)
        childTuplesSet.delete(existingTuple);
        break;
      }
    }
  }

  /**
   * Removes an internal tuple from the node population.
   * Corresponds to "Delete(Pop(n), t')" in the theory.
   */
  private removeInternalInstance(n: TreeNode, val: UniverseInstance): void {
    const popN = this.nodePop.get(n);
    if (!popN) return;

    const target = this.findTupleInNode(n, val);
    if (target) {
      popN.delete(target);
    }
  }

  /**
   * Implements the check for "unnecessary" tuples.
   * Logic: No reference from a father node AND all child connections are empty.
   */
  private isOrphaned(n: TreeNode, val: UniverseInstance): boolean {
    const tPrime = this.findTupleInNode(n, val);
    if (!tPrime) return false;

    // 1. Check: NOT exists t* in Pop(Father(n)) [t' in t*(n)]
    // (Note: Requires a way to find the parent node and its population)
    const father = this.getFatherNode(n);
    if (father) {
      const popFather = this.nodePop.get(father) || new Set();
      for (const tStar of popFather) {
        // Search through all child connections in the father tuple
        for (const childTuples of tStar.children.values()) {
          // If tPrime is found within any child connection set, it's not an orphan
          if (Array.from(childTuples).some(tupleArr => tupleArr.includes(val))) {
            return false;
          }
        }
      }
    }

    // 2. Check: ALL g in F [n = Node(Hook(g)) => t'(g) = empty]
    // Ensures the instance isn't acting as a root for other child data
    for (const [factType, childrenSet] of tPrime.children.entries()) {
      if (childrenSet.size > 0) return false;
    }

    return true;
  }

  /** Helper to find the parent node of a node in the tree representation */
  private getFatherNode(n: TreeNode): TreeNode | undefined {
    for (const edge of this.tree.E) {
      if (edge.to === n) return edge.from;
    }
    return undefined;
  }
}
