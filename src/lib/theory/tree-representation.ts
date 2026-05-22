import { InformationStructure } from './information-structure';
import type {
  FactType,
  PredicatorId,
  TreeEdge,
  TreeNode
} from './types';

/**
 * Internal Level: Tree Representation (T)
 * Based on "Foundations of Information Systems" (Patrick van Bommel).
 * A tree representation T is a labelled graph <N, E, ℓ>. 
 */
export class TreeRepresentation {
  /** Nodes N: A partition of the set of predicators P.  */
  public N: Set<TreeNode> = new Set();

  /** Edges E: A set of pairs of nodes (N x N).  */
  public E: Set<TreeEdge> = new Set();

  /** Labeling Function ℓ: E -> F.  */
  private labels: Map<TreeEdge, FactType> = new Map();

  /**
   * Anchor: N -> P
   * Returns the unique predicator in node n that anchors it to an edge.
   * Defined for nodes that are the source of an edge. 
   */
  public getAnchor(n: TreeNode, edge: TreeEdge): PredicatorId {
    if (edge.from !== n) throw new Error("Node is not the source of this edge.");
    const f = this.labels.get(edge);
    if (!f) throw new Error("Edge has no associated fact type label.");

    // Property: |n ∩ f| = 1
    const anchor = Array.from(n).find(p => f.has(p));
    if (!anchor) throw new Error("No anchor predicator found in node for this fact type.");
    return anchor;
  }

  /**
   * Hook: F -> P
   * Returns the unique predicator in a destination node for a fact type f.
   */
  public getHook(f: FactType): PredicatorId {
    // 1. Find the entry (pair of [TreeEdge, FactType]) labeled with f
    const labelsArray = Array.from(this.labels.entries());
    const targetEntry = labelsArray.find(([_, label]) => label === f);

    if (!targetEntry) {
      throw new Error("Fact type not found in tree labels.");
    }

    // targetEntry is the TreeEdge, targetEntry[3] is the FactType
    const [edge, _] = targetEntry;
    const n = edge.to; // The destination node

    // 2. Find the predicator p in node n that is also in fact type f
    const hook = Array.from(n).find((p: PredicatorId) => f.has(p));

    if (!hook) {
      throw new Error("No hook predicator found in destination node.");
    }

    return hook;
  }

  /**
   * Ext(f): Returns the set of nodes that are children (sources) 
   * dealing with fact type f.
   */
  public getExt(f: FactType): Set<TreeNode> {
    const ext = new Set<TreeNode>();
    for (const [edge, label] of this.labels.entries()) {
      if (label === f) {
        ext.add(edge.from);
      }
    }
    return ext;
  }

  /**
   * R ⊆ N: The set of nodes being the root of some tree in the forest.
   * 
   */
  public get roots(): Set<TreeNode> {
    const r = new Set<TreeNode>(this.N);
    for (const edge of this.E) {
      r.delete(edge.from); // Roots are nodes that are NOT the source of any edge
    }
    return r;
  }

  /**
   * Adds an edge to the representation and assigns its fact type label.
   */
  public addEdge(from: TreeNode, to: TreeNode, fact: FactType): void {
    const edge: TreeEdge = { from, to };
    this.E.add(edge);
    this.labels.set(edge, fact);
  }

  /**
   * Validates the tree representation against wellformedness conditions t1-t6.
   * 
   */
  public validate(is: InformationStructure): boolean {
    // t1: Nodes are a partition of P and predicators in node are type-related
    const allPredsInNodes = new Set<PredicatorId>();
    for (const n of this.N) {
      const preds = Array.from(n);
      for (let i = 0; i < preds.length; i++) {
        allPredsInNodes.add(preds[i]);
        for (let j = i + 1; j < preds.length; j++) {
          if (!is.areTypeRelated(preds[i], preds[j])) return false;
        }
      }
    }
    if (allPredsInNodes.size !== is.P.size) return false;

    // t2: Predicators in same node belong to different fact types
    for (const n of this.N) {
      const factTypes = new Set<FactType>();
      for (const p of n) {
        const f = is.getFact(p);
        if (factTypes.has(f)) return false;
        factTypes.add(f);
      }
    }

    // t4: Fact types are not split (all edges of f have same destination node)
    const factDestinations = new Map<FactType, TreeNode>();
    for (const [edge, f] of this.labels.entries()) {
      if (factDestinations.has(f) && factDestinations.get(f) !== edge.to) return false;
      factDestinations.set(f, edge.to);
    }

    // t6: Completeness - each predicator involved in some edge 
    const predsInEdges = new Set<PredicatorId>();
    for (const edge of this.E) {
      edge.from.forEach(p => predsInEdges.add(p));
      edge.to.forEach(p => predsInEdges.add(p));
    }
    if (predsInEdges.size !== is.P.size) return false;

    return true;
  }
}
