/**
 * MathGraph: Graph State Store
 * 
 * SvelteKit-friendly writable store for managing the visual graph state
 * Nodes = Objects (O), Edges = Predicators (P)
 */

import { writable, derived, get } from 'svelte/store';
import { ConstraintValidator } from '../validation';
import { DEFAULT_SCHEMA_VERSION } from '../constants';

/**
 * Create initial empty schema
 */
function createEmptySchema(): InformationSchema {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Schema',
    version: DEFAULT_SCHEMA_VERSION,
    objects: new Map(),
    entities: new Map(),
    factTypes: new Map(),
    predicators: new Map(),
    powerTypes: new Map(),
    sequenceTypes: new Map(),
    labelTypes: new Map(),
    uniqueConstraints: new Map(),
    totalRoleConstraints: new Map(),
    setConstraints: new Map(),
    cardinalityConstraints: new Map(),
    frequencyConstraints: new Map(),
    enumerationConstraints: new Map(),
    customConstraints: new Map()
  };
}

/**
 * Create initial empty population
 */
function createEmptyPopulation(schemaId: string): SchemaPopulation {
  return {
    schemaId,
    objectPopulations: new Map(),
    factPopulations: new Map()
  };
}

/**
 * Create initial graph state
 */
function createInitialState(): GraphState {
  const schema = createEmptySchema();
  return {
    nodes: new Map(),
    edges: new Map(),
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    schema,
    population: createEmptyPopulation(schema.id)
  };
}

/**
 * Main graph store
 */
