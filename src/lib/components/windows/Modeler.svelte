<script lang="ts">
	import { GraphUtils } from '$lib/modeler/graph';
	import { linkTool, modelerStore, shapeTool } from '$lib/stores/modeler.svelte';

	import type { LinkKind, VisualNode, VisualShapeKind } from '$lib/modeler/graph';

	let canvasRef: SVGElement | null = null;
	let isPanning = false;
	let panStart = { x: 0, y: 0 };
	let interactionHint = $state('');

	const SHAPE_DIMENSIONS: Record<VisualShapeKind, { width: number; height: number }> = {
		ENTITY_CIRCLE: { width: 120, height: 120 },
		LABEL_CIRCLE: { width: 120, height: 120 },
		POWER_TYPE_CIRCLE: { width: 136, height: 136 },
		SEQUENCE_TYPE_BOX: { width: 144, height: 96 },
		FACT_BOX_N: { width: 64, height: 56 },
		OBJECTIFIED_FACT: { width: 64, height: 56 }
	};

	const SHAPE_LABELS: Record<VisualShapeKind, string> = {
		ENTITY_CIRCLE: 'Entity',
		LABEL_CIRCLE: 'Label',
		POWER_TYPE_CIRCLE: 'Power',
		SEQUENCE_TYPE_BOX: 'Sequence',
		FACT_BOX_N: 'Fact',
		OBJECTIFIED_FACT: 'Objectified'
	};

	const SHAPE_COLORS: Record<VisualShapeKind, string> = {
		ENTITY_CIRCLE: 'var(--node-entity)',
		LABEL_CIRCLE: 'var(--node-label)',
		POWER_TYPE_CIRCLE: '#f97316',
		SEQUENCE_TYPE_BOX: '#14b8a6',
		FACT_BOX_N: 'var(--node-fact)',
		OBJECTIFIED_FACT: 'var(--node-fact)'
	};

	function toWorld(clientX: number, clientY: number) {
		if (!canvasRef) return { x: 0, y: 0 };
		const rect = canvasRef.getBoundingClientRect();
		const viewportX = clientX - rect.left;
		const viewportY = clientY - rect.top;
		return {
			x: (viewportX - modelerStore.pan.x) / modelerStore.zoom,
			y: (viewportY - modelerStore.pan.y) / modelerStore.zoom
		};
	}

	function toViewport(clientX: number, clientY: number) {
		if (!canvasRef) return { x: 0, y: 0 };
		const rect = canvasRef.getBoundingClientRect();
		return {
			x: clientX - rect.left,
			y: clientY - rect.top
		};
	}

	function nodeAtWorld(x: number, y: number): VisualNode | null {
		for (let i = modelerStore.nodes.length - 1; i >= 0; i--) {
			const node = modelerStore.nodes[i];
			if (!node) continue;

			const dx = x - node.position.x;
			const dy = y - node.position.y;

			if (
				node.kind === 'FACT_BOX_N' ||
				node.kind === 'SEQUENCE_TYPE_BOX' ||
				node.kind === 'OBJECTIFIED_FACT'
			) {
				if (
					Math.abs(dx) <= node.dimensions.width / 2 &&
					Math.abs(dy) <= node.dimensions.height / 2
				) {
					return node;
				}
			} else {
				const radius = node.dimensions.width / 2;
				if (dx * dx + dy * dy <= radius * radius) {
					return node;
				}
			}
		}

		return null;
	}

	function createNode(shape: VisualShapeKind, x: number, y: number): VisualNode {
		const dim = SHAPE_DIMENSIONS[shape];
		const position = { x, y };
		const isBox =
			shape === 'FACT_BOX_N' || shape === 'SEQUENCE_TYPE_BOX' || shape === 'OBJECTIFIED_FACT';

		return {
			id: crypto.randomUUID() as any,
			kind: shape,
			position,
			dimensions: dim,
			connectionPoints: isBox
				? GraphUtils.getBoxPoints(position, dim)
				: GraphUtils.getCirclePoints(position, dim.width / 2),
			label: SHAPE_LABELS[shape],
			fillColor: SHAPE_COLORS[shape],
			arity: shape === 'FACT_BOX_N' || shape === 'OBJECTIFIED_FACT' ? 2 : undefined
		};
	}

	function placeShapeAt(worldX: number, worldY: number) {
		const selected = $shapeTool.selected as VisualShapeKind | null;
		if (!selected) return;

		if (modelerStore.snapToGrid) {
			worldX = Math.round(worldX / modelerStore.gridSize) * modelerStore.gridSize;
			worldY = Math.round(worldY / modelerStore.gridSize) * modelerStore.gridSize;
		}
		if (selected === 'OBJECTIFIED_FACT') {
			const target = nodeAtWorld(worldX, worldY);
			if (!target) {
				interactionHint = 'Objectification requires existing object. Drop on node.';
				return;
			}
			modelerStore.setNodeObjectified(target.id, true);
			modelerStore.selectNode(target.id);
			shapeTool.set({ selected: null, mode: 'idle' });
			interactionHint = 'Objectification applied.';
			return;
		}

		const node = createNode(selected, worldX, worldY);
		modelerStore.addNode(node);
		modelerStore.selectNode(node.id);
		shapeTool.set({ selected: null, mode: 'idle' });
		interactionHint = '';
	}

	function handleNodeMouseDown(e: MouseEvent, node: VisualNode) {
		if ($shapeTool.selected === 'OBJECTIFIED_FACT') {
			e.preventDefault();
			e.stopPropagation();
			modelerStore.setNodeObjectified(node.id, true);
			modelerStore.selectNode(node.id);
			shapeTool.set({ selected: null, mode: 'idle' });
			interactionHint = 'Objectification applied.';
			return;
		}

		if ($linkTool.mode !== 'OFF') {
			e.preventDefault();
			e.stopPropagation();
			if ($linkTool.sourceId && $linkTool.sourceId !== node.id) {
				const result = modelerStore.connectNodes(
					$linkTool.sourceId,
					node.id,
					$linkTool.mode as LinkKind
				);

				if (result.ok) {
					linkTool.set({ mode: $linkTool.mode, sourceId: node.id });
					interactionHint = 'Connection created. Click another target or press Esc.';
				} else {
					interactionHint = result.reason || 'Connection blocked.';
				}
			} else {
				linkTool.set({ mode: $linkTool.mode, sourceId: node.id });
				interactionHint = 'Source selected. Click target node to connect.';
			}
			modelerStore.selectNode(node.id);
			return;
		}

		const world = toWorld(e.clientX, e.clientY);
		modelerStore.startDragging(world.x, world.y, node);
		modelerStore.selectNode(node.id);
	}

	function handleCanvasMouseDown(e: MouseEvent) {
		if ((e.button === 1 || e.button === 2) && e.target === canvasRef) {
			e.preventDefault();
			isPanning = true;
			panStart = { x: e.clientX, y: e.clientY };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isPanning) {
			modelerStore.panBy(e.clientX - panStart.x, e.clientY - panStart.y);
			panStart = { x: e.clientX, y: e.clientY };
			return;
		}

		const world = toWorld(e.clientX, e.clientY);
		modelerStore.dragTo(world.x, world.y);
	}

	function handleMouseUp() {
		isPanning = false;
		modelerStore.stopDragging();
	}

	function handleCanvasClick(e: MouseEvent) {
		if (e.target !== canvasRef) return;

		if ($linkTool.mode !== 'OFF') {
			linkTool.set({ mode: $linkTool.mode, sourceId: null });
			interactionHint = 'Source cleared. Click node to select source.';
			return;
		}

		if (!$shapeTool.selected) {
			modelerStore.selectNode(null);
			return;
		}

		const world = toWorld(e.clientX, e.clientY);
		placeShapeAt(world.x, world.y);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const pivot = toViewport(e.clientX, e.clientY);
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		modelerStore.zoomAt(factor, pivot);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const dropped = (e.dataTransfer?.getData('application/x-shape') ||
			e.dataTransfer?.getData('text/plain')) as VisualShapeKind | '';
		if (!dropped) return;

		shapeTool.set({ selected: dropped, mode: 'dragging' });
		const world = toWorld(e.clientX, e.clientY);
		placeShapeAt(world.x, world.y);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function setLinkMode(mode: LinkKind | 'OFF') {
		linkTool.set({ mode, sourceId: null });
		if (mode === 'OFF') {
			interactionHint = '';
			return;
		}
		interactionHint = `Link mode: ${mode}. Click source node then target node.`;
	}

	function handleCanvasKeydown(e: KeyboardEvent) {
		if (e.key === '1') {
			setLinkMode('PREDICATOR_LINE');
		} else if (e.key === '2') {
			setLinkMode('SPECIALIZATION_ARROW');
		} else if (e.key === '3') {
			setLinkMode('GENERALIZATION_ARROW');
		} else if (e.key === 'Escape') {
			setLinkMode('OFF');
			shapeTool.set({ selected: null, mode: 'idle' });
		}
	}
</script>

<svelte:window onkeydown={handleCanvasKeydown} />

<div class="modeler-container">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<svg
		bind:this={canvasRef}
		role="img"
		aria-label="Information structure modeler canvas"
		onmousedown={handleCanvasMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onclick={handleCanvasClick}
		onwheel={handleWheel}
		ondragover={handleDragOver}
		ondrop={handleDrop}
		oncontextmenu={(e) => e.preventDefault()}
		preserveAspectRatio="none"
		class="canvas-svg"
		class:has-shape-selected={Boolean($shapeTool.selected)}
	>
		<!-- Define Arrow Markers for Hierarchies -->
		<defs>
			<marker
				id="specialization-arrow"
				viewBox="0 0 10 10"
				refX="10"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
			</marker>
			<marker
				id="generalization-arrow"
				viewBox="0 0 10 10"
				refX="10"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="none" stroke="currentColor" stroke-width="1" />
			</marker>

			<!-- Grid Pattern -->
			<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
				<path d="M 40 0 L 0 0 0 40" fill="none" stroke="#eee" stroke-width="0.5" />
			</pattern>
		</defs>

		<g
			transform={`translate(${modelerStore.pan.x} ${modelerStore.pan.y}) scale(${modelerStore.zoom})`}
		>
			<!-- Grid Background -->
			<rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#grid)" />

			<!-- 1. Render Links (Predicators & Hierarchies) -->
			<g class="links-layer">
				{#each modelerStore.activeLinks as link (link.id)}
					{#if link.path.length === 2}
						<line
							x1={link.path[0].x}
							y1={link.path[0].y}
							x2={link.path[1].x}
							y2={link.path[1].y}
							class="link-line"
							class:specialization={link.kind === 'SPECIALIZATION_ARROW'}
							class:generalization={link.kind === 'GENERALIZATION_ARROW'}
							marker-end={link.kind === 'SPECIALIZATION_ARROW'
								? 'url(#specialization-arrow)'
								: link.kind === 'GENERALIZATION_ARROW'
									? 'url(#generalization-arrow)'
									: ''}
						/>
					{/if}
				{/each}
			</g>

			<!-- 2. Render Nodes (Object Types) -->
			<g class="nodes-layer">
				{#each modelerStore.nodes as node (node.id)}
					<g
						role="button"
						tabindex="0"
						aria-label={`Node: ${node.label ?? node.id}`}
						class="node-group"
						class:selected={node.id === modelerStore.selectedNodeId}
						transform={`translate(${node.position.x}, ${node.position.y})`}
						onmousedown={(e) => handleNodeMouseDown(e, node)}
						onclick={() => modelerStore.selectNode(node.id)}
						onkeydown={(e) => {
							if (e.key === 'Delete' || e.key === 'Backspace') {
								modelerStore.deleteNode(node.id);
							}
						}}
					>
						{#if node.isObjectified}
							<circle
								r={Math.max(node.dimensions.width, node.dimensions.height) / 2 + 18}
								class="objectification-circle"
							/>
						{/if}

						<!-- Rendering logic based on VisualShapeKind -->
						{#if node.kind === 'ENTITY_CIRCLE'}
							<circle
								r={node.dimensions.width / 2}
								class="entity-shape"
								fill={node.fillColor ?? SHAPE_COLORS.ENTITY_CIRCLE}
							/>
						{:else if node.kind === 'LABEL_CIRCLE'}
							<circle
								r={node.dimensions.width / 2}
								class="label-shape"
								fill={node.fillColor ?? SHAPE_COLORS.LABEL_CIRCLE}
								stroke-dasharray="6 5"
							/>
						{:else if node.kind === 'POWER_TYPE_CIRCLE'}
							<circle
								r={node.dimensions.width / 2}
								class="power-outer"
								fill={node.fillColor ?? SHAPE_COLORS.POWER_TYPE_CIRCLE}
							/>
							<circle r={node.dimensions.width / 2 - 10} class="power-inner" />
						{:else if node.kind === 'SEQUENCE_TYPE_BOX'}
							<rect
								x={-node.dimensions.width / 2}
								y={-node.dimensions.height / 2}
								width={node.dimensions.width}
								height={node.dimensions.height}
								rx="14"
								class="sequence-shape"
								fill={node.fillColor ?? SHAPE_COLORS.SEQUENCE_TYPE_BOX}
							/>
						{:else if node.kind === 'FACT_BOX_N' || node.kind === 'OBJECTIFIED_FACT'}
							<rect
								x={-node.dimensions.width / 2}
								y={-node.dimensions.height / 2}
								width={node.dimensions.width}
								height={node.dimensions.height}
								rx="2"
								class="fact-box"
								fill={node.fillColor ?? SHAPE_COLORS.FACT_BOX_N}
							/>
						{/if}

						<!-- Label -->
						<text x="0" y="1" class="node-label" text-anchor="middle" dominant-baseline="middle">
							{node.label ?? node.id}
						</text>
					</g>
				{/each}
			</g>
		</g>
	</svg>

	<div class="camera-controls">
		<button
			type="button"
			onclick={() => modelerStore.setZoom(modelerStore.zoom + 0.1)}
			aria-label="Zoom in"
		>
			+
		</button>
		<button
			type="button"
			onclick={() => modelerStore.setZoom(modelerStore.zoom - 0.1)}
			aria-label="Zoom out"
		>
			-
		</button>
		<button type="button" onclick={() => modelerStore.resetCamera()} aria-label="Reset camera">
			Reset
		</button>
		<span>{Math.round(modelerStore.zoom * 100)}%</span>
		<button
			type="button"
			class:active={modelerStore.snapToGrid}
			onclick={() => modelerStore.setSnapEnabled(!modelerStore.snapToGrid)}
			aria-pressed={modelerStore.snapToGrid}
			title="Toggle snap to grid"
		>
			Snap
		</button>
	</div>

	<div class="link-controls" role="toolbar" aria-label="Link tools">
		<button
			type="button"
			onclick={() => setLinkMode('PREDICATOR_LINE')}
			class:active={$linkTool.mode === 'PREDICATOR_LINE'}
		>
			Edge
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('SPECIALIZATION_ARROW')}
			class:active={$linkTool.mode === 'SPECIALIZATION_ARROW'}
		>
			Spec
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('GENERALIZATION_ARROW')}
			class:active={$linkTool.mode === 'GENERALIZATION_ARROW'}
		>
			Gen
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('OFF')}
			class:active={$linkTool.mode === 'OFF'}
		>
			Off
		</button>
	</div>

	{#if $shapeTool.selected || interactionHint || $linkTool.mode !== 'OFF'}
		<div class="shape-hint">
			{interactionHint ||
				($linkTool.mode !== 'OFF'
					? `Link mode active: ${$linkTool.mode}. 1 Edge, 2 Spec, 3 Gen, Esc Off`
					: `Click canvas to place ${$shapeTool.selected}`)}
		</div>
	{/if}
</div>

<style>
	.modeler-container {
		width: 100%;
		height: 100%;
		min-width: 0;
		background: var(--canvas-bg);
		overflow: hidden;
		position: relative;

		.canvas-svg {
			width: 100%;
			height: 100%;
			display: block;
			cursor: crosshair;

			&:not(.has-shape-selected) {
				cursor: grab;
			}

			&.has-shape-selected {
				cursor: crosshair;
			}
		}

		.shape-hint {
			position: absolute;
			bottom: 1rem;
			left: 50%;
			transform: translateX(-50%);
			background: color-mix(in oklab, var(--primary-color) 88%, black 12%);
			color: white;
			padding: 0.6rem 1rem;
			border-radius: 10px;
			font-size: 0.9rem;
			pointer-events: none;
			box-shadow: var(--shadow);
		}

		.camera-controls {
			position: absolute;
			top: 0.85rem;
			right: 0.85rem;
			display: flex;
			align-items: center;
			gap: 0.45rem;
			padding: 0.45rem;
			border: 1px solid var(--border-color);
			border-radius: 10px;
			background: color-mix(in oklab, var(--bg-secondary) 92%, black 8%);
			box-shadow: var(--shadow);

			button {
				padding: 0.25rem 0.5rem;
				border: 1px solid var(--border-color);
				border-radius: 6px;
				background: var(--bg-primary);
				color: var(--text-primary);
				cursor: pointer;
			}

			span {
				font-size: 0.82rem;
				color: var(--text-secondary);
				min-width: 3rem;
				text-align: center;
			}
		}

		.link-controls {
			position: absolute;
			top: 3.9rem;
			right: 0.85rem;
			display: flex;
			gap: 0.35rem;
			padding: 0.4rem;
			border: 1px solid var(--border-color);
			border-radius: 10px;
			background: color-mix(in oklab, var(--bg-secondary) 92%, black 8%);
			box-shadow: var(--shadow);

			button {
				padding: 0.22rem 0.52rem;
				border: 1px solid var(--border-color);
				border-radius: 6px;
				background: var(--bg-primary);
				color: var(--text-primary);
				cursor: pointer;

				&.active {
					background: var(--primary-color);
					color: white;
					border-color: var(--primary-color);
				}
			}
		}
	}

	/* Shape Styles */
	.entity-shape {
		stroke: var(--node-border);
		stroke-width: 2.6;
	}

	.label-shape {
		stroke: var(--node-border);
		stroke-width: 2.6;
	}

	.power-outer,
	.power-inner {
		stroke: var(--node-border);
		stroke-width: 2;
	}

	.power-inner {
		fill: color-mix(in oklab, var(--bg-primary) 88%, white 12%);
	}

	.sequence-shape {
		stroke: var(--node-border);
		stroke-width: 2;
	}

	.fact-box {
		stroke: var(--node-border);
		stroke-width: 2;
	}

	.objectification-circle {
		fill: none;
		stroke: color-mix(in oklab, var(--primary-color) 74%, white 26%);
		stroke-width: 3;
	}

	/* Link Styles */
	.link-line {
		stroke: color-mix(in oklab, var(--text-primary) 84%, var(--bg-primary) 16%);
		stroke-width: 2;

		&.specialization {
			stroke-dasharray: none;
		}

		&.generalization {
			stroke-dasharray: 4 2;
		}
	}

	.node-group {
		cursor: grab;

		&:active {
			cursor: grabbing;
		}

		&.selected {
			:global(.entity-shape),
			:global(.label-shape),
			:global(.power-outer),
			:global(.power-inner),
			:global(.sequence-shape),
			:global(.fact-box) {
				stroke: var(--node-selected);
				stroke-width: 3.8;
			}
		}
	}

	.node-label {
		font-size: 14px;
		font-weight: 700;
		fill: var(--text-primary);
		stroke: var(--bg-primary);
		stroke-width: 1.75;
		paint-order: stroke;
		pointer-events: none;
		user-select: none;
	}
</style>
