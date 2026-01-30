<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.png';
	import { theme } from '$lib/stores/theme-store';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import '../app.css';

	let { children } = $props();

	let isLoading = $state(true);

	onMount(() => {
		theme.init();
		// Small delay to ensure theme is applied
		setTimeout(() => {
			isLoading = false;
		}, 100);
	});

	let currentPath = $derived($page.url.pathname);
	let showNav = $derived(!currentPath.startsWith('/modeler/'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<LoadingScreen {isLoading} />

{#if showNav}
	<nav class="main-nav">
		<div class="nav-container">
			<a href="/" class="nav-logo">🔷 MathGraph</a>
			<div class="nav-links">
				<a href="/" class:active={currentPath === '/'}>Home</a>
				<a href="/projects" class:active={currentPath === '/projects'}>Projects</a>
				<a href="/modeler" class:active={currentPath === '/modeler'}>Modeler</a>
				<a href="/theory" class:active={currentPath === '/theory'}>Theory</a>
			</div>
		</div>
	</nav>
{/if}

<ThemeToggle />

{@render children()}

<style>
	.main-nav {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 60px;
	}

	.nav-logo {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.2s;
	}

	.nav-logo:hover {
		color: var(--accent-primary);
	}

	.nav-links {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	.nav-links a {
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.nav-links a:hover {
		color: var(--text-primary);
		background: var(--bg-primary);
	}

	.nav-links a.active {
		color: var(--accent-primary);
		background: var(--bg-primary);
	}

	@media (max-width: 768px) {
		.nav-container {
			padding: 0 1rem;
		}

		.nav-links {
			gap: 0.5rem;
		}

		.nav-links a {
			padding: 0.5rem 0.75rem;
			font-size: 0.9rem;
		}

		.nav-logo {
			font-size: 1.2rem;
		}
	}
</style>