function createGraphStore() {
  const { subscribe, set, update } = writable<GraphState>(createInitialState());

  return {
    subscribe,

    // ============================================================================
    // SCHEMA OPERATIONS
    // ============================================================================

    /**
     * Reset to empty schema
     */
    reset: () => set(createInitialState()),

    /**
     * Load a schema
     */
    loadSchema: (schema: InformationSchema) => {
      update(state => ({
        ...state,
        schema,
        population: createEmptyPopulation(schema.id),
        nodes: new Map(),
        edges: new Map(),
        selectedNodes: new Set(),
        selectedEdges: new Set()
      }));
    },

    /**
     * Update schema metadata
     */
    updateSchemaMetadata: (name: string, version: string) => {
      update(state => ({
        ...state,
        schema: { ...state.schema, name, version }
      }));
    },

    // ============================================================================
    // NODE OPERATIONS (Objects)
    // ============================================================================

    /**
     * Add an entity node
     */
    addEntity: (entity: Entity, position: { x: number; y: number }) => {
      update(state => {
        const node: GraphNode = {
          id: entity.id,
          type: 'Entity',
          data: entity,
          position,
          isSelected: false
        };

        state.nodes.set(entity.id, node);
        state.schema.entities.set(entity.id, entity);
        state.schema.objects.set(entity.id, entity);

        return state;
      });
    },

    /**
     * Add a label type node
     */
    addLabelType: (labelType: LabelType, position: { x: number; y: number }) => {
      update(state => {
        const node: GraphNode = {
          id: labelType.id,
          type: 'Label',
          data: labelType,
          position,
          isSelected: false
        };

        state.nodes.set(labelType.id, node);
        state.schema.labelTypes.set(labelType.id, labelType);
        state.schema.objects.set(labelType.id, labelType);

        return state;
      });
    },

    /**
     * Remove a node and its connected edges
     */
    removeNode: (nodeId: string) => {
      update(state => {
        // Remove node
        state.nodes.delete(nodeId);

        // Remove from schema
        state.schema.entities.delete(nodeId);
        state.schema.labelTypes.delete(nodeId);
        state.schema.objects.delete(nodeId);

        // Remove connected edges
        const edgesToRemove: string[] = [];
        for (const [edgeId, edge] of state.edges) {
          if (edge.source === nodeId || edge.target === nodeId) {
            edgesToRemove.push(edgeId);
          }
        }

        for (const edgeId of edgesToRemove) {
          state.edges.delete(edgeId);
          const edge = state.edges.get(edgeId);
          if (edge) {
            state.schema.predicators.delete(edge.predicatorId);
          }
        }

        return state;
      });
    },

    /**
     * Update node position
     */
    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
      update(state => {
        const node = state.nodes.get(nodeId);
        if (node) {
          node.position = position;
          state.nodes.set(nodeId, node);
        }
        return state;
      });
    },

    // ============================================================================
    // EDGE OPERATIONS (Predicators/Fact Types)
    // ============================================================================

    /**
     * Add a fact type with predicators
     */
    addFactType: (
      factType: FactType,
      predicators: Predicator[]
    ) => {
      update(state => {
        // Add fact type to schema
        state.schema.factTypes.set(factType.id, factType);

        // Add predicators
        for (const predicator of predicators) {
          state.schema.predicators.set(predicator.id, predicator);
        }

        // Create edges for binary fact types
        if (factType.arity === 2 && predicators.length === 2) {
          const [pred1, pred2] = predicators;
          const edge: GraphEdge = {
            id: crypto.randomUUID(),
            source: pred1.objectId,
            target: pred2.objectId,
            label: factType.name,
            predicatorId: pred1.id,
            factTypeId: factType.id,
            isSelected: false
          };
          state.edges.set(edge.id, edge);
        }

        return state;
      });
    },

    /**
     * Remove a fact type and its predicators
     */
    removeFactType: (factTypeId: string) => {
      update(state => {
        const factType = state.schema.factTypes.get(factTypeId);
        if (!factType) return state;

        // Remove predicators
        for (const predId of factType.predicators) {
          state.schema.predicators.delete(predId);
        }

        // Remove edges
        const edgesToRemove: string[] = [];
        for (const [edgeId, edge] of state.edges) {
          if (edge.factTypeId === factTypeId) {
            edgesToRemove.push(edgeId);
          }
        }
        for (const edgeId of edgesToRemove) {
          state.edges.delete(edgeId);
        }

        // Remove fact type
        state.schema.factTypes.delete(factTypeId);

        return state;
      });
    },

    // ============================================================================
    // CONSTRAINT OPERATIONS
    // ============================================================================

    /**
     * Add uniqueness constraint
     */
    addUniqueConstraint: (constraint: UniqueConstraint) => {
      update(state => {
        state.schema.uniqueConstraints.set(constraint.id, constraint);
        return state;
      });
    },

    /**
     * Add total role constraint
     */
    addTotalRoleConstraint: (constraint: TotalRoleConstraint) => {
      update(state => {
        state.schema.totalRoleConstraints.set(constraint.id, constraint);
        return state;
      });
    },

    /**
     * Add set constraint
     */
    addSetConstraint: (constraint: SetConstraint) => {
      update(state => {
        state.schema.setConstraints.set(constraint.id, constraint);
        return state;
      });
    },

    /**
     * Add cardinality constraint
     */
    addCardinalityConstraint: (constraint: CardinalityConstraint) => {
      update(state => {
        state.schema.cardinalityConstraints.set(constraint.id, constraint);
        return state;
      });
    },

    /**
     * Add custom constraint
     */
    addCustomConstraint: (constraint: CustomConstraint) => {
      update(state => {
        state.schema.customConstraints.set(constraint.id, constraint);
        return state;
      });
    },

    /**
     * Remove constraint
     */
    removeConstraint: (constraintId: string, type: string) => {
      update(state => {
        switch (type) {
          case 'Uniqueness':
            state.schema.uniqueConstraints.delete(constraintId);
            break;
          case 'TotalRole':
            state.schema.totalRoleConstraints.delete(constraintId);
            break;
          case 'SetConstraint':
            state.schema.setConstraints.delete(constraintId);
            break;
          case 'Cardinality':
            state.schema.cardinalityConstraints.delete(constraintId);
            break;
          case 'Custom':
            state.schema.customConstraints.delete(constraintId);
            break;
        }
        return state;
      });
    },

    // ============================================================================
    // POPULATION OPERATIONS
    // ============================================================================

    /**
     * Add instance to object population
     */
    addObjectInstance: (objectId: string, instance: Omega) => {
      update(state => {
        let pop = state.population.objectPopulations.get(objectId);
        if (!pop) {
          pop = { objectId, instances: new Set() };
          state.population.objectPopulations.set(objectId, pop);
        }
        pop.instances.add(instance);
        return state;
      });
    },

    /**
     * Add fact tuple
     */
    addFactTuple: (factTypeId: string, tuple: Map<string, Omega>) => {
      update(state => {
        let pop = state.population.factPopulations.get(factTypeId);
        if (!pop) {
          pop = { factTypeId, tuples: [] };
          state.population.factPopulations.set(factTypeId, pop);
        }
        pop.tuples.push(tuple);
        return state;
      });
    },

    /**
     * Clear all population data
     */
    clearPopulation: () => {
      update(state => {
        state.population = createEmptyPopulation(state.schema.id);
        return state;
      });
    },

    // ============================================================================
    // SELECTION OPERATIONS
    // ============================================================================

    /**
     * Select node
     */
    selectNode: (nodeId: string) => {
      update(state => {
        state.selectedNodes.add(nodeId);
        const node = state.nodes.get(nodeId);
        if (node) {
          node.isSelected = true;
          state.nodes.set(nodeId, node);
        }
        return state;
      });
    },

    /**
     * Deselect node
     */
    deselectNode: (nodeId: string) => {
      update(state => {
        state.selectedNodes.delete(nodeId);
        const node = state.nodes.get(nodeId);
        if (node) {
          node.isSelected = false;
          state.nodes.set(nodeId, node);
        }
        return state;
      });
    },

    /**
     * Clear all selections
     */
    clearSelection: () => {
      update(state => {
        // Deselect nodes
        for (const nodeId of state.selectedNodes) {
          const node = state.nodes.get(nodeId);
          if (node) {
            node.isSelected = false;
            state.nodes.set(nodeId, node);
          }
        }
        state.selectedNodes.clear();

        // Deselect edges
        for (const edgeId of state.selectedEdges) {
          const edge = state.edges.get(edgeId);
          if (edge) {
            edge.isSelected = false;
            state.edges.set(edgeId, edge);
          }
        }
        state.selectedEdges.clear();

        return state;
      });
    }
  };
}

