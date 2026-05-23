<script lang="ts">
	import { activeTool } from '$lib/stores/app';
	import ModelerHelp from './toolbars/ModelerHelp.svelte';
	import ObjectProperties from './toolbars/ObjectProperties.svelte';

	let showProperties = $state(true);
	let showHelp = $state(true);
</script>

<div class="sidebar-right" class:modeler={$activeTool === 'modeler'}>
	{#if $activeTool === 'modeler'}
		<section class="panel">
			<button type="button" class="panel-toggle" onclick={() => (showProperties = !showProperties)}>
				<span>Object Properties</span>
				<span>{showProperties ? '−' : '+'}</span>
			</button>
			{#if showProperties}
				<ObjectProperties />
			{/if}
		</section>

		<section class="panel">
			<button type="button" class="panel-toggle" onclick={() => (showHelp = !showHelp)}>
				<span>Modeler Help</span>
				<span>{showHelp ? '−' : '+'}</span>
			</button>
			{#if showHelp}
				<ModelerHelp />
			{/if}
		</section>
	{:else}
		<div class="placeholder">No context panel for this tool yet.</div>
	{/if}
</div>

<style>
	.sidebar-right {
		width: 0;
		flex: 0 0 0;
		overflow-y: auto;
		border-left: 0;
		transition: width 140ms ease;
		background: var(--bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;

		.panel {
			border-bottom: 1px solid var(--border-color);

			.panel-toggle {
				width: 100%;
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 0.72rem 0.9rem;
				font-size: 0.88rem;
				font-weight: 700;
				color: var(--text-primary);
				background: color-mix(in oklab, var(--bg-secondary) 92%, black 8%);
				border: none;
				border-bottom: 1px solid var(--border-color);
				cursor: pointer;
			}
		}

		&.modeler {
			width: 18rem;
			flex: 0 0 18rem;
			border-left: 1px solid var(--border-color);
		}

		.placeholder {
			padding: 1rem;
			color: var(--text-secondary);
			font-size: 0.9rem;
		}
	}
</style>
