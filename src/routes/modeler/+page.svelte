<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import HelpToggle from '$lib/components/HelpToggle.svelte';
	import PropertiesPanel from '$lib/components/PropertiesPanel.svelte';
	import DetailPanel from '$lib/components/DetailPanel.svelte';
	import { canvasStore } from '$lib/stores/canvas-store';
</script>

<div class="modeler">
	<div class="header">
		<a href="/" class="title">
			<h1>🔷 MathGraph Visual Modeler</h1>
		</a>
		<div class="stats">
			<span>Nodes: {$canvasStore.nodes.size}</span>
			<span>Edges: {$canvasStore.edges.size}</span>
			<span>Zoom: {Math.round($canvasStore.zoom * 100)}%</span>
		</div>
	</div>

	<Toolbar />

	<div class="main-content">
		<div class="canvas-area">
			<Canvas />
		</div>

		<PropertiesPanel />
	</div>

	<HelpToggle />
	<DetailPanel />
</div>

<style>
	.modeler {
		display: grid;
		grid-template-rows: auto auto 1fr;
		height: 100vh;
		background: var(--bg-primary);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.stats {
		display: flex;
		gap: 1.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.main-content {
		display: grid;
		grid-template-columns: 1fr auto;
		overflow: hidden;
	}

	.canvas-area {
		position: relative;
		overflow: hidden;
	}
</style>
