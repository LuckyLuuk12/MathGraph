/**
 * Canvas Store - Visual Modeling State Management
 */

import { writable, get } from 'svelte/store';
import type { CanvasState, CanvasNode, CanvasEdge, Constraint, Point, Tool } from '../canvas-types';
import { TOOLS } from '../canvas-types';

interface HistoryEntry {
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
  constraints: Map<string, Constraint>;
}

interface Clipboard {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function createInitialCanvasState(): CanvasState {
  return {
    nodes: new Map(),
    edges: new Map(),
    constraints: new Map(),
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    selectedConstraints: new Set(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDrawingEdge: false,
    isCreatingConstraint: false
  };
}

function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(JSON.parse(JSON.stringify(Array.from(map.entries()))));
}

function createCanvasStore() {
  const { subscribe, set, update } = writable<CanvasState>(createInitialCanvasState());
  const { subscribe: toolSubscribe, set: toolSet } = writable<Tool>(TOOLS.SELECT);

  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  const maxHistory = 50;
  let clipboard: Clipboard = { nodes: [], edges: [] };

  // Naming counters for unique sequential names
  let nameCounters = {
    entity: 0,
    factType: 0,
    labelType: 0,
    powerType: 0,
    sequenceType: 0,
    objectified: 0,
    predicator: 0,
    generalization: 0,
    specialization: 0
  };

  function getNextName(type: keyof typeof nameCounters): string {
    nameCounters[type]++;

    // Short names for edge types
    if (type === 'predicator') return `P${nameCounters[type]}`;
    if (type === 'generalization') return `G${nameCounters[type]}`;
    if (type === 'specialization') return `S${nameCounters[type]}`;

    // Full names for node types
    if (type === 'entity') return `Entity ${nameCounters[type]}`;
    if (type === 'factType') return `Fact ${nameCounters[type]}`;
    if (type === 'labelType') return `Label ${nameCounters[type]}`;
    if (type === 'powerType') return `Power ${nameCounters[type]}`;
    if (type === 'sequenceType') return `Seq ${nameCounters[type]}`;
    if (type === 'objectified') return `Obj ${nameCounters[type]}`;

    return type;
  }

  function saveHistory(state: CanvasState) {
    // Remove any redo history
    history = history.slice(0, historyIndex + 1);

    // Add new history entry
    history.push({
      nodes: cloneMap(state.nodes),
      edges: cloneMap(state.edges),
      constraints: cloneMap(state.constraints)
    });

    // Limit history size
    if (history.length > maxHistory) {
      history.shift();
    } else {
      historyIndex++;
    }
  }

  return {
    subscribe,
    toolStore: { subscribe: toolSubscribe },

    // ============================================================================
    // TOOL MANAGEMENT
    // ============================================================================

    setTool: (tool: Tool) => {
      toolSet(tool);
      // Clear edge drawing state when switching tools
      if (tool.id !== 'edge') {
        update(state => ({
          ...state,
          isDrawingEdge: false,
          drawingEdgeStart: undefined,
          tempEdgeEnd: undefined
        }));
      }
    },

    // ============================================================================
    // NODE OPERATIONS
    // ============================================================================

    addNode: (node: CanvasNode) => {
      update(state => {
        // Generate unique name if using default name
        if (node.label === 'Entity' || node.label === 'FactType' || node.label === 'LabelType' ||
          node.label === 'PowerType' || node.label === 'SeqType' || node.label.startsWith('Obj(')) {
          if (node.type === 'objectified') {
            // Keep the Obj(FactType) format but with counter
            const factNode = state.nodes.get(node.objectifiedFactId || '');
            node.label = `Obj(${factNode?.label || getNextName('objectified')})`;
          } else {
            node.label = getNextName(node.type as keyof typeof nameCounters);
          }
        }

        state.nodes.set(node.id, node);
        saveHistory(state);
        return state;
      });
    },

    updateNode: (nodeId: string, updates: Partial<CanvasNode>) => {
      update(state => {
        const node = state.nodes.get(nodeId);
        if (node) {
          state.nodes.set(nodeId, { ...node, ...updates });
        }
        saveHistory(state);
        return state;
      });
    },

    removeNode: (nodeId: string) => {
      update(state => {
        state.nodes.delete(nodeId);
        state.selectedNodes.delete(nodeId);

        // Remove connected edges
        const edgesToRemove: string[] = [];
        for (const [edgeId, edge] of state.edges) {
          if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
            edgesToRemove.push(edgeId);
          }
        }
        edgesToRemove.forEach(id => state.edges.delete(id));
        saveHistory(state);

        return state;
      });
    },

    moveNode: (nodeId: string, position: Point) => {
      update(state => {
        const node = state.nodes.get(nodeId);
        if (node) {
          node.position = position;

          // Update squares for n-ary fact types
          if (node.type === 'factType' && node.squares && node.arity) {
            const squareSize = 40;
            const spacing = 0;
            node.squares = node.squares.map((square, index) => ({
              ...square,
              position: {
                x: position.x + index * (squareSize + spacing),
                y: position.y
              }
            }));
          }

          state.nodes.set(nodeId, node);
        }
        return state;
      });
    },

    // ============================================================================
    // EDGE OPERATIONS
    // ============================================================================

    addEdge: (edge: CanvasEdge) => {
      update(state => {
        state.edges.set(edge.id, edge);
        saveHistory(state);
        return state;
      });
    },

    removeEdge: (edgeId: string) => {
      update(state => {
        state.edges.delete(edgeId);
        state.selectedEdges.delete(edgeId);
        saveHistory(state);
        return state;
      });
    },

    updateEdge: (edgeId: string, updates: Partial<CanvasEdge>) => {
      update(state => {
        const edge = state.edges.get(edgeId);
        if (edge) {
          state.edges.set(edgeId, { ...edge, ...updates });
        }
        saveHistory(state);
        return state;
      });
    },

    startDrawingEdge: (nodeId: string, squareId?: string) => {
      update(state => ({
        ...state,
        isDrawingEdge: true,
        drawingEdgeStart: { nodeId, squareId }
      }));
    },

    updateTempEdge: (point: Point) => {
      update(state => ({
        ...state,
        tempEdgeEnd: point
      }));
    },

    finishDrawingEdge: (targetNodeId: string, targetSquareId?: string, edgeType: 'predicator' | 'generalization' | 'specialization' = 'predicator') => {
      let edgeCreated = false;

      update(state => {
        if (state.drawingEdgeStart) {
          const edgeId = crypto.randomUUID();
          const edge: CanvasEdge = {
            id: edgeId,
            sourceNodeId: state.drawingEdgeStart.nodeId,
            targetNodeId,
            sourceSquareId: state.drawingEdgeStart.squareId,
            targetSquareId,
            label: getNextName(edgeType),
            color: edgeType === 'predicator' ? '#6366f1' : edgeType === 'generalization' ? '#10b981' : '#f59e0b',
            isSelected: false,
            predicatorId: '', // Will be set when connected to schema
            type: edgeType
          };
          state.edges.set(edgeId, edge);
          edgeCreated = true;
        }

        return {
          ...state,
          isDrawingEdge: false,
          drawingEdgeStart: undefined,
          tempEdgeEnd: undefined
        };
      });

      return edgeCreated;
    },

    cancelDrawingEdge: () => {
      update(state => ({
        ...state,
        isDrawingEdge: false,
        drawingEdgeStart: undefined,
        tempEdgeEnd: undefined
      }));
    },

    // ============================================================================
    // SELECTION
    // ============================================================================

    selectNode: (nodeId: string, multiSelect = false) => {
      update(state => {
        if (!multiSelect) {
          state.selectedNodes.clear();
          state.selectedEdges.clear();
          state.nodes.forEach(node => node.isSelected = false);
          state.edges.forEach(edge => edge.isSelected = false);
        }

        state.selectedNodes.add(nodeId);
        const node = state.nodes.get(nodeId);
        if (node) {
          node.isSelected = true;
          state.nodes.set(nodeId, node);
        }

        return state;
      });
    },

    selectEdge: (edgeId: string, multiSelect = false) => {
      update(state => {
        if (!multiSelect) {
          state.selectedNodes.clear();
          state.selectedEdges.clear();
          state.nodes.forEach(node => node.isSelected = false);
          state.edges.forEach(edge => edge.isSelected = false);
        }

        state.selectedEdges.add(edgeId);
        const edge = state.edges.get(edgeId);
        if (edge) {
          edge.isSelected = true;
          state.edges.set(edgeId, edge);
        }

        return state;
      });
    },

    clearSelection: () => {
      update(state => {
        state.selectedNodes.clear();
        state.selectedEdges.clear();
        state.nodes.forEach(node => node.isSelected = false);
        state.edges.forEach(edge => edge.isSelected = false);
        return state;
      });
    },

    deleteSelected: () => {
      update(state => {
        // Delete selected nodes
        for (const nodeId of state.selectedNodes) {
          state.nodes.delete(nodeId);

          // Delete connected edges
          const edgesToRemove: string[] = [];
          for (const [edgeId, edge] of state.edges) {
            if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
              edgesToRemove.push(edgeId);
            }
          }
          edgesToRemove.forEach(id => state.edges.delete(id));
        }

        // Delete selected edges
        for (const edgeId of state.selectedEdges) {
          state.edges.delete(edgeId);
        }

        state.selectedNodes.clear();
        state.selectedEdges.clear();

        saveHistory(state);
        return state;
      });
    },

