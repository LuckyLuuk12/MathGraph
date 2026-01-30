<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas-store';
	import { TOOLS } from '$lib/canvas-types';
	import type { Tool } from '$lib/canvas-types';

	let currentTool = $state<Tool>(TOOLS.SELECT);
	let showStructure = $state(true);
	let showSubtype = $state(false);
	let showConstraint = $state(false);

	canvasStore.toolStore.subscribe((tool) => {
		currentTool = tool;
	});

	function selectTool(tool: Tool) {
		canvasStore.setTool(tool);
	}
</script>

<div class="toolbar">
	<!-- Structure Tools -->
	<div class="tool-category">
		<button class="category-toggle" onclick={() => (showStructure = !showStructure)}>
			<i class={showStructure ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
			Structure
		</button>
		{#if showStructure}
			<div class="tool-group">
				<button
					class="tool-btn"
					class:active={currentTool.id === 'select'}
					onclick={() => selectTool(TOOLS.SELECT)}
					title="Select"
				>
					<span class="icon">{TOOLS.SELECT.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'entity'}
					onclick={() => selectTool(TOOLS.ENTITY)}
					title="Entity Type (E)"
				>
					<span class="icon">{TOOLS.ENTITY.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'factType'}
					onclick={() => selectTool(TOOLS.FACT_TYPE)}
					title="Fact Type (F)"
				>
					<span class="icon">{TOOLS.FACT_TYPE.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'labelType'}
					onclick={() => selectTool(TOOLS.LABEL_TYPE)}
					title="Label Type (L)"
				>
					<span class="icon">{TOOLS.LABEL_TYPE.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'powerType'}
					onclick={() => selectTool(TOOLS.POWER_TYPE)}
					title="Power Type"
				>
					<span class="icon">{TOOLS.POWER_TYPE.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'sequenceType'}
					onclick={() => selectTool(TOOLS.SEQUENCE_TYPE)}
					title="Sequence Type"
				>
					<span class="icon">{TOOLS.SEQUENCE_TYPE.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'objectify'}
					onclick={() => selectTool(TOOLS.OBJECTIFY)}
					title="Objectification"
				>
					<span class="icon">{TOOLS.OBJECTIFY.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'predicator'}
					onclick={() => selectTool(TOOLS.PREDICATOR)}
					title="Predicator (P)"
				>
					<span class="icon">{TOOLS.PREDICATOR.icon}</span>
				</button>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Subtype Tools -->
	<div class="tool-category">
		<button class="category-toggle" onclick={() => (showSubtype = !showSubtype)}>
			<i class={showSubtype ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
			Subtype
		</button>
		{#if showSubtype}
			<div class="tool-group">
				<button
					class="tool-btn"
					class:active={currentTool.id === 'generalization'}
					onclick={() => selectTool(TOOLS.GENERALIZATION)}
					title="Generalization"
				>
					<span class="icon">{TOOLS.GENERALIZATION.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'specialization'}
					onclick={() => selectTool(TOOLS.SPECIALIZATION)}
					title="Specialization"
				>
					<span class="icon">{TOOLS.SPECIALIZATION.icon}</span>
				</button>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Constraint Tools -->
	<div class="tool-category">
		<button class="category-toggle" onclick={() => (showConstraint = !showConstraint)}>
			<i class={showConstraint ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
			Constraints
		</button>
		{#if showConstraint}
			<div class="tool-group">
				<button
					class="tool-btn"
					class:active={currentTool.id === 'uniqueness'}
					onclick={() => selectTool(TOOLS.UNIQUENESS)}
					title="Uniqueness"
				>
					<span class="icon">{TOOLS.UNIQUENESS.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'mandatory'}
					onclick={() => selectTool(TOOLS.MANDATORY)}
					title="Mandatory"
				>
					<span class="icon">{TOOLS.MANDATORY.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'exclusion'}
					onclick={() => selectTool(TOOLS.EXCLUSION)}
					title="Exclusion"
				>
					<span class="icon">{TOOLS.EXCLUSION.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'subset'}
					onclick={() => selectTool(TOOLS.SUBSET)}
					title="Subset"
				>
					<span class="icon">{TOOLS.SUBSET.icon}</span>
				</button>

				<button
					class="tool-btn"
					class:active={currentTool.id === 'frequency'}
					onclick={() => selectTool(TOOLS.FREQUENCY)}
					title="Frequency"
				>
					<span class="icon">{TOOLS.FREQUENCY.icon}</span>
				</button>
			</div>
		{/if}
	</div>

	<div class="move-right"></div>

	<div class="tool-group">
		<button
			class="tool-btn"
			onclick={() => canvasStore.undo()}
			disabled={!canvasStore.canUndo()}
			title="Undo (Ctrl+Z)"
		>
			<span class="icon">↶</span>
		</button>

		<button
			class="tool-btn"
			onclick={() => canvasStore.redo()}
			disabled={!canvasStore.canRedo()}
			title="Redo (Ctrl+Y)"
		>
			<span class="icon">↷</span>
		</button>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--toolbar-bg);
		border-bottom: 1px solid var(--border-color);
	}

	.tool-group {
		display: flex;
		gap: 0.25rem;
	}

	.divider {
		width: 1px;
		height: 2rem;
		background: var(--border-color);
	}

	.move-right {
		margin-left: auto;
	}

	.tool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.75rem;
	}

	.tool-btn:hover {
		background: var(--hover-bg);
		border-color: var(--border-color);
	}

	.tool-btn.active {
		background: var(--active-bg);
		border-color: var(--primary-color);
		color: var(--primary-color);
	}

	.tool-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tool-btn:disabled:hover {
		background: transparent;
		border-color: transparent;
	}

	.icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.category-toggle {
		background: var(--toolbar-bg);
		border: 1px solid var(--border-color);
		color: var(--text-color);
		padding: 0.35rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.category-toggle:hover {
		background: var(--hover-bg);
	}

	.tool-category {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