/**
 * Main graph store instance
 */
export const graphStore = createGraphStore();

/**
 * Derived store: Validation results
 */
export const validationStore = derived(
  graphStore,
  ($graph) => ConstraintValidator.validate($graph.schema, $graph.population)
);

/**
 * Derived store: Node count
 */
export const nodeCountStore = derived(
  graphStore,
  ($graph) => $graph.nodes.size
);

/**
 * Derived store: Edge count
 */
export const edgeCountStore = derived(
  graphStore,
  ($graph) => $graph.edges.size
);

/**
 * Derived store: Is valid (no errors)
 */
export const isValidStore = derived(
  validationStore,
  ($validation) => $validation.isValid
);

/**
 * Helper: Get current schema
 */
export function getCurrentSchema(): InformationSchema {
  return get(graphStore).schema;
}

/**
 * Helper: Get current population
 */
export function getCurrentPopulation(): SchemaPopulation {
  return get(graphStore).population;
}

/**
 * Helper: Export entire state as JSON
 */
export function exportGraphState(): string {
  const state = get(graphStore);

  // Convert Maps to objects for JSON serialization
  const serializable = {
    schema: {
      ...state.schema,
      objects: Array.from(state.schema.objects.entries()),
      entities: Array.from(state.schema.entities.entries()),
      factTypes: Array.from(state.schema.factTypes.entries()),
      predicators: Array.from(state.schema.predicators.entries()),
      powerTypes: Array.from(state.schema.powerTypes.entries()),
      sequenceTypes: Array.from(state.schema.sequenceTypes.entries()),
      labelTypes: Array.from(state.schema.labelTypes.entries()),
      uniqueConstraints: Array.from(state.schema.uniqueConstraints.entries()),
      totalRoleConstraints: Array.from(state.schema.totalRoleConstraints.entries()),
      setConstraints: Array.from(state.schema.setConstraints.entries()),
      cardinalityConstraints: Array.from(state.schema.cardinalityConstraints.entries()),
      frequencyConstraints: Array.from(state.schema.frequencyConstraints.entries()),
      enumerationConstraints: Array.from(state.schema.enumerationConstraints.entries()),
      customConstraints: Array.from(state.schema.customConstraints.entries())
    },
    nodes: Array.from(state.nodes.entries()),
    edges: Array.from(state.edges.entries())
  };

  return JSON.stringify(serializable, null, 2);
}
