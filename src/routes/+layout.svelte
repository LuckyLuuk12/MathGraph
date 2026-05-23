<script lang="ts">
	import '../app.css';

	import BottomBar from '$lib/components/BottomBar.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import Navbar from '$lib/components/NavBar.svelte';
	import SidebarLeft from '$lib/components/SidebarLeft.svelte';
	import SidebarRight from '$lib/components/SidebarRight.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import Window from '$lib/components/Window.svelte';

	import { activeTool, initializeApp } from '$lib/stores/app';
	import { theme } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';
	/**
	 *  The main layout of the application is like an IDE:
	 * - Most left sidebar (icons only): for navigation between different views (e.g., theory, modeler, sql-export, etc.)
	 * - Left sidebar: multiple collapsible sections for different tools and settings (e.g., list existing objects, modeler palette (to drag new objects from), etc.)
	 * - Main canvas: for the modeler and other visualizations / tool contents.
	 * - Right sidebar: for properties and details of the selected object on the canvas.
	 * - Top bar: for global actions (e.g., save, load, export, etc.) and breadcrumbs.
	 * - Bottom bar: for status messages, logs, and other contextual information.
	 * We make sure to use components to keep this file minimal. (e.g. no core logic nor styling) */

	onMount(() => {
		theme.init();
		initializeApp();
	});
</script>

<LoadingScreen />
<main class="app-layout">
	<!-- Top bar for global actions and breadcrumbs -->
	<TopBar />
	<div class="main-content">
		<!-- Left sidebar for navigation between tools only icons (maybe make it expandible) -->
		<Navbar />
		<!-- Left sidebar for tool-specific content (e.g., modeler palette, object lists, etc.) -->
		<SidebarLeft />
		<!-- Main canvas for the modeler and other visualizations -->
		<Window tool={$activeTool} />
		<!-- Right sidebar for properties and details of the selected object -->
		<SidebarRight />
	</div>
	<!-- Bottom bar for status messages, logs, and contextual information -->
	<BottomBar />
</main>

<!-- minimal styling to put topbar full width at the top, same for bottom bar at bottom, and but navbar,sidebarleft window and sidebar right in that order in between-->
<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		.main-content {
			display: flex;
			flex: 1;
			overflow: hidden;
		}
	}
</style>
