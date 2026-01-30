<script lang="ts">
	let isOpen = $state(false);
	let panel: HTMLDivElement;

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		isOpen = !isOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		if (isOpen && panel && !panel.contains(event.target as Node)) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<button class="help-toggle" onclick={toggle} title={isOpen ? 'Close help' : 'Quick help'}>
	{#if isOpen}
		<span class="icon">✕</span>
	{:else}
		<span class="icon">?</span>
	{/if}
</button>

<div class="help-panel" class:open={isOpen} bind:this={panel}>
	<div class="help-content">
		<h3>Quick Help</h3>
		<ul>
			<li>
				<strong>Left Click:</strong> Select/drag element. Shift+Click for multi-select.
			</li>
			<li><strong>Double Click:</strong> Open detailed info panel for element.</li>
			<li><strong>Right Click + Drag:</strong> Pan the canvas (always available).</li>
			<li><strong>Entity <kbd>E</kbd>:</strong> Right-click to create entity type (circle).</li>
			<li><strong>Fact Type <kbd>F</kbd>:</strong> Right-click to create fact type (squares).</li>
			<li><strong>Label Type <kbd>L</kbd>:</strong> Right-click to create label type (diamond).</li>
			<li><strong>Predicate <kbd>P</kbd>:</strong> Right-click source, then target to connect.</li>
			<li><strong>Delete <kbd>Del</kbd>:</strong> Delete selected elements.</li>
			<li><strong>Undo <kbd>Ctrl+Z</kbd>:</strong> Undo last action.</li>
			<li><strong>Redo <kbd>Ctrl+Y</kbd>:</strong> Redo last undone action.</li>
			<li><strong>Copy <kbd>Ctrl+C</kbd>:</strong> Copy selected elements.</li>
			<li><strong>Paste <kbd>Ctrl+V</kbd>:</strong> Paste copied elements.</li>
			<li><strong>Zoom:</strong> Scroll mouse wheel.</li>
			<li><strong>Escape <kbd>Esc</kbd>:</strong> Cancel operation or clear selection.</li>
		</ul>
	</div>
</div>

<style>
	.help-toggle {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid var(--border-color);
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		z-index: 1001;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.help-toggle:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.icon {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary-color);
		line-height: 1;
	}

	.help-panel {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--bg-secondary);
		border-top: 1px solid var(--border-color);
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease-in-out;
	}

	.help-panel.open {
		max-height: 100vh;
	}

	.help-content {
		padding: 1.5rem 2rem 5rem;
		overflow-y: auto;
		max-height: 100vh;
	}

	.help-content h3 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--text-primary);
	}

	.help-content ul {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 0.75rem;
	}

	.help-content li {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.help-content strong {
		color: var(--text-primary);
	}

	kbd {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		color: var(--primary-color);
		background-color: var(--bg-primary);
		border: 1px solid var(--primary-color);
		border-radius: 0.25rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		margin: 0 0.25rem;
	}
</style>
