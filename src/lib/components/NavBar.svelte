<script lang="ts">
	import { activeTool, navigationHistory } from '$lib/stores/app';
	import type { Tool } from '$lib/types';

	/**
	 * Tool definitions with metadata for the UI.
	 * Logic aligns with the three-level architecture:
	 * - Theory: Conceptual Level (Information Structure I) [Source 5, 2.2]
	 * - Modeler: Internal Level (Tree Representation T) [Source 5, 3.2]
	 * - Export: Forward Engineering (Phi Function φ) [Source 5, 3.2.5]
	 */
	const tools: { id: Tool; label: string; icon: string }[] = [
		{ id: 'default', label: 'Home', icon: '🏠' },
		{ id: 'theory', label: 'Theory', icon: '🧠' }, // Conceptual Schema focus
		{ id: 'modeler', label: 'Modeler', icon: '📐' }, // Internal Tree focus
		{ id: 'dsl-editor', label: 'Rules', icon: '📜' }, // Custom Logic/DSL
		{ id: 'export', label: 'Export', icon: '💾' } // Phi operator output
	];

	function selectTool(id: Tool) {
		// Update navigation history before changing tool
		activeTool.update((current) => {
			if (current && current !== id) {
				navigationHistory.update((history) => [...history, current]);
			}
			return id;
		});
	}

	let collapsed = true;

	function hamburger(event: MouseEvent) {
		collapsed = !collapsed;
	}
</script>

<nav class="activity-bar">
	<div class="top-items">
		<!-- hamburger button to expand and show titles of all buttons as well -->
		<button class="tool-button" title="Menu" onclick={hamburger}>
			<span class="icon"><i class="fas fa-bars"></i></span>
			{#if !collapsed}
				<span class="label">Menu</span>
			{/if}
		</button>
		{#each tools as tool (tool.id)}
			<button
				class="tool-button"
				class:active={$activeTool === tool.id}
				onclick={() => selectTool(tool.id)}
				title={tool.label}
			>
				<span class="icon">{tool.icon}</span>
				{#if !collapsed}
					<span class="label">{tool.label}</span>
				{/if}
				{#if $activeTool === tool.id}
					<div class="active-indicator"></div>
				{/if}
				{#if $activeTool === tool.id}
					<div class="active-indicator"></div>
				{/if}
			</button>
		{/each}
	</div>

	<div class="bottom-items">
		<!-- Placeholder for Settings/Profile similar to VS Code -->
		<button class="tool-button" title="Settings">
			<span class="icon">⚙️</span>
		</button>
	</div>
</nav>

<style>
	.activity-bar {
		border-right: 1px solid var(--border-color);
		min-width: 3rem;
		height: 100%;
		background-color: var(--bg-tertiary); /* VS Code dark sidebar color */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		user-select: none;
	}

	.top-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.tool-button {
		width: 100%;
		height: 2.5rem;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		justify-content: left;
		align-items: center;
		position: relative;
		transition: opacity 0.2s;
		opacity: 0.6;
		padding: 0 0.5rem;
	}

	.tool-button:hover {
		opacity: 1;
	}

	.tool-button.active {
		opacity: 1;
	}

	.icon {
		font-size: 1.5rem;
		filter: grayscale(100%) brightness(200%); /* Make emojis look like subtle icons */
	}

	.tool-button.active .icon {
		filter: none;
	}

	.label {
		margin: 0 0.75rem;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.active-indicator {
		position: absolute;
		left: 0;
		width: 2px;
		height: 2rem;
		background-color: #ffffff;
	}

	.bottom-items {
		width: 100%;
		margin-bottom: 5px;
	}
</style>
