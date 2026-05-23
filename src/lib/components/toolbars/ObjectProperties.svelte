<script lang="ts">
	import { modelerStore } from '$lib/stores/modeler.svelte';

	const fallbackColorByKind = {
		ENTITY_CIRCLE: 'var(--node-entity)',
		LABEL_CIRCLE: 'var(--node-label)',
		POWER_TYPE_CIRCLE: '#f97316',
		SEQUENCE_TYPE_BOX: '#14b8a6',
		FACT_BOX_N: 'var(--node-fact)',
		OBJECTIFIED_FACT: 'var(--node-fact)'
	} as const;

	const solidFallbackColorByKind = {
		ENTITY_CIRCLE: '#93c5fd',
		LABEL_CIRCLE: '#c4b5fd',
		POWER_TYPE_CIRCLE: '#f97316',
		SEQUENCE_TYPE_BOX: '#14b8a6',
		FACT_BOX_N: '#fde68a',
		OBJECTIFIED_FACT: '#fde68a'
	} as const;

	let selectedNode = $derived(
		modelerStore.nodes.find((n) => n.id === modelerStore.selectedNodeId) ?? null
	);

	function updateLabel(value: string) {
		if (!selectedNode) return;
		modelerStore.updateNodeLabel(selectedNode.id, value);
	}

	function updateColor(value: string) {
		if (!selectedNode) return;
		modelerStore.updateNodeColor(selectedNode.id, value);
	}

	function toggleObjectified(value: boolean) {
		if (!selectedNode) return;
		modelerStore.setNodeObjectified(selectedNode.id, value);
	}

	function updateArity(value: number) {
		if (!selectedNode) return;
		modelerStore.setFactArity(selectedNode.id, value);
	}
</script>

<div class="object-properties">
	<div class="header">Object Properties</div>

	{#if selectedNode}
		<div class="field">
			<label for="node-label">Label</label>
			<input
				id="node-label"
				type="text"
				value={selectedNode.label ?? ''}
				oninput={(e) => updateLabel((e.currentTarget as HTMLInputElement).value)}
			/>
		</div>

		<div class="field">
			<label for="node-kind">Type</label>
			<input id="node-kind" type="text" value={selectedNode.kind} disabled />
		</div>

		<div class="field">
			<label for="node-color">Color</label>
			<input
				id="node-color"
				type="color"
				value={selectedNode.fillColor ?? solidFallbackColorByKind[selectedNode.kind]}
				oninput={(e) => updateColor((e.currentTarget as HTMLInputElement).value)}
			/>
		</div>

		<div class="field checkbox">
			<label>
				<input
					type="checkbox"
					checked={Boolean(selectedNode.isObjectified)}
					onchange={(e) => toggleObjectified((e.currentTarget as HTMLInputElement).checked)}
				/>
				Objectified
			</label>
		</div>

		{#if selectedNode.kind === 'FACT_BOX_N' || selectedNode.kind === 'OBJECTIFIED_FACT'}
			<div class="field">
				<label for="node-arity">Arity</label>
				<input
					id="node-arity"
					type="number"
					min="1"
					max="12"
					value={selectedNode.arity ?? 1}
					oninput={(e) => updateArity((e.currentTarget as HTMLInputElement).valueAsNumber)}
				/>
			</div>
		{/if}

		<div class="meta">
			<div>ID: {selectedNode.id}</div>
			<div>
				Position: {Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)}
			</div>
			<div>Default Color: {fallbackColorByKind[selectedNode.kind]}</div>
		</div>
	{:else}
		<div class="empty">Select object in modeler to edit properties.</div>
	{/if}
</div>

<style>
	.object-properties {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		height: 100%;
		padding: 1rem;
		background: var(--bg-secondary);
		color: var(--text-primary);

		.header {
			font-size: 0.98rem;
			font-weight: 700;
			padding-bottom: 0.7rem;
			border-bottom: 1px solid var(--border-color);
		}

		.field {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;

			label {
				font-size: 0.82rem;
				font-weight: 600;
				color: var(--text-secondary);
			}

			input[type='text'] {
				padding: 0.5rem 0.65rem;
				border: 1px solid var(--border-color);
				border-radius: 8px;
				background: var(--bg-primary);
				color: var(--text-primary);
			}

			input[type='number'] {
				padding: 0.5rem 0.65rem;
				border: 1px solid var(--border-color);
				border-radius: 8px;
				background: var(--bg-primary);
				color: var(--text-primary);
			}

			input[type='color'] {
				width: 100%;
				height: 2.2rem;
				padding: 0.1rem;
				border: 1px solid var(--border-color);
				border-radius: 8px;
				background: var(--bg-primary);
			}
		}

		.checkbox {
			label {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				font-size: 0.9rem;
				color: var(--text-primary);
			}
		}

		.meta {
			margin-top: 0.3rem;
			padding: 0.8rem;
			border-radius: 10px;
			background: color-mix(in oklab, var(--bg-primary) 88%, black 12%);
			font-size: 0.8rem;
			line-height: 1.45;
			color: var(--text-secondary);
		}

		.empty {
			padding: 0.8rem;
			border-radius: 10px;
			background: color-mix(in oklab, var(--bg-primary) 92%, black 8%);
			font-size: 0.9rem;
			color: var(--text-secondary);
		}
	}
</style>