    updateEdgesAfterArityChange: (nodeId: string, removedSquareIds: Set<string>, fallbackSquareId: string) => {
      update(state => {
        // Update edges connected to removed squares
        for (const [edgeId, edge] of state.edges) {
          let updated = false;

          if (edge.sourceNodeId === nodeId && edge.sourceSquareId && removedSquareIds.has(edge.sourceSquareId)) {
            edge.sourceSquareId = fallbackSquareId;
            updated = true;
          }

          if (edge.targetNodeId === nodeId && edge.targetSquareId && removedSquareIds.has(edge.targetSquareId)) {
            edge.targetSquareId = fallbackSquareId;
            updated = true;
          }

          if (updated) {
            state.edges.set(edgeId, edge);
          }
        }
        return state;
      });
    },

    reconnectEdge: (edgeId: string, end: 'source' | 'target', newNodeId: string, newSquareId?: string) => {
      update((state) => {
        const edge = state.edges.get(edgeId);
        if (!edge) return state;

        const node = state.nodes.get(newNodeId);
        if (!node) return state;

        // For fact types, use specified square or first square
        const squareId = newSquareId || (node.squares?.[0]?.id || undefined);

        const updatedEdge = { ...edge };
        if (end === 'source') {
          updatedEdge.sourceNodeId = newNodeId;
          updatedEdge.sourceSquareId = squareId;
        } else {
          updatedEdge.targetNodeId = newNodeId;
          updatedEdge.targetSquareId = squareId;
        }

        return {
          ...state,
          edges: new Map(state.edges).set(edgeId, updatedEdge)
        };
      });
    },

