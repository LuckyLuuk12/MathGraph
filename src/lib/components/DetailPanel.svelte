<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas-store';
	import type { CanvasNode, CanvasEdge } from '$lib/canvas-types';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let panel: HTMLDivElement;
	let detailNodeId: string | null = $state(null);
	let detailEdgeId: string | null = $state(null);

	let detailNode = $derived(detailNodeId ? $canvasStore.nodes.get(detailNodeId) || null : null);
	let detailEdge = $derived(detailEdgeId ? $canvasStore.edges.get(detailEdgeId) || null : null);

	onMount(() => {
		const handleOpenDetail = (e: Event) => {
			const event = e as CustomEvent<{ nodeId?: string; edgeId?: string }>;
			if (event.detail.nodeId) {
				detailNodeId = event.detail.nodeId;
				detailEdgeId = null;
				detailNode = $canvasStore.nodes.get(event.detail.nodeId) || null;
				detailEdge = null;
			} else if (event.detail.edgeId) {
				detailEdgeId = event.detail.edgeId;
				detailNodeId = null;
				detailEdge = $canvasStore.edges.get(event.detail.edgeId) || null;
				detailNode = null;
			}
			isOpen = true;
		};

		window.addEventListener('openDetailPanel', handleOpenDetail);

		return () => {
			window.removeEventListener('openDetailPanel', handleOpenDetail);
		};
	});

	function close() {
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (isOpen && panel && !panel.contains(event.target as Node)) {
			close();
		}
	}

	function updateLabel(e: Event) {
		const target = e.target as HTMLInputElement;
		if (detailNode && detailNodeId) {
			canvasStore.updateNode(detailNodeId, { label: target.value });
		} else if (detailEdge && detailEdgeId) {
			canvasStore.updateEdge(detailEdgeId, { label: target.value });
		}
	}

	function getConnectedNodes(nodeId: string): { incoming: CanvasEdge[]; outgoing: CanvasEdge[] } {
		const incoming: CanvasEdge[] = [];
		const outgoing: CanvasEdge[] = [];

		for (const edge of $canvasStore.edges.values()) {
			if (edge.targetNodeId === nodeId) {
				incoming.push(edge);
			} else if (edge.sourceNodeId === nodeId) {
				outgoing.push(edge);
			}
		}

		return { incoming, outgoing };
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="detail-panel" class:open={isOpen} bind:this={panel}>
	<div class="detail-content">
		<div class="detail-header">
			<h2>Details</h2>
			<button class="close-btn" onclick={close}>✕</button>
		</div>

		{#if detailNode}
			<div class="detail-body">
				<div class="field">
					<label for="detail-label">Name / Label</label>
					<input
						id="detail-label"
						type="text"
						value={detailNode.label}
						oninput={updateLabel}
						placeholder="Enter name..."
					/>
				</div>

				<div class="field">
					<div class="label">Type</div>
					<div class="value">{detailNode.type}</div>
				</div>

				<div class="field">
					<div class="label">Shape</div>
					<div class="value">{detailNode.shape}</div>
				</div>

				{#if detailNode.type === 'factType' && detailNode.arity}
					<div class="field">
						<div class="label">Arity</div>
						<div class="value">{detailNode.arity}-ary</div>
					</div>
				{/if}

				<div class="field">
					<div class="label">Position</div>
					<div class="value">
						X: {Math.round(detailNode.position.x)}, Y: {Math.round(detailNode.position.y)}
					</div>
				</div>

				<div class="field">
					<div class="label">Color</div>
					<div class="color-value">
						<div class="color-swatch" style="background-color: {detailNode.color}"></div>
						<span>{detailNode.color}</span>
					</div>
				</div>

				{#if detailNodeId}
					{@const connections = getConnectedNodes(detailNodeId)}
					{#if connections.incoming.length > 0 || connections.outgoing.length > 0}
						<div class="field">
							<div class="label">Connections</div>
							<div class="connections">
								{#if connections.incoming.length > 0}
									<div class="connection-group">
										<strong>Incoming:</strong>
										<ul>
											{#each connections.incoming as edge}
												<li>
													{edge.label || 'Predicate'} from {$canvasStore.nodes.get(
														edge.sourceNodeId
													)?.label || 'Unknown'}
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if connections.outgoing.length > 0}
									<div class="connection-group">
										<strong>Outgoing:</strong>
										<ul>
											{#each connections.outgoing as edge}
												<li>
													{edge.label || 'Predicate'} to {$canvasStore.nodes.get(edge.targetNodeId)
														?.label || 'Unknown'}
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{:else if detailEdge}
			<div class="detail-body">
				<div class="field">
					<label for="detail-label">Predicate Name</label>
					<input
						id="detail-label"
						type="text"
						value={detailEdge.label}
						oninput={updateLabel}
						placeholder="Enter predicate name..."
					/>
				</div>

				<div class="field">
					<div class="label">Source</div>
					<div class="value">
						{$canvasStore.nodes.get(detailEdge.sourceNodeId)?.label || 'Unknown'}
					</div>
				</div>

				<div class="field">
					<div class="label">Target</div>
					<div class="value">
						{$canvasStore.nodes.get(detailEdge.targetNodeId)?.label || 'Unknown'}
					</div>
				</div>

				<div class="field">
					<div class="label">Color</div>
					<div class="color-value">
						<div class="color-swatch" style="background-color: {detailEdge.color}"></div>
						<span>{detailEdge.color}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.detail-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 400px;
		height: 100vh;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-color);
		box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
		z-index: 999;
		transform: translateX(100%);
		transition: transform 0.3s ease-in-out;
		overflow-y: auto;
	}

	.detail-panel.open {
		transform: translateX(0);
	}

	.detail-content {
		padding: 2rem;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--primary-color);
	}

	h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.close-btn {
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 1.5rem;
		cursor: pointer;
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

	.detail-body {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	input[type='text'] {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input[type='text']:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.value {
		padding: 0.75rem;
		background: var(--bg-primary);
		border-radius: 0.375rem;
		color: var(--text-primary);
		font-size: 0.875rem;
	}

	.color-value {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-primary);
		border-radius: 0.375rem;
	}

	.color-swatch {
		width: 2rem;
		height: 2rem;
		border-radius: 0.25rem;
		border: 1px solid var(--border-color);
	}

	.connections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-primary);
		border-radius: 0.375rem;
	}

	.connection-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.connection-group strong {
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.connection-group ul {
		margin: 0;
		padding-left: 1.5rem;
		list-style-type: disc;
	}

	.connection-group li {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}
</style>
