<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project-store';
	import { canvasStore } from '$lib/stores/canvas-store';
	import Canvas from '$lib/components/Canvas.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import HelpToggle from '$lib/components/HelpToggle.svelte';
	import PropertiesPanel from '$lib/components/PropertiesPanel.svelte';
	import DetailPanel from '$lib/components/DetailPanel.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import type { Project } from '$lib/stores/project-store';

	let projectId: string = '';
	let project: Project | null = null;
	let projectName = $state('');
	let autoSaveInterval: number;
	let isLoading = $state(true);

	onMount(() => {
		projectId = $page.params.id || '';
		if (projectId) {
			loadProject();
		} else {
			goto('/projects');
		}

		// Auto-save every 2 seconds
		autoSaveInterval = window.setInterval(() => {
			if (project) {
				projectStore.updateProject(projectId, $canvasStore);
			}
		}, 2000);
	});

	onDestroy(() => {
		// Save before leaving
		if (project) {
			projectStore.updateProject(projectId, $canvasStore);
		}
		if (autoSaveInterval) {
			clearInterval(autoSaveInterval);
		}
	});

	function loadProject() {
		isLoading = true;
		try {
			// Get all projects and find the one with matching ID
			const allProjects = projectStore.getAllProjects();
			project = allProjects.find((p) => p.id === projectId) || null;

			if (project) {
				projectName = project.name;
				// Load the project's canvas state
				canvasStore.loadState(project.canvasState);
				// Mark canvas as loaded after a brief delay
				setTimeout(() => {
					isLoading = false;
				}, 150);
			} else {
				// Project not found, redirect to projects page
				isLoading = false;
				goto('/projects');
			}
		} catch (error) {
			console.error('Failed to load project:', error);
			isLoading = false;
			goto('/projects');
		}
	}

	function saveAndExit() {
		if (project) {
			projectStore.updateProject(projectId, $canvasStore);
		}
		goto('/projects');
	}
</script>

<LoadingScreen {isLoading} />

<div class="modeler">
	<div class="header">
		<button class="back-btn" onclick={saveAndExit}> ← Back to Projects </button>
		<div class="title">
			<h1>🔷 {projectName}</h1>
		</div>
		<button class="export-btn" onclick={() => goto(`/modeler/${projectId}/export`)}>
			🗄️ Export SQL
		</button>
		<div class="stats">
			<span>Nodes: {$canvasStore.nodes.size}</span>
			<span>Edges: {$canvasStore.edges.size}</span>
			<span>Zoom: {Math.round($canvasStore.zoom * 100)}%</span>
			<span class="auto-save">💾 Auto-saving...</span>
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
		gap: 1rem;
	}

	.back-btn {
		padding: 0.5rem 1rem;
		background: var(--bg-primary);
		color: var(--accent-primary);
		border: 1px solid var(--accent-primary);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.back-btn:hover {
		background: var(--accent-primary);
		color: white;
	}

	.export-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--accent-primary);
		border: 1px solid var(--accent-primary);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.export-btn:hover {
		background: var(--accent-primary);
		color: white;
	}

	.title {
		flex: 1;
		text-align: center;
	}

	.title h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.stats {
		display: flex;
		gap: 1.5rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.auto-save {
		color: var(--accent-primary);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	.main-content {
		display: grid;
		grid-template-columns: 1fr auto;
		overflow: hidden;
		height: 100%;
	}

	.canvas-area {
		position: relative;
		overflow: hidden;
	}

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			gap: 0.5rem;
		}

		.stats {
			flex-direction: column;
			gap: 0.25rem;
			font-size: 0.8rem;
		}

		.title h1 {
			font-size: 1.2rem;
		}
	}
</style>