    startReconnectingEdge: (edgeId: string, end: 'source' | 'target') => {
      update((state) => ({
        ...state,
        isReconnectingEdge: true,
        reconnectingEdgeId: edgeId,
        reconnectingEnd: end,
        selectedNodes: new Set(),
        selectedEdges: new Set()
      }));
    },

    finishReconnectingEdge: (newNodeId: string, newSquareId?: string) => {
      update((state) => {
        if (!state.isReconnectingEdge || !state.reconnectingEdgeId) return state;

        const edge = state.edges.get(state.reconnectingEdgeId);
        if (!edge) return state;

        const node = state.nodes.get(newNodeId);
        if (!node) return state;

        const squareId = newSquareId || (node.squares?.[0]?.id || undefined);
        const updatedEdge = { ...edge };

        if (state.reconnectingEnd === 'source') {
          updatedEdge.sourceNodeId = newNodeId;
          updatedEdge.sourceSquareId = squareId;
        } else {
          updatedEdge.targetNodeId = newNodeId;
          updatedEdge.targetSquareId = squareId;
        }

        return {
          ...state,
          edges: new Map(state.edges).set(state.reconnectingEdgeId, updatedEdge),
          isReconnectingEdge: false,
          reconnectingEdgeId: undefined,
          reconnectingEnd: undefined,
          tempEdge: undefined
        };
      });
    },

    cancelReconnectingEdge: () => {
      update((state) => ({
        ...state,
        isReconnectingEdge: false,
        reconnectingEdgeId: undefined,
        reconnectingEnd: undefined,
        tempEdge: undefined
      }));
    },

    // ============================================================================
    // VIEW OPERATIONS
    // ============================================================================

