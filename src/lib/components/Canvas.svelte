<script lang="ts">
	/**
	 * Visual Modeling Canvas Component
	 *
	 * Interactive canvas for drawing entities, fact types, and predicates
	 */

	import { onMount } from 'svelte';
	import { canvasStore } from '$lib/stores/canvas-store';
	import { TOOLS } from '$lib/canvas-types';
	import type { CanvasNode, Point, Tool } from '$lib/canvas-types';

	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let containerElement: HTMLDivElement;

	let isDragging = false;
	let draggedNodeId: string | null = null;
	let dragOffset: Point = { x: 0, y: 0 };
	let isPanning = false;
	let panStart: Point = { x: 0, y: 0 };

	let currentTool: Tool = TOOLS.SELECT;

	canvasStore.toolStore.subscribe((tool) => {
		currentTool = tool;
	});

	// Canvas dimensions
	let width = 800;
	let height = 600;

	onMount(() => {
		const canvas = canvasElement;
		ctx = canvas.getContext('2d')!;

		// Set canvas size
		updateCanvasSize();
		window.addEventListener('resize', updateCanvasSize);

		// Start render loop
		requestAnimationFrame(render);

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
		};
	});

	function updateCanvasSize() {
		if (containerElement) {
			width = containerElement.clientWidth;
			height = containerElement.clientHeight;
			canvasElement.width = width;
			canvasElement.height = height;
		}
	}

	function render() {
		if (!ctx) return;

		const state = $canvasStore;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Apply transformations
		ctx.save();
		ctx.translate(state.pan.x, state.pan.y);
		ctx.scale(state.zoom, state.zoom);

		// Draw grid
		drawGrid();

		// Draw edges
		for (const edge of state.edges.values()) {
			drawEdge(edge);
		}

		// Draw temp edge while drawing
		if (state.isDrawingEdge && state.drawingEdgeStart && state.tempEdgeEnd) {
			drawTempEdge(state.drawingEdgeStart.nodeId, state.tempEdgeEnd);
		}

		// Draw nodes
		for (const node of state.nodes.values()) {
			drawNode(node);
		}

		ctx.restore();

		requestAnimationFrame(render);
	}

	function drawGrid() {
		const gridSize = 20;
		const color =
			getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() ||
			'#e5e7eb';

		ctx.strokeStyle = color;
		ctx.lineWidth = 0.5;

		// Vertical lines
		for (let x = 0; x < width / $canvasStore.zoom; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height / $canvasStore.zoom);
			ctx.stroke();
		}

		// Horizontal lines
		for (let y = 0; y < height / $canvasStore.zoom; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width / $canvasStore.zoom, y);
			ctx.stroke();
		}
	}

	function drawNode(node: CanvasNode) {
		ctx.save();

		// Highlight if selected
		if (node.isSelected) {
			ctx.strokeStyle = '#3b82f6';
			ctx.lineWidth = 3;
		} else {
			ctx.strokeStyle = '#1f2937';
			ctx.lineWidth = 2;
		}

		ctx.fillStyle = node.color;

		if (node.type === 'factType' && node.arity && node.arity > 1) {
			// Draw n-ary fact type (grid of squares)
			drawNaryFactType(node);
		} else if (node.type === 'powerType') {
			// Draw double circle for power type
			drawPowerType(node);
		} else if (node.type === 'sequenceType') {
			// Draw rectangle around entity for sequence type
			drawSequenceType(node);
		} else if (node.type === 'objectified') {
			// Draw circle around fact type for objectification
			drawObjectification(node);
		} else if (node.shape === 'circle') {
			// Draw circle (entity type)
			drawCircle(node);
		} else if (node.shape === 'square') {
			// Draw square (single fact type)
			drawSquare(node);
		} else if (node.shape === 'diamond') {
			// Draw diamond (label type)
			drawDiamond(node);
		}

		// Draw label
		ctx.fillStyle = '#1f2937';
		ctx.font = '14px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(
			node.label,
			node.position.x + node.size.width / 2,
			node.position.y + node.size.height + 20
		);

		ctx.restore();
	}

	function drawCircle(node: CanvasNode) {
		const centerX = node.position.x + node.size.width / 2;
		const centerY = node.position.y + node.size.height / 2;
		const radius = Math.min(node.size.width, node.size.height) / 2;

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}

	function drawSquare(node: CanvasNode) {
		ctx.fillRect(node.position.x, node.position.y, node.size.width, node.size.height);
		ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);
	}

	function drawDiamond(node: CanvasNode) {
		const centerX = node.position.x + node.size.width / 2;
		const centerY = node.position.y + node.size.height / 2;
		const halfWidth = node.size.width / 2;
		const halfHeight = node.size.height / 2;

		ctx.beginPath();
		ctx.moveTo(centerX, centerY - halfHeight);
		ctx.lineTo(centerX + halfWidth, centerY);
		ctx.lineTo(centerX, centerY + halfHeight);
		ctx.lineTo(centerX - halfWidth, centerY);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}

	function drawNaryFactType(node: CanvasNode) {
		if (!node.squares || !node.arity) return;

		const squareSize = 40;
		const spacing = 0;

		for (let i = 0; i < node.arity; i++) {
			const x = node.position.x + i * (squareSize + spacing);
			const y = node.position.y;

			ctx.fillRect(x, y, squareSize, squareSize);
			ctx.strokeRect(x, y, squareSize, squareSize);
		}
	}

	function drawPowerType(node: CanvasNode) {
		// Draw double circle for power type
		const centerX = node.position.x + node.size.width / 2;
		const centerY = node.position.y + node.size.height / 2;
		const radius = Math.min(node.size.width, node.size.height) / 2;
		const innerRadius = radius - 5;

		// Outer circle
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// Inner circle
		ctx.beginPath();
		ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
		ctx.stroke();
	}

	function drawSequenceType(node: CanvasNode) {
		// Draw rectangle around entity circle for sequence type
		const centerX = node.position.x + node.size.width / 2;
		const centerY = node.position.y + node.size.height / 2;
		const radius = Math.min(node.size.width, node.size.height) / 2;

		// Draw outer rectangle
		const rectPadding = 10;
		ctx.strokeRect(
			node.position.x - rectPadding,
			node.position.y - rectPadding,
			node.size.width + rectPadding * 2,
			node.size.height + rectPadding * 2
		);

		// Draw inner entity circle
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}

	function drawObjectification(node: CanvasNode) {
		// Draw circle around fact type for objectification
		// First, get the fact type this objectifies
		const factNode = node.objectifiedFactId ? $canvasStore.nodes.get(node.objectifiedFactId) : null;

		if (factNode) {
			// Draw a circle around the fact type
			const centerX = factNode.position.x + factNode.size.width / 2;
			const centerY = factNode.position.y + factNode.size.height / 2;
			const radius = Math.max(factNode.size.width, factNode.size.height) / 2 + 20;

			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
			ctx.stroke();
		} else {
			// If no fact type yet, just draw a circle like entity
			drawCircle(node);
		}
	}

	function drawEdge(edge: typeof $canvasStore.edges extends Map<string, infer T> ? T : never) {
		const sourceNode = $canvasStore.nodes.get(edge.sourceNodeId);
		const targetNode = $canvasStore.nodes.get(edge.targetNodeId);

		if (!sourceNode || !targetNode) return;

		ctx.save();

		ctx.strokeStyle = edge.isSelected ? '#3b82f6' : edge.color;
		ctx.lineWidth = edge.isSelected ? 3 : 2;

		// Calculate connection points with smart side detection
		const sourceCenter = getConnectionPoint(sourceNode, edge.sourceSquareId);
		const targetCenter = getConnectionPoint(targetNode, edge.targetSquareId);
		const start = getConnectionPoint(sourceNode, edge.sourceSquareId, targetCenter);
		const end = getConnectionPoint(targetNode, edge.targetSquareId, sourceCenter);

		// Set line style based on edge type
		if (edge.type === 'generalization') {
			// Dotted line for generalization
			ctx.setLineDash([5, 5]);
		} else if (edge.type === 'specialization') {
			// Solid line for specialization (default)
			ctx.setLineDash([]);
		} else {
			// Predicator - solid line
			ctx.setLineDash([]);
		}

		// Draw line
		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();

		// Draw arrowhead for generalization/specialization
		if (edge.type === 'generalization' || edge.type === 'specialization') {
			drawArrowhead(end, start);
		}

		// Reset line dash
		ctx.setLineDash([]);

		// Draw label
		if (edge.label) {
			const midX = (start.x + end.x) / 2;
			const midY = (start.y + end.y) / 2;

			// Measure text to size background appropriately
			ctx.font = '12px sans-serif';
			const metrics = ctx.measureText(edge.label);
			const textWidth = Math.min(metrics.width, 150); // Max width 150px
			const padding = 4;
			const bgHeight = 18;

			// Get theme-aware background color
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const bgColor = isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
			const textColor = isDark ? '#e5e7eb' : '#1f2937';

			// Draw semi-transparent background
			ctx.fillStyle = bgColor;
			ctx.fillRect(
				midX - textWidth / 2 - padding,
				midY - bgHeight / 2,
				textWidth + padding * 2,
				bgHeight
			);

			// Draw text (truncate if too long)
			ctx.fillStyle = textColor;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			let displayText = edge.label;
			if (metrics.width > 150) {
				// Truncate with ellipsis
				while (ctx.measureText(displayText + '...').width > 150 && displayText.length > 0) {
					displayText = displayText.slice(0, -1);
				}
				displayText += '...';
			}
			ctx.fillText(displayText, midX, midY);
		}

		ctx.restore();
	}

	function drawArrowhead(tip: Point, base: Point) {
		const angle = Math.atan2(tip.y - base.y, tip.x - base.x);
		const arrowLength = 15;
		const arrowWidth = 8;

		ctx.save();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.beginPath();
		ctx.moveTo(tip.x, tip.y);
		ctx.lineTo(
			tip.x - arrowLength * Math.cos(angle - Math.PI / 6),
			tip.y - arrowLength * Math.sin(angle - Math.PI / 6)
		);
		ctx.lineTo(
			tip.x - arrowLength * Math.cos(angle + Math.PI / 6),
			tip.y - arrowLength * Math.sin(angle + Math.PI / 6)
		);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	function getConnectionPoint(node: CanvasNode, squareId?: string, otherPoint?: Point): Point {
		// If connecting to a specific square in n-ary fact type
		if (squareId && node.squares) {
			const square = node.squares.find((s) => s.id === squareId);
			if (square) {
				const squareSize = 40;
				const centerX = square.position.x + squareSize / 2;
				const centerY = square.position.y + squareSize / 2;

				// If we have the other point, connect to the closest side
				if (otherPoint) {
					const dx = otherPoint.x - centerX;
					const dy = otherPoint.y - centerY;

					// Determine which side is closest based on angle
					const angle = Math.atan2(dy, dx);
					const absAngle = Math.abs(angle);

					// Right side
					if (absAngle < Math.PI / 4) {
						return { x: square.position.x + squareSize, y: centerY };
					}
					// Left side
					else if (absAngle > (3 * Math.PI) / 4) {
						return { x: square.position.x, y: centerY };
					}
					// Bottom side
					else if (angle > 0) {
						return { x: centerX, y: square.position.y + squareSize };
					}
					// Top side
					else {
						return { x: centerX, y: square.position.y };
					}
				}

				// Default to center if no other point
				return { x: centerX, y: centerY };
			}
		}

		// Default: center of node
		return {
			x: node.position.x + node.size.width / 2,
			y: node.position.y + node.size.height / 2
		};
	}

	function drawTempEdge(startNodeId: string, end: Point) {
		const startNode = $canvasStore.nodes.get(startNodeId);
		if (!startNode) return;

		const start = getConnectionPoint(startNode);

		ctx.save();
		ctx.strokeStyle = '#9ca3af';
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);

		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();

		ctx.restore();
	}

	function screenToCanvas(clientX: number, clientY: number): Point {
		const rect = canvasElement.getBoundingClientRect();
		const x = (clientX - rect.left - $canvasStore.pan.x) / $canvasStore.zoom;
		const y = (clientY - rect.top - $canvasStore.pan.y) / $canvasStore.zoom;
		return { x, y };
	}

	function snapToGrid(point: Point, gridSize = 20): Point {
		return {
			x: Math.round(point.x / gridSize) * gridSize,
			y: Math.round(point.y / gridSize) * gridSize
		};
	}

	function getClosestSquare(node: CanvasNode, fromPoint: Point): string | undefined {
		if (!node.squares || node.squares.length <= 1) {
			return node.squares?.[0]?.id;
		}

		// Find the square closest to the fromPoint
		let closestSquare = node.squares[0];
		let minDistance = Infinity;

		for (const square of node.squares) {
			const squareCenter = {
				x: square.position.x + 20,
				y: square.position.y + 20
			};
			const dx = fromPoint.x - squareCenter.x;
			const dy = fromPoint.y - squareCenter.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < minDistance) {
				minDistance = distance;
				closestSquare = square;
			}
		}

		return closestSquare.id;
	}

	function getNodeAtPoint(point: Point): string | null {
		for (const [id, node] of $canvasStore.nodes) {
			if (
				point.x >= node.position.x &&
				point.x <= node.position.x + node.size.width &&
				point.y >= node.position.y &&
				point.y <= node.position.y + node.size.height
			) {
				return id;
			}
		}
		return null;
	}

	function getEdgeAtPoint(point: Point): string | null {
		const threshold = 5; // Click threshold in pixels

		for (const [id, edge] of $canvasStore.edges) {
			const sourceNode = $canvasStore.nodes.get(edge.sourceNodeId);
			const targetNode = $canvasStore.nodes.get(edge.targetNodeId);

			if (!sourceNode || !targetNode) continue;

			const start = getConnectionPoint(sourceNode, edge.sourceSquareId);
			const end = getConnectionPoint(targetNode, edge.targetSquareId);

			// Calculate distance from point to line segment
			const distance = pointToLineDistance(point, start, end);

			if (distance < threshold) {
				return id;
			}
		}
		return null;
	}

	function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
		const A = point.x - lineStart.x;
		const B = point.y - lineStart.y;
		const C = lineEnd.x - lineStart.x;
		const D = lineEnd.y - lineStart.y;

		const dot = A * C + B * D;
		const lenSq = C * C + D * D;
		let param = -1;

		if (lenSq !== 0) param = dot / lenSq;

		let xx, yy;

		if (param < 0) {
			xx = lineStart.x;
			yy = lineStart.y;
		} else if (param > 1) {
			xx = lineEnd.x;
			yy = lineEnd.y;
		} else {
			xx = lineStart.x + param * C;
			yy = lineStart.y + param * D;
		}

		const dx = point.x - xx;
		const dy = point.y - yy;

		return Math.sqrt(dx * dx + dy * dy);
	}

	function handleMouseDown(e: MouseEvent) {
		const point = screenToCanvas(e.clientX, e.clientY);
		const nodeId = getNodeAtPoint(point);
		const edgeId = !nodeId ? getEdgeAtPoint(point) : null;

		// Left-click: always select/drag (unless pan tool is active)
		if (e.button === 0) {
			if (currentTool.id === 'pan') {
				isPanning = true;
				panStart = { x: e.clientX - $canvasStore.pan.x, y: e.clientY - $canvasStore.pan.y };
			} else {
				// Select/drag behavior
				if (nodeId) {
					isDragging = true;
					draggedNodeId = nodeId;
					const node = $canvasStore.nodes.get(nodeId)!;
					dragOffset = {
						x: point.x - node.position.x,
						y: point.y - node.position.y
					};
					canvasStore.selectNode(nodeId, e.shiftKey);
				} else if (edgeId) {
					canvasStore.selectEdge(edgeId, e.shiftKey);
				} else {
					canvasStore.clearSelection();
				}
			}
		}
		// Right-click: panning or creation tools
		else if (e.button === 2) {
			e.preventDefault();

			if (currentTool.id === 'edge') {
				// Predicate creation
				if (nodeId) {
					const node = $canvasStore.nodes.get(nodeId);
					if (node) {
						if ($canvasStore.isDrawingEdge) {
							// Finishing the edge - determine which square based on where the line is coming from
							const startNode = $canvasStore.nodes.get($canvasStore.drawingEdgeStart!.nodeId);
							if (startNode) {
								const startCenter = getConnectionPoint(
									startNode,
									$canvasStore.drawingEdgeStart!.squareId
								);
								const squareId = getClosestSquare(node, startCenter);
								canvasStore.finishDrawingEdge(nodeId, squareId);
							}
						} else {
							// Starting the edge - determine which square based on cursor position
							const squareId = getClosestSquare(node, point);
							canvasStore.startDrawingEdge(nodeId, squareId);
						}
					}
				}
			} else if (['entity', 'factType', 'labelType'].includes(currentTool.id)) {
				// Node creation (only on empty space)
				if (!nodeId) {
					const snappedPoint = snapToGrid(point);
					createNode(currentTool.id as 'entity' | 'factType' | 'labelType', snappedPoint);
				}
			} else {
				// Default: pan on right-click
				isPanning = true;
				panStart = { x: e.clientX - $canvasStore.pan.x, y: e.clientY - $canvasStore.pan.y };
			}
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const point = screenToCanvas(e.clientX, e.clientY);

		if (isDragging && draggedNodeId) {
			const rawPosition = {
				x: point.x - dragOffset.x,
				y: point.y - dragOffset.y
			};
			const snappedPosition = snapToGrid(rawPosition);
			canvasStore.moveNode(draggedNodeId, snappedPosition);
		} else if (isPanning) {
			canvasStore.setPan({
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y
			});
		} else if ($canvasStore.isDrawingEdge) {
			canvasStore.updateTempEdge(point);
		}
	}

	function handleMouseUp(e: MouseEvent) {
		isDragging = false;
		draggedNodeId = null;
		isPanning = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		canvasStore.setZoom($canvasStore.zoom * delta);
	}

	function createNode(type: 'entity' | 'factType' | 'labelType', position: Point) {
		const node: CanvasNode = {
			id: crypto.randomUUID(),
			type: type === 'entity' ? 'entity' : type === 'factType' ? 'factType' : 'labelType',
			shape: type === 'entity' ? 'circle' : type === 'factType' ? 'square' : 'diamond',
			position,
			size: { width: 80, height: 80 },
			label: type === 'entity' ? 'Entity' : type === 'factType' ? 'FactType' : 'LabelType',
			color: type === 'entity' ? '#93c5fd' : type === 'factType' ? '#fde68a' : '#d8b4fe',
			isSelected: false,
			isDragging: false,
			schemaObjectId: '',
			arity: type === 'factType' ? 2 : undefined,
			squares:
				type === 'factType'
					? [
							{ id: crypto.randomUUID(), position: { x: position.x, y: position.y } },
							{ id: crypto.randomUUID(), position: { x: position.x + 40, y: position.y } }
						]
					: undefined
		};

		canvasStore.addNode(node);
	}

	function handleDoubleClick(e: MouseEvent) {
		const point = screenToCanvas(e.clientX, e.clientY);
		const nodeId = getNodeAtPoint(point);
		const edgeId = !nodeId ? getEdgeAtPoint(point) : null;

		if (nodeId || edgeId) {
			// Dispatch custom event to open detail panel
			window.dispatchEvent(
				new CustomEvent('openDetailPanel', {
					detail: { nodeId, edgeId }
				})
			);
		}
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Ignore keyboard shortcuts when typing in input fields
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
			return;
		}

		// Prevent default for shortcuts we handle
		if ((e.ctrlKey || e.metaKey) && ['z', 'y', 'c', 'v'].includes(e.key.toLowerCase())) {
			e.preventDefault();
		}

		// Tool shortcuts (only if not editing)
		if (!e.ctrlKey && !e.metaKey && !e.altKey) {
			if (e.key.toLowerCase() === 'e') {
				canvasStore.setTool(TOOLS.ENTITY);
				return;
			} else if (e.key.toLowerCase() === 'f') {
				canvasStore.setTool(TOOLS.FACT_TYPE);
				return;
			} else if (e.key.toLowerCase() === 'l') {
				canvasStore.setTool(TOOLS.LABEL_TYPE);
				return;
			} else if (e.key.toLowerCase() === 'p') {
				canvasStore.setTool(TOOLS.PREDICATOR);
				return;
			}
		}

		// Delete (only Delete key, not Backspace)
		if (e.key === 'Delete') {
			canvasStore.deleteSelected();
		}
		// Undo
		else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
			canvasStore.undo();
		}
		// Redo
		else if (
			(e.ctrlKey || e.metaKey) &&
			(e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
		) {
			canvasStore.redo();
		}
		// Copy
		else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
			canvasStore.copy();
		}
		// Paste
		else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
			canvasStore.paste();
		}
		// Escape
		else if (e.key === 'Escape') {
			if ($canvasStore.isDrawingEdge) {
				canvasStore.cancelDrawingEdge();
			} else {
				canvasStore.clearSelection();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="canvas-container" bind:this={containerElement}>
	<canvas
		bind:this={canvasElement}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onwheel={handleWheel}
		ondblclick={handleDoubleClick}
		oncontextmenu={handleContextMenu}
		style="cursor: {currentTool.cursor};"
	></canvas>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--canvas-bg);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
