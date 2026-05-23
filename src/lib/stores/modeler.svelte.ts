import { GraphUtils } from '$lib/modeler/graph';
import { currentProject } from '$lib/stores/app';
import { loadVisualState, saveVisualState, updateProject } from '$lib/stores/localstorage';
import { get, writable } from 'svelte/store';

import type {
  LinkKind,
  VisualLink,
  VisualNode
} from '$lib/modeler/graph';

class ModelerStore {
  // Reactive Graph State
  public nodes = $state<VisualNode[]>([]);
  public links = $state<VisualLink[]>([]);
  // Interaction State
  public selectedNodeId = $state<string | null>(null);

  public isDragging = $state(false);
  public draggedNodeId = $state<string | null>(null);

  public dragOffset = $state({
    x: 0,
    y: 0
  });

  public zoom = $state(1);
  public pan = $state({ x: 0, y: 0 });

  // Snapping
  public snapToGrid = $state(true);
  public gridSize = $state(16);

  private readonly minZoom = 0.35;
  private readonly maxZoom = 2.5;

  // Derived Link Paths
  public activeLinks = $derived.by(() => {
    return this.links.map((link) => {
      const fromNode = this.nodes.find((n) => n.id === link.fromId);
      const toNode = this.nodes.find((n) => n.id === link.toId);

      if (!fromNode || !toNode) {
        return { ...link, id: `${link.fromId}_${link.toId}_${link.kind}` };
      }

      const path = GraphUtils.findNearestPath(
        fromNode.connectionPoints,
        toNode.connectionPoints
      );

      return {
        ...link,
        id: `${link.fromId}_${link.toId}_${link.kind}`,
        path
      };
    });
  });

  // Graph Mutations
  public setNodes(nodes: VisualNode[]) {
    this.nodes = nodes;
    this.saveToProject();
  }

  public setLinks(links: VisualLink[]) {
    this.links = links;
    this.saveToProject();
  }

  public addNode(node: VisualNode) {
    this.nodes.push(node);
    this.saveToProject();
  }

  public setSnapEnabled(enabled: boolean) {
    this.snapToGrid = enabled;
  }

  private snap(v: number) {
    if (!this.snapToGrid) return v;
    const g = this.gridSize;
    return Math.round(v / g) * g;
  }

  public selectNode(id: string | null) {
    this.selectedNodeId = id;
  }

  public addLink(link: VisualLink) {
    this.links.push(link);
    this.autoAdjustFactArity(link.fromId as string);
    this.autoAdjustFactArity(link.toId as string);
    this.saveToProject();
  }

  public connectNodes(fromId: string, toId: string, kind: LinkKind): { ok: boolean; reason?: string } {
    if (fromId === toId) {
      return { ok: false, reason: 'Cannot connect node to itself.' };
    }

    const fromNode = this.nodes.find((node) => node.id === fromId);
    const toNode = this.nodes.find((node) => node.id === toId);

    if (!fromNode || !toNode) {
      return { ok: false, reason: 'Missing source or target node.' };
    }

    const validation = this.canConnectNodes(fromNode, toNode, kind);
    if (!validation.ok) {
      return validation;
    }

    const exists = this.links.some((link) => link.fromId === fromId && link.toId === toId && link.kind === kind);
    if (exists) {
      return { ok: false, reason: 'Connection already exists.' };
    }

    this.addLink({
      fromId: fromId as any,
      toId: toId as any,
      kind,
      path: []
    });

    return { ok: true };
  }

  public deleteNode(id: string) {
    this.nodes = this.nodes.filter((n) => n.id !== id);
    this.links = this.links.filter((l) => l.fromId !== id && l.toId !== id);
    if (this.selectedNodeId === id) {
      this.selectedNodeId = null;
    }
    this.saveToProject();
  }

