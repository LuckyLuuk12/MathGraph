<!-- @component
This component is a wrapper and picks the appropriate toolbar based on the activeTool from the components/toolbars module
-->
<script lang="ts">
	import { activeTool } from '$lib/stores/app';
	import ShapeBar from './toolbars/ShapeBar.svelte';
</script>

<div class="sidebar-left">
	{#if $activeTool === 'modeler'}
		<ShapeBar />
	{/if}
</div>

<style>
	.sidebar-left {
		width: 15rem;
		background-color: var(--bg-secondary);
		padding: 0.5rem;
		border-right: 1px solid var(--border-color);
	}
</style>
