import { InformationStructure } from './information-structure';
import { TreeRepresentation } from './tree-representation';
import type {
  FactType,
  GenerationPreferences,
  PredicatorId,
  TreeEdge,
  TreeNode
} from './types';

/**
 * Forward Engineering: Generation of Tree Representations (Chapter 3)
 * Implements the transformation of conceptual schemas into internal structures.
 */
export class SchemaGenerator {

  /**
   * Basic Algorithm: GenerateForest 
   * Stepwise random generator to produce a complete internal representation.
   */
  public static generateForest(
    is: InformationStructure,
    prefs?: GenerationPreferences
  ): TreeRepresentation {
    const tree = new TreeRepresentation();

    // 1. Initialization: Each predicator constitutes its own isolated node 
    const N = new Set<TreeNode>();
    is.P.forEach(p => {
      const singletonNode: TreeNode = new Set([p]);
      N.add(singletonNode);
    });
    tree.N = N;

    // U: Set of unprocessed isolated nodes
    const U = new Set<TreeNode>(N);

    // 2. Iteration: Extend the representation step-by-step 
    while (true) {
      const extension = this.canExtend(is, tree, U, prefs);
      if (!extension) break;

      const { m, n } = extension;
      this.processFactType(is, tree, U, m, n);
    }

    // 3. Completion: Verify all predicators are assigned 
    if (U.size > 0) {
      console.warn("Generation terminated with unprocessed predicators. Schema may be incomplete.");
    }

    return tree;
  }

  /**
   * CanExtend / CanExtendReduced
   * Selects an unprocessed node m and a target node n based on guidance parameters.
   */
  private static canExtend(
    is: InformationStructure,
    tree: TreeRepresentation,
    U: Set<TreeNode>,
    prefs?: GenerationPreferences
  ): { m: TreeNode, n: TreeNode } | null {
    const unprocessedList = Array.from(U);
    const processedList = Array.from(tree.N).filter(node => !U.has(node));

    // Try combinations to find a valid extension point
    for (const m of unprocessedList) {
      // Possible targets: a processed node or starting a new tree (n = m)
      const possibleTargets = [...processedList, m];

      for (const n of possibleTargets) {
        // Base Condition: Object types must belong to the same subtype hierarchy
        const p = Array.from(m)[0] as PredicatorId;
        const q = Array.from(n)[0] as PredicatorId;
        if (!is.areTypeRelated(p, q)) continue;

        // Advanced Guidance Conditions
        if (prefs) {
          // No Information Loss: Anchor must be total
          if (n !== m && !this.isTotal(is, tree.getAnchor(n, this.getOutgoingEdge(tree, n)!))) continue;

          // No Redundancy: Anchor must be unique
          if (n !== m && prefs.noRedundancy && !this.isUnique(is, tree.getAnchor(n, this.getOutgoingEdge(tree, n)!))) continue;

          // Relational Style (No Nesting): Hook must be unique
          if (prefs.flatRelational && !this.isUnique(is, p)) continue;

          // No Optionals: Hook must be total
          if (prefs.noOptionals && !this.isTotal(is, p)) continue;
        }

        return { m, n };
      }
    }

    return null;
  }

  /**
   * ProcessFactType 
   * Incorporates a fact type into the internal representation.
   */
  private static processFactType(
    is: InformationStructure,
    tree: TreeRepresentation,
    U: Set<TreeNode>,
    m: TreeNode,
    n: TreeNode
  ): void {
    const p = Array.from(m)[0] as PredicatorId;
    const f = is.getFact(p);

    // 1. Union of selected nodes if m != n
    if (m !== n) {
      tree.N.delete(m);
      m.forEach(pred => n.add(pred));
    }

    // 2. Add edges for each remaining predicator in the fact type
    for (const x of f) {
      if (m.has(x)) continue; // Skip the hook

      const xNode = this.findNodeContaining(tree.N, x);
      tree.addEdge(xNode, n, f);

      // Mark as processed
      U.delete(xNode);
    }

    U.delete(m);

    // 3. Handle Objectifications 
    this.processObjectifications(is, tree, U, f, n);
  }

  /**
   * ProcessObjectifications 
   * choice of predicator for unnesting fact types where f plays a role.
   */
  private static processObjectifications(
    is: InformationStructure,
    tree: TreeRepresentation,
    U: Set<TreeNode>,
    f: FactType,
    n: TreeNode
  ): void {
    // For each predicator whose base is the fact type f
    for (const m of U) {
      const p = Array.from(m)[0] as PredicatorId;
      if (is.getBase(p) as unknown === f) {
        // Add edge labeled with f and recursively process the upper fact type
        tree.addEdge(m, n, f);
        this.processFactType(is, tree, U, m, m);
      }
    }
  }

  /**
   * Recursive Operator Phi (φ)
   * Interprets a tree node as a nested table structure.
   */
  public static phi(m: TreeNode, tree: TreeRepresentation, is: InformationStructure): string {
    const nodeLabel = Array.from(m).map(p => is.getBase(p)).join(",");
    let output = `Table(${nodeLabel}`;

    // 1. Find fact types where this node contains the Hook.
    // In a tree representation, the hook resides in the destination node (edge.to).
    const hookedFactTypes = new Set<FactType>();

    for (const [edge, f] of (tree as any).labels.entries()) {
      if (edge.to === m) {
        // FIX: Add the FactType 'f' directly to the set.
        // tree.getHook(f) returns a PredicatorId, which caused your type error.
        hookedFactTypes.add(f);
      }
    }

    // 2. For every fact type hooking here, create a sub-table.
    for (const f of hookedFactTypes) {
      const hook = tree.getHook(f); // Get the handle for constraints
      const constraint = this.getConstraintSuffix(is, hook);

      // Identify children nodes Ext(f) = {n1, ..., nl}
      const childrenNodes = Array.from(tree.getExt(f));
      const childrenPhi = childrenNodes.map(child => this.phi(child, tree, is)).join(", ");

      output += `, SubTable(${childrenPhi}) ${constraint}`;
    }

    return output + ")";
  }

  // Helpers

  private static findNodeContaining(nodes: Set<TreeNode>, p: PredicatorId): TreeNode {
    for (const n of nodes) {
      if (n.has(p)) return n;
    }
    throw new Error("Predicator consistency error.");
  }

  private static getOutgoingEdge(tree: TreeRepresentation, n: TreeNode): TreeEdge | undefined {
    return Array.from(tree.E).find(e => e.from === n);
  }

  private static getConstraintSuffix(is: InformationStructure, p: PredicatorId): string {
    const unique = this.isUnique(is, p) ? "" : "rep"; // rep if not unique 
    const optional = this.isTotal(is, p) ? "" : "op"; // op if not total 
    return `${optional} ${unique}`.trim();
  }

  /** Stub for Uniqueness check unique(p)  */
  private static isUnique(is: InformationStructure, p: PredicatorId): boolean {
    return false; // Requires access to Constraints set C from InformationStructure
  }

  /** Stub for Totality check total(p)  */
  private static isTotal(is: InformationStructure, p: PredicatorId): boolean {
    return false; // Requires access to Constraints set C from InformationStructure
  }
}
