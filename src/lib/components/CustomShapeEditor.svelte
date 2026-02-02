<script lang="ts">
	import { onMount } from 'svelte';

	interface Point {
		x: number;
		y: number;
	}

	export let shape: Point[] = [];

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let width = 200;
	let height = 200;
	let gridSize = 10;

	let draggingPointIndex: number | null = null;
	let hoveredPointIndex: number | null = null;
	let hoveredEdgeIndex: number | null = null;

	// Initialize with a rectangle if empty
	if (shape.length === 0) {
		shape = [
			{ x: 40, y: 40 },
			{ x: 160, y: 40 },
			{ x: 160, y: 160 },
			{ x: 40, y: 160 }
		];
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (ctx) {
			draw();
		}
	});

	function snapToGrid(value: number): number {
		return Math.round(value / gridSize) * gridSize;
	}

	function draw() {
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Draw grid
		ctx.strokeStyle = '#e5e7eb';
		ctx.lineWidth = 0.5;
		for (let x = 0; x <= width; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		for (let y = 0; y <= height; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// Draw shape
		if (shape.length > 0) {
			ctx.strokeStyle = '#3b82f6';
			ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
			ctx.lineWidth = 2;

			ctx.beginPath();
			ctx.moveTo(shape[0].x, shape[0].y);
			for (let i = 1; i < shape.length; i++) {
				ctx.lineTo(shape[i].x, shape[i].y);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Highlight hovered edge
			if (hoveredEdgeIndex !== null) {
				ctx.strokeStyle = '#ef4444';
				ctx.lineWidth = 3;
				ctx.beginPath();
				const p1 = shape[hoveredEdgeIndex];
				const p2 = shape[(hoveredEdgeIndex + 1) % shape.length];
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
				ctx.stroke();
			}

			// Draw points
			shape.forEach((point, index) => {
				ctx!.beginPath();
				ctx!.arc(point.x, point.y, 5, 0, Math.PI * 2);
				ctx!.fillStyle = index === hoveredPointIndex ? '#ef4444' : '#3b82f6';
				ctx!.fill();
				ctx!.strokeStyle = '#1e40af';
				ctx!.lineWidth = 2;
				ctx!.stroke();
			});
		}
	}

	function getMousePos(e: MouseEvent): Point {
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	}

	function findPointAt(pos: Point): number | null {
		for (let i = 0; i < shape.length; i++) {
			const dx = shape[i].x - pos.x;
			const dy = shape[i].y - pos.y;
			if (Math.sqrt(dx * dx + dy * dy) < 8) {
				return i;
			}
		}
		return null;
	}

	function findEdgeAt(pos: Point): number | null {
		for (let i = 0; i < shape.length; i++) {
			const p1 = shape[i];
			const p2 = shape[(i + 1) % shape.length];

			// Calculate distance from point to line segment
			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;
			const length = Math.sqrt(dx * dx + dy * dy);
			if (length === 0) continue;

			const t = Math.max(
				0,
				Math.min(1, ((pos.x - p1.x) * dx + (pos.y - p1.y) * dy) / (length * length))
			);
			const projX = p1.x + t * dx;
			const projY = p1.y + t * dy;
			const dist = Math.sqrt((pos.x - projX) ** 2 + (pos.y - projY) ** 2);

			if (dist < 8) {
				return i;
			}
		}
		return null;
	}

	function handleMouseDown(e: MouseEvent) {
		const pos = getMousePos(e);
		const pointIndex = findPointAt(pos);

		if (pointIndex !== null) {
			draggingPointIndex = pointIndex;
			e.preventDefault();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const pos = getMousePos(e);

		if (draggingPointIndex !== null) {
			// Drag point
			shape[draggingPointIndex] = {
				x: Math.max(0, Math.min(width, snapToGrid(pos.x))),
				y: Math.max(0, Math.min(height, snapToGrid(pos.y)))
			};
			shape = [...shape]; // Trigger reactivity
			draw();
		} else {
			// Update hover states
			const pointIndex = findPointAt(pos);
			const edgeIndex = findEdgeAt(pos);

			if (pointIndex !== null) {
				hoveredPointIndex = pointIndex;
				hoveredEdgeIndex = null;
				canvas.style.cursor = 'move';
			} else if (edgeIndex !== null) {
				hoveredPointIndex = null;
				hoveredEdgeIndex = edgeIndex;
				canvas.style.cursor = 'crosshair';
			} else {
				hoveredPointIndex = null;
				hoveredEdgeIndex = null;
				canvas.style.cursor = 'default';
			}
			draw();
		}
	}

	function handleMouseUp() {
		draggingPointIndex = null;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		const pos = getMousePos(e);
		const edgeIndex = findEdgeAt(pos);

		if (edgeIndex !== null) {
			// Add new point on edge
			const p1 = shape[edgeIndex];
			const p2 = shape[(edgeIndex + 1) % shape.length];
			const newPoint = {
				x: snapToGrid((p1.x + p2.x) / 2),
				y: snapToGrid((p1.y + p2.y) / 2)
			};
			shape = [...shape.slice(0, edgeIndex + 1), newPoint, ...shape.slice(edgeIndex + 1)];
			draw();
		}
	}

	function reset() {
		shape = [
			{ x: 40, y: 40 },
			{ x: 160, y: 40 },
			{ x: 160, y: 160 },
			{ x: 40, y: 160 }
		];
		draw();
	}

	$: if (ctx) draw();
</script>

<div class="shape-editor">
	<div class="editor-header">
		<h4>Custom Shape Editor</h4>
		<button type="button" class="reset-btn" on:click={reset} title="Reset to rectangle">
			<i class="fas fa-undo"></i>
		</button>
	</div>
	<canvas
		bind:this={canvas}
		{width}
		{height}
		on:mousedown={handleMouseDown}
		on:mousemove={handleMouseMove}
		on:mouseup={handleMouseUp}
		on:mouseleave={handleMouseUp}
		on:contextmenu={handleContextMenu}
	></canvas>
	<div class="editor-help">
		<div class="help-item"><strong>Left-click + drag:</strong> Move points</div>
		<div class="help-item"><strong>Right-click edge:</strong> Add new point</div>
	</div>
</div>

<style>
	.shape-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: fit-content;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 200px;
	}

	.editor-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.reset-btn {
		background: transparent;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		transition: all 0.2s;
	}

	.reset-btn:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-color: var(--accent-primary);
	}

	canvas {
		border: 2px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
		cursor: default;
		display: block;
		width: 200px;
		height: 200px;
	}

	.editor-help {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: var(--bg-primary);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		width: 200px;
	}

	.help-item strong {
		color: var(--text-primary);
	}
</style>
