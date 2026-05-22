<!-- @component
The TopBar component is, similar to normal desktop app IDEs, a bar with some global actions (e.g., save, load, export, etc.) and breadcrumbs. 
For now, we keep it simple with just some placeholder buttons for the global actions and the breadcrumbs will be added later 
when we have a better idea of the structure of our app and the different views. 
-->
<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
</script>

<div class="top-bar">
	<div class="left">
		<!-- favicon, app title: "mathgraph", "more from me", Help -->
		<img src="/favicon.png" alt="MathGraph Logo" class="logo" />
		<span class="app-title">MathGraph</span>
		<a href="https://kablan.nl/" target="_blank" title="More from me">More from me</a>
		<a href="https://docs.mathgraph.com" target="_blank" title="Help">Help</a>
	</div>
	<div class="right">
		<!-- Light/dark mode toggle, donate url -->
		<button
			title={$theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
			on:click={() => theme.toggle()}
		>
			<i class="fas fa-{$theme === 'light' ? 'moon' : 'sun'}"></i>
		</button>
		<a href="https://luuk.kablan.nl/donate" target="_blank" title="Support My Work">
			<i class="fas fa-heart"></i>
		</a>
	</div>
</div>

<style>
	.top-bar {
		height: 2.5rem;
		width: 100%;
		display: flex;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-color);
		.left {
			display: flex;
			align-items: center;
			gap: 1rem;
			padding-left: 0.5rem;
			.logo {
				height: 1.45rem;
				width: 1.45rem;
			}
			.app-title {
				font-weight: bold;
				font-size: 1.2rem;
			}
		}
		.right {
			margin-left: auto;
			display: flex;
			align-items: center;
			gap: 1rem;
			padding-right: 0.5rem;
		}
	}
</style>
