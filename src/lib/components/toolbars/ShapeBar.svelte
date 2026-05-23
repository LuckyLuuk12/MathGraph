<!-- @component
The ShapeBar is one of the tool-specific left sidebars that contains all the objects 
from the theory represented as shapes that can be dragged into the modeler canvas.
 -->
<script lang="ts">
	import { currentProject } from '$lib/stores/app';
	import { shapeTool } from '$lib/stores/modeler.svelte';

	const shapeTypes = [
		{ id: 'ENTITY_CIRCLE', label: 'Entity', icon: '◯' },
		{ id: 'LABEL_CIRCLE', label: 'Label', icon: '◌' },
		{ id: 'POWER_TYPE_CIRCLE', label: 'Power Type', icon: '◎' },
		{ id: 'SEQUENCE_TYPE_BOX', label: 'Sequence Type', icon: '▭' },
		{ id: 'FACT_BOX_N', label: 'Fact Type', icon: '▢' },
		{ id: 'OBJECTIFIED_FACT', label: 'Objectification', icon: '◌+' }
	];

	function selectShape(shapeId: string) {
		shapeTool.set({
			selected: shapeId,
			mode: 'idle'
		});
	}

	function startDrag(event: DragEvent, shapeId: string) {
		event.dataTransfer?.setData('application/x-shape', shapeId);
		event.dataTransfer?.setData('text/plain', shapeId);
		event.dataTransfer?.setDragImage(event.currentTarget as Element, 22, 22);
		shapeTool.set({ selected: shapeId, mode: 'dragging' });
	}

	function stopDrag() {
		shapeTool.update((tool) => ({ ...tool, mode: 'idle' }));
	}
</script>

<div class="shape-bar">
	<div class="header">Object Types</div>
	{#if $currentProject}
		<div class="shapes-list">
			{#each shapeTypes as shape (shape.id)}
				<button
					type="button"
					class="shape-btn"
					class:active={$shapeTool.selected === shape.id}
					onclick={() => selectShape(shape.id)}
					ondragstart={(e) => startDrag(e, shape.id)}
					ondragend={stopDrag}
					draggable="true"
					title={shape.label}
				>
					<span class="icon">{shape.icon}</span>
					<span class="label">{shape.label}</span>
				</button>
			{/each}
		</div>
		<div class="info-section">
			<div class="subheader">Project Objects</div>
			<div class="objects-count">
				Entities: {$currentProject.informationStructure.E.size}
			</div>
			<div class="objects-count">Tip: click shape then canvas, or drag shape onto canvas.</div>
			<div class="objects-count">Objectification only applies when dropped onto existing node.</div>
		</div>
	{:else}
		<div class="empty">No project selected</div>
	{/if}
</div>

<style>
	.shape-bar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		height: 100%;
		overflow-y: auto;
		border-right: 1px solid var(--border-color);

		.header {
			font-weight: bold;
			font-size: 1rem;
			color: inherit;
		}

		.shapes-list {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			.shape-btn {
				display: flex;
				align-items: center;
				gap: 0.6rem;
				padding: 0.6rem 0.8rem;
				border: 1px solid var(--border-color);
				border-radius: 4px;
				background: var(--bg-secondary);
				color: inherit;
				cursor: pointer;
				font-size: 0.9rem;
				transition: background 0.2s;

				&:hover {
					background: var(--bg-primary);
				}

				&.active {
					background: var(--accent-color);
					color: white;
					border-color: var(--accent-color);
				}

				.icon {
					font-size: 1.2rem;
					width: 1.5rem;
					text-align: center;
				}

				.label {
					flex: 1;
					text-align: left;
				}
			}
		}

		.info-section {
			border-top: 1px solid var(--border-color);
			padding-top: 1rem;

			.subheader {
				font-weight: 600;
				font-size: 0.85rem;
				color: var(--text-secondary);
				margin-bottom: 0.5rem;
			}

			.objects-count {
				font-size: 0.85rem;
				color: var(--text-secondary);
			}
		}

		.empty {
			color: var(--text-secondary);
			text-align: center;
			padding: 2rem 1rem;
		}
	}
</style>
