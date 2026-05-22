# Theory
### 1.<br>Information Structures (Conceptual Level)
*   **Base Function**: $Base: \mathcal{P} \to \mathcal{O}$.<br>Maps a predicator to its associated object type.
*   **Fact Function**: $Fact: \mathcal{P} \to \mathcal{F}$.<br>Maps a predicator to the unique fact type (partition of $\mathcal{P}$) it belongs to.
*   **Subtyping Relation**: $Sub \subseteq \mathcal{E} \times \mathcal{E}$.<br>A binary relation where $a\:\:Sub\:\:b$ indicates $a$ is a specialized subtype of supertype $b$.
*   **Pater Familias**: $\sqcap: \mathcal{E} \to \mathcal{E}$.<br>Returns the unique, top-level ancestor of an entity type within an acyclic subtype hierarchy.
*   **Type Relatedness**: $p \sim q$.<br>Two predicators (or object types) are related if their base types share the same Pater Familias.
*   **Population Function**: $Pop: \mathcal{O} \to \wp(\Omega)$.<br>Assigns a set of instances from the universe $\Omega$ to an object type at a specific point in time.
*   **Total Role Constraint**: $total(\tau)$.<br>Mandates that every instance of a base object type must play at least one role defined in the set of predicators $\tau$.
*   **Uniqueness Constraint**: $unique(\sigma)$.<br>Requires that the combination of instances playing the roles in $\sigma$ must be unique within the fact type population.

### 2.<br>Tree Representations (Internal Level)
*   **Tree Representation ($T$)**: $T = \langle N, E, \ell \rangle$.<br>A labeled graph where nodes are a partition of predicators and edges represent hierarchical data nesting.
*   **Nodes ($N$)**: $N \subseteq \wp(\mathcal{P})$.<br>Elements of the partition of $\mathcal{P}$ where all predicators in a single node must be type-related.
*   **Edges ($E$)**: $E \subseteq N \times N$.<br>Directed links between nodes representing the parent-child relationship in a data hierarchy.
*   **Labeling Function**: $\ell: E \to \mathcal{F}$.<br>Maps each edge to the conceptual fact type it represents in the internal model.
*   **Anchor**: $Anchor: N \to \mathcal{P}$.<br>The unique predicator in a source node that connects it to an outgoing edge.
*   **Hook**: $Hook: \mathcal{F} \to \mathcal{P}$.<br>The unique predicator in a destination node that serves as the entry point for a specific fact type.
*   **Roots ($R$)**: $R \subseteq N$.<br>Nodes that are not the source of any edge, acting as the primary keys for the resulting top-level tables.
*   **Extension**: $Ext: \mathcal{F} \to \wp(N)$.<br>The set of nodes that are children of a parent node $m$ for a specific fact type $f$.

### 3.<br>Population Transformation (Instance Trees)
*   **Conformity Rule**: $\forall p \in f [t(p) \in Pop(Base(p))]$.<br>Ensures fact instances only contain values belonging to the population of their predicator's base type.
*   **Partitioning Rule**: $\forall t1, t2 \in Pop(m) [t1(m) = t2(m) \Rightarrow t1 = t2]$.<br>Every internal tuple in a node must be uniquely identified by its root value.
*   **Fitting Rule**: $\forall t_i \in t(n_i)$.<br>Requires that nested child instances in a parent tuple actually exist in the child node's own population.
*   **Fact Representation Rule**: $\langle t1, \dots, tl \rangle \in t(f) \iff \langle t(m), t1(n1), \dots, tl(nl) \rangle \in Pop(f)$.<br>Maps conceptual fact instances to internal nested assignments between parent and child nodes.

### 4.<br>Algorithms & Operators
*   **GenerateForest**: $GenerateForest(I) \to T$.<br>A stepwise algorithm that initializes predicators as isolated nodes and iteratively hooks them into a complete forest.
*   **Phi Operator ($\phi$)**: $\phi: N \to \text{NestedTable}$.<br>A recursive operator that traverses a tree downward to generate nested relational record types.
*   **TransformInsertion**: $TransformInsertion(f, t)$.<br>A two-phase process that first inserts atomic values into nodes and then interconnects them using a Modify operation.
*   **TransformDeletion**: $TransformDeletion(f, t)$.<br>A two-phase process that disconnects hierarchical links and removes orphaned atomic values.

### 5.<br>Optimization & Evolution
*   **Mutation Distance**: $Distm(x, y)$.<br>The minimum number of mutation steps (Prune, Graft, Promote) required to change representation $x$ into $y$.
*   **Prune Mutation**: $Prune(T, p)$.<br>Cuts a fact type and its descendants away from a node, creating a new isolated tree.
*   **Graft Mutation**: $Graft(T, p, q)$.<br>Attaches an isolated root node containing hook $p$ to a type-related node $q$.
*   **Promote Mutation**: $Promote(T, p)$.<br>Swaps an anchor $p$ with its corresponding hook to reverse the direction of a hierarchical relationship.
*   **Dead Representation**: $Dead(i)$.<br>A state in the solution space from which a global optimum can never be reached under the current algorithm.
*   **Exploration/Exploitation Ratio**: $\vartheta \in$.<br>The average fraction of reachable neighbors, where values near 0 indicate aggressive convergence and 1 indicates random search.<br>