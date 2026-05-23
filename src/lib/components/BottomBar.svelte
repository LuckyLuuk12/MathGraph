<script lang="ts">
	import { currentProject } from '$lib/stores/app';
	import { loadVisualState } from '$lib/stores/localstorage';

	let visualPersisted = $derived(
		$currentProject ? Boolean(loadVisualState($currentProject.id)) : false
	);
</script>

<div class="bottom-bar">
	<div class="project-info">
		{#if $currentProject}
			<span class="label">Project:</span>
			<span class="name">{$currentProject.name}</span>
			<span class="sep">•</span>
			<span class="visual">Visual: {visualPersisted ? 'persisted' : 'none'}</span>
		{:else}
			<span class="label">No project</span>
		{/if}
	</div>
</div>

<style>
	.bottom-bar {
		height: 2rem;
		width: 100%;
		display: flex;
		align-items: center;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--border-color);
		padding: 0 1rem;

		.project-info {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.9rem;

			.label {
				color: var(--text-secondary);
			}

			.name {
				font-weight: 500;
				color: inherit;
			}
		}
	}
</style>
