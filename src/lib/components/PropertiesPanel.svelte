<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas-store';
	import type { CanvasNode, CanvasEdge } from '$lib/canvas-types';

	let isOpen = false;
	let selectedNode: CanvasNode | null = null;
	let selectedEdge: CanvasEdge | null = null;

	$: {
		if ($canvasStore.selectedNodes.size === 1) {
			const nodeId = Array.from($canvasStore.selectedNodes)[0];
			selectedNode = $canvasStore.nodes.get(nodeId) || null;
			selectedEdge = null;
			isOpen = true;
		} else if ($canvasStore.selectedEdges.size === 1) {
			const edgeId = Array.from($canvasStore.selectedEdges)[0];
			selectedEdge = $canvasStore.edges.get(edgeId) || null;
			selectedNode = null;
			isOpen = true;
		} else {
			selectedNode = null;
			selectedEdge = null;
			isOpen = false;
		}
	}

	function updateNodeLabel(e: Event) {
		if (selectedNode) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateNode(selectedNode.id, { label: target.value });
		}
	}

	function updateNodeColor(e: Event) {
		if (selectedNode) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateNode(selectedNode.id, { color: target.value });
		}
	}

	function updateNodeArity(e: Event) {
		if (selectedNode && selectedNode.type === 'factType') {
			const node = selectedNode; // Create local const to satisfy TypeScript
			const target = e.target as HTMLInputElement;
			const arity = parseInt(target.value);

			// Recreate squares
			const squareSize = 40;
			const spacing = 0;
			const squares = Array.from({ length: arity }, (_, i) => ({
				id: crypto.randomUUID(),
				position: {
					x: node.position.x + i * (squareSize + spacing),
					y: node.position.y
				}
			}));

			canvasStore.updateNode(node.id, { arity, squares });
		}
	}

	function updateEdgeLabel(e: Event) {
		if (selectedEdge) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateEdge(selectedEdge.id, { label: target.value });
		}
	}

	function updateEdgeColor(e: Event) {
		if (selectedEdge) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateEdge(selectedEdge.id, { color: target.value });
		}
	}

	function closePanel() {
		isOpen = false;
		canvasStore.clearSelection();
	}

	function deleteSelected() {
		canvasStore.deleteSelected();
		isOpen = false;
	}
</script>

{#if isOpen && (selectedNode || selectedEdge)}
	<div class="properties-panel">
		<div class="panel-header">
			<h3>Properties</h3>
			<button class="close-btn" onclick={closePanel} title="Close (Esc)">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M12 4L4 12M4 4l8 8"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>

		{#if selectedNode}
			<div class="property-group">
				<h4>Node: {selectedNode.type}</h4>

				<div class="property">
					<label for="node-label">Label</label>
					<input id="node-label" type="text" value={selectedNode.label} oninput={updateNodeLabel} />
				</div>

				<div class="property">
					<label for="node-color">Color</label>
					<input
						id="node-color"
						type="color"
						value={selectedNode.color}
						oninput={updateNodeColor}
					/>
				</div>

				{#if selectedNode.type === 'factType'}
					<div class="property">
						<label for="node-arity">Arity (n-ary)</label>
						<input
							id="node-arity"
							type="number"
							min="1"
							max="10"
							value={selectedNode.arity || 2}
							oninput={updateNodeArity}
						/>
					</div>
				{/if}

				<div class="property">
					<h4>Position</h4>
					<div class="coords">
						<span>X: {Math.round(selectedNode.position.x)}</span>
						<span>Y: {Math.round(selectedNode.position.y)}</span>
					</div>
				</div>
			</div>
		{:else if selectedEdge}
			<div class="property-group">
				<h4>Edge: Predicate</h4>

				<div class="property">
					<label for="edge-label">Label</label>
					<input
						id="edge-label"
						type="text"
						value={selectedEdge.label}
						oninput={updateEdgeLabel}
						placeholder="Predicate name"
					/>
				</div>

				<div class="property">
					<label for="edge-color">Color</label>
					<input
						id="edge-color"
						type="color"
						value={selectedEdge.color}
						oninput={updateEdgeColor}
					/>
				</div>

				<div class="property">
					<h4>Connection</h4>
					<div class="info">
						<div>
							Source: {$canvasStore.nodes.get(selectedEdge.sourceNodeId)?.label || 'Unknown'}
						</div>
						<div>
							Target: {$canvasStore.nodes.get(selectedEdge.targetNodeId)?.label || 'Unknown'}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="panel-actions">
			<button class="delete-btn" onclick={deleteSelected}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4h8z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
				Delete
			</button>
		</div>
	</div>
{/if}

<style>
	.properties-panel {
		position: absolute;
		top: 0;
		right: 0;
		width: 320px;
		height: 100%;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-color);
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
		padding: 1rem 1.5rem 1.5rem;
		overflow-y: auto;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.panel-actions {
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.delete-btn {
		width: 100%;
		padding: 0.625rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.delete-btn:hover {
		background: #b91c1c;
	}

	h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.property-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.property {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	input[type='text'],
	input[type='number'] {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	input[type='text']:focus,
	input[type='number']:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	input[type='color'] {
		height: 2.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		cursor: pointer;
		background: var(--bg-primary);
	}

	.coords {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.info {
		font-size: 0.75rem;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