    setZoom: (zoom: number) => {
      update(state => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
        return state;
      });
    },

    setPan: (pan: Point) => {
      update(state => {
        state.pan = pan;
        return state;
      });
    },

    resetView: () => {
      update(state => {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
        return state;
      });
    },

    // ============================================================================
    // UTILITY
    // ============================================================================

    clear: () => {
      const newState = createInitialCanvasState();
      update(state => {
        saveHistory(state);
        return newState;
      });
    },

    getNode: (nodeId: string): CanvasNode | undefined => {
      return get({ subscribe }).nodes.get(nodeId);
    },

    getEdge: (edgeId: string): CanvasEdge | undefined => {
      return get({ subscribe }).edges.get(edgeId);
    },

    // ============================================================================
    // UNDO / REDO
    // ============================================================================

    undo: () => {
      if (historyIndex > 0) {
        historyIndex--;
        const entry = history[historyIndex];
        update(state => ({
          ...state,
          nodes: cloneMap(entry.nodes),
          edges: cloneMap(entry.edges),
          constraints: cloneMap(entry.constraints),
          selectedNodes: new Set(),
          selectedEdges: new Set(),
          selectedConstraints: new Set()
        }));
      }
    },

    redo: () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const entry = history[historyIndex];
        update(state => ({
          ...state,
          nodes: cloneMap(entry.nodes),
          edges: cloneMap(entry.edges),
          constraints: cloneMap(entry.constraints),
          selectedNodes: new Set(),
          selectedEdges: new Set(),
          selectedConstraints: new Set()
        }));
      }
    },

    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,

    // ============================================================================
    // COPY / PASTE
    // ============================================================================

    copy: () => {
      const state = get({ subscribe });
      const selectedNodes = Array.from(state.selectedNodes).map(id => {
        const node = state.nodes.get(id);
        return node ? { ...node } : null;
      }).filter(Boolean) as CanvasNode[];

      const selectedEdges = Array.from(state.selectedEdges).map(id => {
        const edge = state.edges.get(id);
        return edge ? { ...edge } : null;
      }).filter(Boolean) as CanvasEdge[];

      clipboard = { nodes: selectedNodes, edges: selectedEdges };
    },

    paste: () => {
      if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) return;

      update(state => {
        saveHistory(state);

        const idMap = new Map<string, string>();

        // Clear current selection
        state.selectedNodes.clear();
        state.selectedEdges.clear();
        state.nodes.forEach(node => node.isSelected = false);
        state.edges.forEach(edge => edge.isSelected = false);

        // Paste nodes with offset
        clipboard.nodes.forEach(node => {
          const newId = crypto.randomUUID();
          idMap.set(node.id, newId);

          const newNode: CanvasNode = {
            ...node,
            id: newId,
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            isSelected: true,
            isDragging: false
          };

          // Update squares positions for fact types
          if (newNode.type === 'factType' && newNode.squares) {
            newNode.squares = newNode.squares.map((square, index) => ({
              ...square,
              id: crypto.randomUUID(),
              position: {
                x: newNode.position.x + index * 45,
                y: newNode.position.y
              }
            }));
          }

          state.nodes.set(newId, newNode);
          state.selectedNodes.add(newId);
        });

        // Paste edges (only if both nodes are pasted)
        clipboard.edges.forEach(edge => {
          const newSourceId = idMap.get(edge.sourceNodeId);
          const newTargetId = idMap.get(edge.targetNodeId);

          if (newSourceId && newTargetId) {
            const newEdgeId = crypto.randomUUID();
            const newEdge: CanvasEdge = {
              ...edge,
              id: newEdgeId,
              sourceNodeId: newSourceId,
              targetNodeId: newTargetId,
              isSelected: true
            };

            state.edges.set(newEdgeId, newEdge);
            state.selectedEdges.add(newEdgeId);
          }
        });

        return state;
      });
    },

    // Constraint operations
    addConstraint: (constraint: Constraint) => {
      update(state => {
        state.constraints.set(constraint.id, constraint);
        saveHistory(state);
        return state;
      });
    },

    updateConstraint: (id: string, updates: Partial<Constraint>) => {
      update(state => {
        const constraint = state.constraints.get(id);
        if (constraint) {
          state.constraints.set(id, { ...constraint, ...updates });
          saveHistory(state);
        }
        return state;
      });
    },

    removeConstraint: (id: string) => {
      update(state => {
        state.constraints.delete(id);
        state.selectedConstraints.delete(id);
        saveHistory(state);
        return state;
      });
    },

    toggleConstraintSelection: (id: string) => {
      update(state => {
        if (state.selectedConstraints.has(id)) {
          state.selectedConstraints.delete(id);
        } else {
          state.selectedConstraints.add(id);
        }
        return state;
      });
    },

    clearConstraintSelection: () => {
      update(state => {
        state.selectedConstraints.clear();
        return state;
      });
    },

    getSelectedConstraintIds: (): string[] => {
      const state = get({ subscribe });
      return Array.from(state.selectedConstraints);
    },

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    loadState: (newState: CanvasState) => {
      set(newState);
      // Reset history after loading
      history = [{
        nodes: cloneMap(newState.nodes),
        edges: cloneMap(newState.edges),
        constraints: cloneMap(newState.constraints || new Map())
      }];
      historyIndex = 0;
    },

    reset: () => {
      set(createInitialCanvasState());
      history = [];
      historyIndex = -1;
    }
  };
}

export const canvasStore = createCanvasStore();
