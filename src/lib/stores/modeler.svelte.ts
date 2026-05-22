import { GraphUtils } from '$lib/modeler/graph';

import type {
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

  // Derived Link Paths
  public activeLinks = $derived.by(() => {
    return this.links.map((link) => {
      const fromNode = this.nodes.find((n) => n.id === link.fromId);
      const toNode = this.nodes.find((n) => n.id === link.toId);

      if (!fromNode || !toNode) {
        return link;
      }

      const path = GraphUtils.findNearestPath(
        fromNode.connectionPoints,
        toNode.connectionPoints
      );

      return {
        ...link,
        path
      };
    });
  });

  // Graph Mutations
  public setNodes(nodes: VisualNode[]) {
    this.nodes = nodes;
  }

  public setLinks(links: VisualLink[]) {
    this.links = links;
  }

  public addNode(node: VisualNode) {
    this.nodes.push(node);
  }

  public addLink(link: VisualLink) {
    this.links.push(link);
  }

  public updateNodePosition(
    id: string,
    x: number,
    y: number
  ) {
    const node = this.nodes.find((n) => n.id === id);

    if (!node) return;

    node.position = { x, y };

    node.connectionPoints =
      node.kind === 'FACT_BOX_N'
        ? GraphUtils.getBoxPoints(
          node.position,
          node.dimensions
        )
        : GraphUtils.getCirclePoints(
          node.position,
          node.dimensions.width / 2
        );
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
}

export const modelerStore = new ModelerStore();

// This is used to transfers the selected/dragging shape from ShapeBar to Modeler canvas
export const shapeTool = $state<{
  selected: string | null;
  mode: 'idle' | 'dragging';
}>({
  selected: null,
  mode: 'idle'
});