  public updateNodeLabel(id: string, label: string) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.label = label;
    this.saveToProject();
  }

  public updateNodeColor(id: string, fillColor: string) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.fillColor = fillColor;
    this.saveToProject();
  }

  public setNodeObjectified(id: string, value: boolean) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.isObjectified = value;
    this.saveToProject();
  }

  public setFactArity(id: string, nextArity: number) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    if (!this.isFactNode(node)) return;

    const arity = Math.min(12, Math.max(1, Math.round(nextArity)));
    node.arity = arity;
    node.dimensions = {
      width: Math.max(56, arity * 32),
      height: 56
    };
    node.connectionPoints = GraphUtils.getBoxPoints(node.position, node.dimensions);
    this.saveToProject();
  }

  public updateNodePosition(
    id: string,
    x: number,
    y: number
  ) {
    const node = this.nodes.find((n) => n.id === id);

    if (!node) return;

    node.position = { x: this.snap(x), y: this.snap(y) };

    node.connectionPoints =
      node.kind === 'FACT_BOX_N' || node.kind === 'SEQUENCE_TYPE_BOX' || node.kind === 'OBJECTIFIED_FACT'
        ? GraphUtils.getBoxPoints(
          node.position,
          node.dimensions
        )
        : GraphUtils.getCirclePoints(
          node.position,
          node.dimensions.width / 2
        );

    this.saveToProject();
  }

  // Dragging
  public startDragging(
    mouseX: number,
    mouseY: number,
    node: VisualNode
  ) {
    this.isDragging = true;

    this.draggedNodeId = node.id;

    this.dragOffset = {
      x: mouseX - node.position.x,
      y: mouseY - node.position.y
    };
  }

  public dragTo(mouseX: number, mouseY: number) {
    if (!this.isDragging || !this.draggedNodeId) {
      return;
    }

    this.updateNodePosition(
      this.draggedNodeId,
      mouseX - this.dragOffset.x,
      mouseY - this.dragOffset.y
    );
  }

  public stopDragging() {
    this.isDragging = false;
    this.draggedNodeId = null;
  }

  // Camera controls
  public setZoom(nextZoom: number) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, nextZoom));
  }

  public zoomAt(factor: number, pivot: { x: number; y: number }) {
    const prevZoom = this.zoom;
    const nextZoom = Math.min(this.maxZoom, Math.max(this.minZoom, prevZoom * factor));
    if (nextZoom === prevZoom) return;

    const worldX = (pivot.x - this.pan.x) / prevZoom;
    const worldY = (pivot.y - this.pan.y) / prevZoom;

    this.zoom = nextZoom;
    this.pan = {
      x: pivot.x - worldX * nextZoom,
      y: pivot.y - worldY * nextZoom
    };
  }

  public panBy(dx: number, dy: number) {
    this.pan = {
      x: this.pan.x + dx,
      y: this.pan.y + dy
    };
  }

  public resetCamera() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  // Load/save visual state
  public loadVisual(projectId: string) {
    const data = loadVisualState(projectId);
    if (!data) return;
    if (Array.isArray(data.nodes)) this.nodes = data.nodes;
    if (Array.isArray(data.links)) this.links = data.links;
    if (data.zoom) this.zoom = data.zoom;
    if (data.pan) this.pan = data.pan;
  }

  private isFactNode(node: VisualNode): boolean {
    return node.kind === 'FACT_BOX_N' || node.kind === 'OBJECTIFIED_FACT';
  }

  private isHierarchyNode(node: VisualNode): boolean {
    return node.kind !== 'FACT_BOX_N';
  }

  private canConnectNodes(fromNode: VisualNode, toNode: VisualNode, kind: LinkKind): { ok: boolean; reason?: string } {
    const fromFact = this.isFactNode(fromNode);
    const toFact = this.isFactNode(toNode);

    if (kind === 'PREDICATOR_LINE') {
      if (fromFact !== toFact) {
        return { ok: true };
      }

      return {
        ok: false,
        reason: 'Normal edges only connect fact/objectified fact to non-fact object.'
      };
    }

    if (!this.isHierarchyNode(fromNode) || !this.isHierarchyNode(toNode)) {
      return {
        ok: false,
        reason: 'Specialization/generalization only connect hierarchy-capable objects.'
      };
    }

    if (fromFact || toFact) {
      return {
        ok: false,
        reason: 'Fact nodes cannot participate in specialization/generalization.'
      };
    }

    return { ok: true };
  }

  private autoAdjustFactArity(nodeId: string) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || !this.isFactNode(node)) return;

    const connected = this.links.filter((link) => link.fromId === nodeId || link.toId === nodeId).length;
    const nextArity = Math.max(1, connected);
    this.setFactArity(nodeId, nextArity);
  }

  // Auto-save to project
  private saveToProject() {
    const proj = get(currentProject);
    if (proj) {
      // Persist visual state separately
      saveVisualState(proj.id, {
        nodes: this.nodes,
        links: this.links,
        zoom: this.zoom,
        pan: this.pan
      });
      updateProject(proj);
    }
  }
}

export const modelerStore = new ModelerStore();

// Store for selected shape from ShapeBar to transfer to Modeler canvas
export const shapeTool = writable<{
  selected: string | null;
  mode: 'idle' | 'dragging';
}>({
  selected: null,
  mode: 'idle'
});

export const linkTool = writable<{
  mode: LinkKind | 'OFF';
  sourceId: string | null;
}>({
  mode: 'OFF',
  sourceId: null
});

// Load visual state when currentProject changes
currentProject.subscribe((p) => {
  if (p) {
    modelerStore.loadVisual(p.id);
  }
});