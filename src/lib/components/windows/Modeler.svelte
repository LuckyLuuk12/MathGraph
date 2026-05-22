<script lang="ts">
	import { modelerStore } from '$lib/stores/modeler.svelte';

	import type { VisualNode } from '$lib/modeler/graph';

	function handleMouseDown(e: MouseEvent, node: VisualNode) {
		modelerStore.startDragging(e.clientX, e.clientY, node);
	}

	function handleMouseMove(e: MouseEvent) {
		modelerStore.dragTo(e.clientX, e.clientY);
	}

	function handleMouseUp() {
		modelerStore.stopDragging();
	}
</script>

<div class="modeler-container">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		role="img"
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		viewBox="0 0 2000 2000"
		class="canvas-svg"
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
				<path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
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
				<path d="M 0 0 L 10 5 L 0 10 z" fill="none" stroke="#333" stroke-width="1" />
			</marker>
		</defs>

		<!-- 1. Render Links (Predicators & Hierarchies) -->
		<g class="links-layer">
			{#each modelerStore.activeLinks as link (link.toId)}
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
					class="node-group"
					transform={`translate(${node.position.x}, ${node.position.y})`}
					onmousedown={(e) => handleMouseDown(e, node)}
				>
					<!-- Rendering logic based on VisualShapeKind [Source 6, 32, 63] -->
					{#if node.kind === 'ENTITY_CIRCLE'}
						<circle r={node.dimensions.width / 2} class="entity-shape" />
					{:else if node.kind === 'LABEL_CIRCLE'}
						<circle r={node.dimensions.width / 2} class="label-shape" stroke-dasharray="4" />
					{:else if node.kind === 'POWER_TYPE_CIRCLE'}
						<circle r={node.dimensions.width / 2} class="power-outer" />
						<circle r={node.dimensions.width / 2 - 8} class="power-inner" />
					{:else if node.kind === 'SEQUENCE_TYPE_BOX'}
						<rect
							x={-node.dimensions.width / 2}
							y={-node.dimensions.height / 2}
							width={node.dimensions.width}
							height={node.dimensions.height}
							class="sequence-shape"
						/>
						<circle r={30} class="entity-shape" />
						<!-- Element Type circle -->
					{:else if node.kind === 'FACT_BOX_N' || node.kind === 'OBJECTIFIED_FACT'}
						<!-- If objectified, wrap in an ellipse [Source 32] -->
						{#if node.kind === 'OBJECTIFIED_FACT'}
							<ellipse
								rx={node.dimensions.width / 2 + 10}
								ry={node.dimensions.height / 2 + 15}
								class="objectification-circle"
							/>
						{/if}

						<!-- Render n-connected squares [Source 167] -->
						<g transform="translate({-node.dimensions.width / 2}, {-node.dimensions.height / 2})">
							{#each node.roles || [] as role, i (i)}
								<rect x={i * 24} y={0} width="24" height="24" class="role-square" />
							{/each}
						</g>
					{/if}

					<!-- Text Label -->
					<text y={node.dimensions.height / 2 + 15} text-anchor="middle" class="node-label">
						{node.id}
					</text>
				</g>
			{/each}
		</g>
	</svg>
</div>

<style>
	.modeler-container {
		width: 100%;
		height: 100%;
		background: transparent;
		overflow: hidden;
	}

	.canvas-svg {
		width: 100%;
		height: 100%;
		cursor: crosshair;
	}

	/* Shape Styles */
	.entity-shape {
		fill: #fff;
		stroke: #333;
		stroke-width: 2;
	}
	.label-shape {
		fill: #fff;
		stroke: #333;
		stroke-width: 2;
	}
	.role-square {
		fill: #fff;
		stroke: #333;
		stroke-width: 1.5;
	}
	.power-outer,
	.power-inner {
		fill: none;
		stroke: #333;
		stroke-width: 2;
	}
	.sequence-shape {
		fill: none;
		stroke: #333;
		stroke-width: 2;
	}
	.objectification-circle {
		fill: none;
		stroke: #333;
		stroke-width: 1;
	}

	/* Link Styles */
	.link-line {
		stroke: #333;
		stroke-width: 2;
	}
	.specialization {
		stroke-dasharray: none;
	}
	.generalization {
		stroke-dasharray: 4 2;
	}

	.node-group {
		cursor: grab;
	}
	.node-group:active {
		cursor: grabbing;
	}
	.node-label {
		font-family: sans-serif;
		font-size: 12px;
		pointer-events: none;
	}
</style>
