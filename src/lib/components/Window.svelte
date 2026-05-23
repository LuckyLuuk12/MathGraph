<script lang="ts">
	/**
	 * This is mostly a state-based wrapper for all different tool "windows"/canvasses.
	 * Based on what tool is active, this might be an actual canvas to render the modeler, a user guide, a (default) landing page, or something else.
	 * The main point is to keep this component as a simple wrapper, and delegate all actual rendering and logic to the individual tool components (e.g., ModelerCanvas, TheoryGuide, etc.)
	 */
	import { Default, DSLeditor, Export, Modeler, Theory } from '$lib/components/windows';
	import type { Tool } from '$lib/types';

	let { tool }: { tool: Tool } = $props();
</script>

<div class="window">
	{#if tool === 'modeler'}
		<!-- This is the main canvas for the modeler -->
		<Modeler />
	{:else if tool === 'theory'}
		<!-- This could be a user guide or documentation page -->
		<Theory />
	{:else if tool === 'export'}
		<!-- This could be an export interface for SQL or other formats -->
		<Export />
	{:else if tool === 'dsl-editor'}
		<!-- This could be a DSL editor interface -->
		<DSLeditor />
	{:else}
		<!-- Default landing page or placeholder -->
		<Default />
	{/if}
</div>

<style>
	.window {
		flex: 1;
		min-width: 0;
		background: var(--bg-primary);
		color: var(--text-primary);
		overflow: hidden;
	}
</style>
