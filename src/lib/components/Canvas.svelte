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
	import {
		drawCustomShape,
		isPointInCustomShape,
		getCustomShapeConnectionPoint
	} from '$lib/custom-theory-integration';

	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let containerElement: HTMLDivElement;

	let isDragging = false;
	let draggedNodeId: string | null = null;
	let dragOffset: Point = { x: 0, y: 0 };
	let isPanning = false;
	let panStart: Point = { x: 0, y: 0 };
	let hoveredEdgeHandle: { edgeId: string; end: 'source' | 'target' } | null = null;

	// Selection rectangle for wrapping custom sets
	let isDrawingSelectionRect = false;
	let selectionRectStart: Point | null = null;
	let selectionRectEnd: Point | null = null;

	let currentTool = $state<Tool>(TOOLS.SELECT);
	let autoRotationEnabled = $state(true); // Shape snapping enabled by default

	// Expose state globally for toolbar
	$effect(() => {
		if (typeof window !== 'undefined') {
			(window as any).canvasAutoRotation = autoRotationEnabled;
		}
	});

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

		// Listen for auto-rotation toggle
		window.addEventListener('toggleAutoRotation', handleToggleAutoRotation);

		// Listen for manual rotation updates from properties panel
		window.addEventListener('updateFactTypeRotation', handleManualRotation);

		// Start render loop
		requestAnimationFrame(render);

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
			window.removeEventListener('toggleAutoRotation', handleToggleAutoRotation);
			window.removeEventListener('updateFactTypeRotation', handleManualRotation);
		};
	});

	function handleToggleAutoRotation() {
		autoRotationEnabled = !autoRotationEnabled;
		// Re-apply rotation to all fact types when enabled
		if (autoRotationEnabled) {
			for (const [nodeId, node] of $canvasStore.nodes) {
				if (node.type === 'factType') {
					applyAutoRotation(nodeId);
				}
			}
		}
	}

	function handleManualRotation(e: Event) {
		const customEvent = e as CustomEvent;
		const nodeId = customEvent.detail?.nodeId;
		if (nodeId) {
			const node = $canvasStore.nodes.get(nodeId);
			if (node && node.type === 'factType') {
				updateSquarePositionsForRotation(node);
			}
		}
	}

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

		// Draw edge handles for selected edges
		if (state.selectedEdges.size > 0) {
			for (const edgeId of state.selectedEdges) {
				const edge = state.edges.get(edgeId);
				if (edge) {
					drawEdgeHandles(edge);
				}
			}
		}

		// Draw temp edge while drawing
		if (state.isDrawingEdge && state.drawingEdgeStart && state.tempEdgeEnd) {
			drawTempEdge(state.drawingEdgeStart.nodeId, state.tempEdgeEnd);
		}

		// Draw nodes
		for (const node of state.nodes.values()) {
			drawNode(node);
		}

		// Draw selection rectangle for wrapping
		if (isDrawingSelectionRect && selectionRectStart && selectionRectEnd) {
			ctx.strokeStyle = '#3b82f6';
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 5]);
			ctx.strokeRect(
				Math.min(selectionRectStart.x, selectionRectEnd.x),
				Math.min(selectionRectStart.y, selectionRectEnd.y),
				Math.abs(selectionRectEnd.x - selectionRectStart.x),
				Math.abs(selectionRectEnd.y - selectionRectStart.y)
			);
			ctx.setLineDash([]);
		}

		ctx.restore();

		requestAnimationFrame(render);
	}

	function updateSquarePositionsForRotation(node: CanvasNode) {
		if (!node.squares || !node.arity) return;

		const squareSize = 40;
		const spacing = 0;
		const rotation = node.rotation || 0;
		const isVertical = rotation === 90 || rotation === 270;

		for (let i = 0; i < node.arity; i++) {
			if (isVertical) {
				node.squares[i].position = {
					x: node.position.x,
					y: node.position.y + i * (squareSize + spacing)
				};
			} else {
				node.squares[i].position = {
					x: node.position.x + i * (squareSize + spacing),
					y: node.position.y
				};
			}
		}

		// Update node size based on rotation
		if (isVertical) {
			node.size = { width: squareSize, height: squareSize * node.arity };
		} else {
			node.size = { width: squareSize * node.arity, height: squareSize };
		}
	}

	function determineOptimalRotation(nodeId: string): number {
		if (!autoRotationEnabled) return 0;

		const node = $canvasStore.nodes.get(nodeId);
		if (!node || node.type !== 'factType' || !node.arity || node.arity <= 1) return 0;

		// Get all edges connected to this node
		const connectedEdges = Array.from($canvasStore.edges.values()).filter(
			(edge) => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId
		);

		if (connectedEdges.length === 0) return 0;

		// Calculate total line length for both orientations
		function calculateTotalLineLength(rotation: number): number {
			let totalLength = 0;

			// Temporarily set rotation to calculate connection points
			const originalRotation = node!.rotation;
			node!.rotation = rotation;
			updateSquarePositionsForRotation(node!);

			for (const edge of connectedEdges) {
				const otherNodeId = edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;
				const otherNode = $canvasStore.nodes.get(otherNodeId);
				if (!otherNode) continue;

				const isSource = edge.sourceNodeId === nodeId;
				const nodeSquareId = isSource ? edge.sourceSquareId : edge.targetSquareId;
				const otherSquareId = isSource ? edge.targetSquareId : edge.sourceSquareId;

				const nodePoint = getConnectionPoint(node!, nodeSquareId);
				const otherPoint = getConnectionPoint(otherNode, otherSquareId);

				const dx = otherPoint.x - nodePoint.x;
				const dy = otherPoint.y - nodePoint.y;
				totalLength += Math.sqrt(dx * dx + dy * dy);
			}

			// Restore original rotation
			node!.rotation = originalRotation;
			updateSquarePositionsForRotation(node!);

			return totalLength;
		}

		// Compare horizontal (0°) vs vertical (90°)
		const horizontalLength = calculateTotalLineLength(0);
		const verticalLength = calculateTotalLineLength(90);

		// Return the orientation with shorter total line length
		return verticalLength < horizontalLength ? 90 : 0;
	}

	function applyAutoRotation(nodeId: string) {
		if (!autoRotationEnabled) return;

		const node = $canvasStore.nodes.get(nodeId);
		if (!node || node.type !== 'factType') return;

		const optimalRotation = determineOptimalRotation(nodeId);
		if (node.rotation !== optimalRotation) {
			node.rotation = optimalRotation;
			updateSquarePositionsForRotation(node);
		}
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

		if (node.type === 'custom') {
			// For wrapping custom sets, draw with semi-transparent fill
			if (node.wrappedNodeIds && node.wrappedNodeIds.length > 0) {
				ctx.fillStyle = node.color; // Already semi-transparent
				ctx.strokeStyle = '#8b5cf6'; // Solid purple border
				ctx.lineWidth = 3;

				if (node.shape === 'custom' && node.customShapePoints) {
					drawCustomShape(
						ctx,
						node.customShapePoints,
						node.position.x,
						node.position.y,
						node.size.width,
						node.size.height
					);
				} else {
					// Default to rounded rectangle for wrapping
					const radius = 10;
					ctx.beginPath();
					ctx.roundRect(
						node.position.x,
						node.position.y,
						node.size.width,
						node.size.height,
						radius
					);
					ctx.fill();
					ctx.stroke();
				}
			} else if (node.shape === 'custom' && node.customShapePoints) {
				// Standalone custom shape
				drawCustomShape(
					ctx,
					node.customShapePoints,
					node.position.x,
					node.position.y,
					node.size.width,
					node.size.height
				);
			} else if (node.shape === 'circle') {
				drawCircle(node);
			} else if (node.shape === 'square') {
				drawSquare(node);
			} else if (node.shape === 'diamond') {
				drawDiamond(node);
			} else {
				// Default rectangle
				drawSquare(node);
			}
		} else if (node.type === 'factType' && node.arity && node.arity > 1) {
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

		// Draw label with background
		drawNodeLabel(node);

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
		const rotation = node.rotation || 0;

		// Determine if we're horizontal (0, 180) or vertical (90, 270)
		const isVertical = rotation === 90 || rotation === 270;

		for (let i = 0; i < node.arity; i++) {
			let x, y;
			if (isVertical) {
				// Vertical arrangement
				x = node.position.x;
				y = node.position.y + i * (squareSize + spacing);
			} else {
				// Horizontal arrangement (default)
				x = node.position.x + i * (squareSize + spacing);
				y = node.position.y;
			}

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

	function drawNodeLabel(node: CanvasNode) {
		const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const bgColor = isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
		const textColor = isDark ? '#e5e7eb' : '#1f2937';

		ctx.font = '14px sans-serif';
		const metrics = ctx.measureText(node.label);
		const textWidth = metrics.width;
		const padding = 4;
		const bgHeight = 18;

		let labelX = node.position.x + node.size.width / 2;
		let labelY;

		// Position label based on node type
		if (node.type === 'objectified') {
			// Position label above the objectification circle
			const factNode = node.objectifiedFactId
				? $canvasStore.nodes.get(node.objectifiedFactId)
				: null;
			if (factNode) {
				const centerY = factNode.position.y + factNode.size.height / 2;
				const radius = Math.max(factNode.size.width, factNode.size.height) / 2 + 20;
				labelY = centerY - radius - 15;
			} else {
				labelY = node.position.y - 15;
			}
		} else if (node.type === 'factType') {
			// Position label closer to fact type squares (reduced from +20 to +8)
			labelY = node.position.y + node.size.height + 8;
		} else {
			// Default position below the node
			labelY = node.position.y + node.size.height + 20;
		}

		// Draw semi-transparent background
		ctx.fillStyle = bgColor;
		ctx.fillRect(
			labelX - textWidth / 2 - padding,
			labelY - bgHeight / 2,
			textWidth + padding * 2,
			bgHeight
		);

		// Draw text
		ctx.fillStyle = textColor;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(node.label, labelX, labelY);
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
		ctx.setLineDash([]); // Ensure arrow is always solid
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
		// Ensure square positions are up to date for rotated fact types
		if (node.type === 'factType' && node.squares && node.rotation !== undefined) {
			updateSquarePositionsForRotation(node);
		}

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

		// Calculate center point
		const centerX = node.position.x + node.size.width / 2;
		const centerY = node.position.y + node.size.height / 2;

		// If we have another point to connect to, snap to perimeter
		if (otherPoint) {
			// Handle custom shapes with custom connection point algorithm
			if (node.type === 'custom' && node.shape === 'custom' && node.customShapePoints) {
				return getCustomShapeConnectionPoint(
					node.customShapePoints,
					node.position.x,
					node.position.y,
					node.size.width,
					node.size.height,
					otherPoint
				);
			}

			// For sequence types, snap to outer rectangle perimeter
			if (node.type === 'sequenceType') {
				const rectPadding = 10;
				const outerLeft = node.position.x - rectPadding;
				const outerTop = node.position.y - rectPadding;
				const outerRight = node.position.x + node.size.width + rectPadding;
				const outerBottom = node.position.y + node.size.height + rectPadding;
				const outerCenterX = (outerLeft + outerRight) / 2;
				const outerCenterY = (outerTop + outerBottom) / 2;

				const dx = otherPoint.x - outerCenterX;
				const dy = otherPoint.y - outerCenterY;
				const angle = Math.atan2(dy, dx);
				const absAngle = Math.abs(angle);

				if (absAngle < Math.PI / 4) {
					// Right side
					return { x: outerRight, y: outerCenterY };
				} else if (absAngle > (3 * Math.PI) / 4) {
					// Left side
					return { x: outerLeft, y: outerCenterY };
				} else if (angle > 0) {
					// Bottom side
					return { x: outerCenterX, y: outerBottom };
				} else {
					// Top side
					return { x: outerCenterX, y: outerTop };
				}
			}
			// For circular shapes (entity, power type, objectified), snap to circle perimeter
			else if (
				node.shape === 'circle' ||
				node.type === 'entity' ||
				node.type === 'powerType' ||
				node.type === 'objectified'
			) {
				// For objectified types, use the fact type's circle if available
				if (node.type === 'objectified' && node.objectifiedFactId) {
					const factNode = $canvasStore.nodes.get(node.objectifiedFactId);
					if (factNode) {
						const factCenterX = factNode.position.x + factNode.size.width / 2;
						const factCenterY = factNode.position.y + factNode.size.height / 2;
						const radius = Math.max(factNode.size.width, factNode.size.height) / 2 + 20;

						const angle = Math.atan2(otherPoint.y - factCenterY, otherPoint.x - factCenterX);
						return {
							x: factCenterX + radius * Math.cos(angle),
							y: factCenterY + radius * Math.sin(angle)
						};
					}
				}

				// Regular circle perimeter snap
				const radius = Math.min(node.size.width, node.size.height) / 2;
				const angle = Math.atan2(otherPoint.y - centerY, otherPoint.x - centerX);

				return {
					x: centerX + radius * Math.cos(angle),
					y: centerY + radius * Math.sin(angle)
				};
			}
			// For diamond shapes, snap to diamond perimeter
			else if (node.shape === 'diamond') {
				const halfWidth = node.size.width / 2;
				const halfHeight = node.size.height / 2;

				const dx = otherPoint.x - centerX;
				const dy = otherPoint.y - centerY;

				// Calculate which edge of the diamond to connect to
				const angle = Math.atan2(dy, dx);
				const absAngle = Math.abs(angle);

				if (absAngle < Math.PI / 4) {
					// Right edge
					const t = halfWidth / Math.abs(dx);
					return { x: centerX + halfWidth, y: centerY + dy * t };
				} else if (absAngle > (3 * Math.PI) / 4) {
					// Left edge
					const t = halfWidth / Math.abs(dx);
					return { x: centerX - halfWidth, y: centerY + dy * t };
				} else if (angle > 0) {
					// Bottom edge
					const t = halfHeight / Math.abs(dy);
					return { x: centerX + dx * t, y: centerY + halfHeight };
				} else {
					// Top edge
					const t = halfHeight / Math.abs(dy);
					return { x: centerX + dx * t, y: centerY - halfHeight };
				}
			}
			// For square/rectangle shapes, snap to rectangle perimeter
			else if (node.shape === 'square') {
				const halfWidth = node.size.width / 2;
				const halfHeight = node.size.height / 2;

				const dx = otherPoint.x - centerX;
				const dy = otherPoint.y - centerY;

				const angle = Math.atan2(dy, dx);
				const absAngle = Math.abs(angle);

				if (absAngle < Math.PI / 4) {
					// Right side
					return { x: node.position.x + node.size.width, y: centerY };
				} else if (absAngle > (3 * Math.PI) / 4) {
					// Left side
					return { x: node.position.x, y: centerY };
				} else if (angle > 0) {
					// Bottom side
					return { x: centerX, y: node.position.y + node.size.height };
				} else {
					// Top side
					return { x: centerX, y: node.position.y };
				}
			}
		}

		// Default: center of node
		return { x: centerX, y: centerY };
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

	function drawEdgeHandles(
		edge: typeof $canvasStore.edges extends Map<string, infer T> ? T : never
	) {
		const sourceNode = $canvasStore.nodes.get(edge.sourceNodeId);
		const targetNode = $canvasStore.nodes.get(edge.targetNodeId);

		if (!sourceNode || !targetNode) return;

		const start = getConnectionPoint(sourceNode, edge.sourceSquareId);
		const end = getConnectionPoint(targetNode, edge.targetSquareId);

		const handleRadius = 6;
		const isReconnecting =
			$canvasStore.isReconnectingEdge && $canvasStore.reconnectingEdgeId === edge.id;

		ctx.save();

		// Draw source handle
		const isSourceHovered =
			hoveredEdgeHandle?.edgeId === edge.id && hoveredEdgeHandle?.end === 'source';
		const isSourceReconnecting = isReconnecting && $canvasStore.reconnectingEnd === 'source';

		ctx.fillStyle = isSourceReconnecting ? '#ef4444' : isSourceHovered ? '#3b82f6' : '#ffffff';
		ctx.strokeStyle = isSourceReconnecting ? '#ef4444' : '#3b82f6';
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.arc(start.x, start.y, handleRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// Draw target handle
		const isTargetHovered =
			hoveredEdgeHandle?.edgeId === edge.id && hoveredEdgeHandle?.end === 'target';
		const isTargetReconnecting = isReconnecting && $canvasStore.reconnectingEnd === 'target';

		ctx.fillStyle = isTargetReconnecting ? '#ef4444' : isTargetHovered ? '#3b82f6' : '#ffffff';
		ctx.strokeStyle = isTargetReconnecting ? '#ef4444' : '#3b82f6';
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.arc(end.x, end.y, handleRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	}

	function screenToCanvas(clientX: number, clientY: number): Point {
		const rect = canvasElement.getBoundingClientRect();
		// First subtract the screen offset, then undo pan, then undo zoom
		const screenX = clientX - rect.left;
		const screenY = clientY - rect.top;
		const x = (screenX - $canvasStore.pan.x) / $canvasStore.zoom;
		const y = (screenY - $canvasStore.pan.y) / $canvasStore.zoom;
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
			// Handle custom shapes with point-in-polygon detection
			if (node.type === 'custom' && node.shape === 'custom' && node.customShapePoints) {
				if (
					isPointInCustomShape(
						point,
						node.customShapePoints,
						node.position.x,
						node.position.y,
						node.size.width,
						node.size.height
					)
				) {
					return id;
				}
			}
			// Handle other node types with bounding box
			else if (
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

	function getEdgeHandleAtPoint(point: Point): { edgeId: string; end: 'source' | 'target' } | null {
		const handleRadius = 8; // Slightly larger for click detection

		// Only check handles for selected edges
		for (const edgeId of $canvasStore.selectedEdges) {
			const edge = $canvasStore.edges.get(edgeId);
			if (!edge) continue;

			const sourceNode = $canvasStore.nodes.get(edge.sourceNodeId);
			const targetNode = $canvasStore.nodes.get(edge.targetNodeId);

			if (!sourceNode || !targetNode) continue;

			const start = getConnectionPoint(sourceNode, edge.sourceSquareId);
			const end = getConnectionPoint(targetNode, edge.targetSquareId);

			// Check source handle
			const dxSource = point.x - start.x;
			const dySource = point.y - start.y;
			if (Math.sqrt(dxSource * dxSource + dySource * dySource) <= handleRadius) {
				return { edgeId, end: 'source' };
			}

			// Check target handle
			const dxTarget = point.x - end.x;
			const dyTarget = point.y - end.y;
			if (Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget) <= handleRadius) {
				return { edgeId, end: 'target' };
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

		// Check for edge handle first (for reconnection)
		const handleInfo = getEdgeHandleAtPoint(point);
		if (handleInfo && e.button === 0) {
			// Start reconnecting edge
			canvasStore.startReconnectingEdge(handleInfo.edgeId, handleInfo.end);
			return;
		}

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

			if (
				currentTool.id === 'predicator' ||
				currentTool.id === 'generalization' ||
				currentTool.id === 'specialization'
			) {
				// Predicate/relationship creation
				if (nodeId) {
					const node = $canvasStore.nodes.get(nodeId);
					if (node) {
						// Validate: generalization/specialization only between entity types
						if (
							(currentTool.id === 'generalization' || currentTool.id === 'specialization') &&
							node.type !== 'entity' &&
							node.type !== 'powerType' &&
							node.type !== 'objectified'
						) {
							// Silently ignore - can't create subtype relationships with non-entity types
							return;
						}

						if ($canvasStore.isDrawingEdge) {
							// Validate start node for generalization/specialization
							const startNode = $canvasStore.nodes.get($canvasStore.drawingEdgeStart!.nodeId);
							if (startNode) {
								// Validate: both nodes must be entity types for generalization/specialization
								if (
									(currentTool.id === 'generalization' || currentTool.id === 'specialization') &&
									startNode.type !== 'entity' &&
									startNode.type !== 'powerType' &&
									startNode.type !== 'objectified'
								) {
									// Cancel the edge drawing - incompatible types
									canvasStore.cancelDrawingEdge();
									return;
								}

								// Finishing the edge - determine which square based on where the line is coming from
								const startCenter = getConnectionPoint(
									startNode,
									$canvasStore.drawingEdgeStart!.squareId
								);
								const squareId = getClosestSquare(node, startCenter);
								canvasStore.finishDrawingEdge(
									nodeId,
									squareId,
									currentTool.id as 'predicator' | 'generalization' | 'specialization'
								);
							}
						} else {
							// Starting the edge - determine which square based on cursor position
							const squareId = getClosestSquare(node, point);
							canvasStore.startDrawingEdge(nodeId, squareId);
						}
					}
				}
			} else if (currentTool.id === 'objectify') {
				// Objectification - select a fact type to objectify
				if (nodeId) {
					const node = $canvasStore.nodes.get(nodeId);
					if (node && node.type === 'factType') {
						// Create objectified entity around this fact type
						const centerX = node.position.x + node.size.width / 2;
						const centerY = node.position.y + node.size.height / 2;
						const objectifiedNode: CanvasNode = {
							id: crypto.randomUUID(),
							type: 'objectified',
							shape: 'circle',
							position: { x: centerX - 40, y: centerY - 40 },
							size: { width: 80, height: 80 },
							label: `Obj(${node.label})`,
							color: '#93c5fd',
							isSelected: false,
							isDragging: false,
							schemaObjectId: '',
							objectifiedFactId: nodeId
						};
						canvasStore.addNode(objectifiedNode);
					}
				}
			} else if (
				['entity', 'factType', 'labelType', 'powerType', 'sequenceType'].includes(currentTool.id)
			) {
				// Node creation (only on empty space)
				if (!nodeId) {
					const snappedPoint = snapToGrid(point);
					createNode(
						currentTool.id as 'entity' | 'factType' | 'labelType' | 'powerType' | 'sequenceType',
						snappedPoint
					);
				}
			} else if ((currentTool as any).nodeType === 'custom') {
				// Custom set creation
				if (!nodeId) {
					const customTool = currentTool as any;
					// Check if this is a wrapping custom set
					if (customTool.usageRule && customTool.usageRule.startsWith('wraps-')) {
						// Start selection rectangle for wrapping
						isDrawingSelectionRect = true;
						selectionRectStart = point;
						selectionRectEnd = point;
					} else {
						// Standalone custom set - create immediately
						const snappedPoint = snapToGrid(point);
						createCustomNode(currentTool, snappedPoint);
					}
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

		// Update hover state for edge handles
		hoveredEdgeHandle = getEdgeHandleAtPoint(point);

		if (isDrawingSelectionRect && selectionRectStart) {
			// Update selection rectangle
			selectionRectEnd = point;
		} else if (isDragging && draggedNodeId) {
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
		} else if ($canvasStore.isReconnectingEdge) {
			// Show visual feedback while reconnecting
			canvasStore.updateTempEdge(point);
		}
	}

	function handleMouseUp(e: MouseEvent) {
		const point = screenToCanvas(e.clientX, e.clientY);

		// Handle wrapping selection rectangle completion
		if (isDrawingSelectionRect && selectionRectStart && selectionRectEnd) {
			const customTool = currentTool as any;
			const nodesInRect = getNodesInRectangle(
				selectionRectStart,
				selectionRectEnd,
				customTool.usageRule
			);

			if (nodesInRect.length > 0) {
				// Create custom node that wraps these nodes
				createWrappingCustomNode(currentTool, nodesInRect);
			}

			isDrawingSelectionRect = false;
			selectionRectStart = null;
			selectionRectEnd = null;
			return;
		}

		// Handle wrapping selection rectangle completion
		if (isDrawingSelectionRect && selectionRectStart && selectionRectEnd) {
			const customTool = currentTool as any;
			const nodesInRect = getNodesInRectangle(
				selectionRectStart,
				selectionRectEnd,
				customTool.usageRule
			);

			if (nodesInRect.length > 0) {
				// Create custom node that wraps these nodes
				createWrappingCustomNode(currentTool, nodesInRect);
			}

			isDrawingSelectionRect = false;
			selectionRectStart = null;
			selectionRectEnd = null;
			return;
		}

		// Handle edge reconnection
		if ($canvasStore.isReconnectingEdge) {
			const nodeId = getNodeAtPoint(point);
			if (nodeId) {
				const node = $canvasStore.nodes.get(nodeId);
				if (node) {
					const squareId = getClosestSquare(node, point);
					canvasStore.finishReconnectingEdge(nodeId, squareId);
					// Re-apply rotation after reconnection
					if (node.type === 'factType') {
						setTimeout(() => applyAutoRotation(nodeId), 0);
					}
				}
			} else {
				canvasStore.cancelReconnectingEdge();
			}
		}

		// Handle edge creation completion
		if ($canvasStore.isDrawingEdge) {
			const nodeId = getNodeAtPoint(point);
			if (nodeId) {
				const node = $canvasStore.nodes.get(nodeId);
				if (node && $canvasStore.drawingEdgeStart) {
					const startNodeId = $canvasStore.drawingEdgeStart.nodeId;
					// After edge is created, apply auto-rotation to both nodes
					setTimeout(() => {
						applyAutoRotation(nodeId);
						applyAutoRotation(startNodeId);
					}, 0);
				}
			}
		}

		// Re-apply rotation to connected fact types after dragging
		if (isDragging && draggedNodeId) {
			// Find all edges connected to the dragged node
			const connectedEdges = Array.from($canvasStore.edges.values()).filter(
				(edge) => edge.sourceNodeId === draggedNodeId || edge.targetNodeId === draggedNodeId
			);

			// Apply auto-rotation to any connected fact types
			for (const edge of connectedEdges) {
				const otherNodeId =
					edge.sourceNodeId === draggedNodeId ? edge.targetNodeId : edge.sourceNodeId;
				const otherNode = $canvasStore.nodes.get(otherNodeId);
				if (otherNode && otherNode.type === 'factType') {
					setTimeout(() => applyAutoRotation(otherNodeId), 0);
				}
			}
		}

		isDragging = false;
		draggedNodeId = null;
		isPanning = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		canvasStore.setZoom($canvasStore.zoom * delta);
	}

	function createNode(
		type: 'entity' | 'factType' | 'labelType' | 'powerType' | 'sequenceType',
		position: Point
	) {
		const node: CanvasNode = {
			id: crypto.randomUUID(),
			type: type,
			shape:
				type === 'entity' || type === 'powerType' || type === 'sequenceType'
					? 'circle'
					: type === 'factType'
						? 'square'
						: 'diamond',
			position,
			size: { width: 80, height: 80 },
			label:
				type === 'entity'
					? 'Entity'
					: type === 'factType'
						? 'FactType'
						: type === 'labelType'
							? 'LabelType'
							: type === 'powerType'
								? 'PowerType'
								: 'SeqType',
			color:
				type === 'entity' || type === 'powerType' || type === 'sequenceType'
					? '#93c5fd'
					: type === 'factType'
						? '#fde68a'
						: '#d8b4fe',
			isSelected: false,
			isDragging: false,
			schemaObjectId: '',
			rotation: 0,
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

	function createCustomNode(tool: Tool, position: Point) {
		const customTool = tool as any;
		const node: CanvasNode = {
			id: crypto.randomUUID(),
			type: 'custom',
			shape: customTool.shape || 'circle',
			position,
			size: { width: 80, height: 80 },
			label: customTool.icon || customTool.name,
			color: '#a78bfa', // Purple for custom sets
			isSelected: false,
			isDragging: false,
			schemaObjectId: '',
			customShapePoints: customTool.customShape,
			customSetName: customTool.name,
			usageRule: customTool.usageRule,
			wrappedNodeIds: []
		};

		canvasStore.addNode(node);
	}

	function getNodesInRectangle(start: Point, end: Point, usageRule: string): string[] {
		const minX = Math.min(start.x, end.x);
		const maxX = Math.max(start.x, end.x);
		const minY = Math.min(start.y, end.y);
		const maxY = Math.max(start.y, end.y);

		const nodesInRect: string[] = [];

		for (const [id, node] of $canvasStore.nodes) {
			// Skip custom nodes themselves
			if (node.type === 'custom') continue;

			// Filter based on usage rule
			if (usageRule === 'wraps-single-entity' || usageRule === 'wraps-multiple-entities') {
				if (node.type !== 'entity' && node.type !== 'powerType') continue;
			}

			// Check if node center is in rectangle
			const centerX = node.position.x + node.size.width / 2;
			const centerY = node.position.y + node.size.height / 2;

			if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
				nodesInRect.push(id);
			}
		}

		return nodesInRect;
	}

	function createWrappingCustomNode(tool: Tool, wrappedNodeIds: string[]) {
		const customTool = tool as any;

		// Calculate bounding box of wrapped nodes
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		for (const nodeId of wrappedNodeIds) {
			const node = $canvasStore.nodes.get(nodeId);
			if (!node) continue;

			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + node.size.width);
			maxY = Math.max(maxY, node.position.y + node.size.height);
		}

		// Add padding around wrapped nodes
		const padding = 20;
		const position = { x: minX - padding, y: minY - padding };
		const size = { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };

		const node: CanvasNode = {
			id: crypto.randomUUID(),
			type: 'custom',
			shape: customTool.shape || 'rectangle',
			position,
			size,
			label: customTool.icon || customTool.name,
			color: 'rgba(167, 139, 250, 0.2)', // Semi-transparent purple
			isSelected: false,
			isDragging: false,
			schemaObjectId: '',
			customShapePoints: customTool.customShape,
			customSetName: customTool.name,
			usageRule: customTool.usageRule,
			wrappedNodeIds: wrappedNodeIds
		};

		canvasStore.addNode(node);
	}

	function handleDoubleClick(e: MouseEvent) {
		const point = screenToCanvas(e.clientX, e.clientY);
		const nodeId = getNodeAtPoint(point);
		const edgeId = !nodeId ? getEdgeAtPoint(point) : null;

		// Select the item to open properties panel with all details
		if (nodeId) {
			canvasStore.selectNode(nodeId, false);
		} else if (edgeId) {
			canvasStore.selectEdge(edgeId, false);
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
			} else if (e.key.toLowerCase() === 'r') {
				// Toggle auto-rotation with 'R' key
				autoRotationEnabled = !autoRotationEnabled;
				// Re-apply rotation to all fact types
				if (autoRotationEnabled) {
					for (const [nodeId, node] of $canvasStore.nodes) {
						if (node.type === 'factType') {
							applyAutoRotation(nodeId);
						}
					}
				}
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
