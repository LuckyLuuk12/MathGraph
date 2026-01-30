<script lang="ts">
	import { theme } from '$lib/stores/theme-store';

	function toggleTheme() {
		theme.toggle();
	}
</script>

<button class="theme-toggle" onclick={toggleTheme} title="Toggle theme">
	{#if $theme === 'dark'}
		<span class="icon" style="color: var(--sun-color);"><i class="fas fa-sun"></i></span>
	{:else}
		<span class="icon" style="color: var(--moon-color);"><i class="fas fa-moon"></i></span>
	{/if}
</button>

<style>
	.theme-toggle {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		width: 3rem;
		height: 3rem;
		padding: 0.5rem;
		border-radius: 50%;
		border: 2px solid var(--border-color);
		background: var(--bg-primary);
		display: flex;
		/* align-items: center; */
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		z-index: 1000;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		/* Sun & Moon color variables: */
		--sun-color: #f39c12;
		--moon-color: #f1c40f;
	}

	.theme-toggle:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.icon {
		font-size: 1.25rem;
	}
</style>
