<script lang="ts">
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project-store';
	import type { Project } from '$lib/stores/project-store';
	import { onMount } from 'svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';

	let projects: Project[] = $state([]);
	let showNewProjectDialog = $state(false);
	let newProjectName = $state('');
	let editingProjectId: string | null = $state(null);
	let editingName = $state('');
	let isLoading = $state(true);

	onMount(() => {
		loadProjects();
		// Small delay for smooth loading experience
		setTimeout(() => {
			isLoading = false;
		}, 200);
	});

	function loadProjects() {
		projects = projectStore.getAllProjects();
	}

	function createNewProject() {
		if (newProjectName.trim()) {
			const id = projectStore.createProject(newProjectName.trim());
			newProjectName = '';
			showNewProjectDialog = false;
			loadProjects();
			goto(`/modeler/${id}`);
		}
	}

	function openProject(id: string) {
		projectStore.loadProject(id);
		goto(`/modeler/${id}`);
	}

	function deleteProject(id: string, event: Event) {
		event.stopPropagation();
		if (confirm('Are you sure you want to delete this project?')) {
			projectStore.deleteProject(id);
			loadProjects();
		}
	}

	function startRename(id: string, currentName: string, event: Event) {
		event.stopPropagation();
		editingProjectId = id;
		editingName = currentName;
	}

	function saveRename(id: string) {
		if (editingName.trim()) {
			projectStore.renameProject(id, editingName.trim());
			loadProjects();
		}
		editingProjectId = null;
		editingName = '';
	}

	function cancelRename() {
		editingProjectId = null;
		editingName = '';
	}

	function exportProjectAsJSON(project: Project, event: Event) {
		event.stopPropagation();
		const json = JSON.stringify(project, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${project.name.replace(/\s+/g, '_')}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}
</script>

<LoadingScreen {isLoading} />

<div class="projects-page">
	<div class="header">
		<a href="/" class="back-link">← Home</a>
		<h1>My Projects</h1>
		<button class="new-project-btn" onclick={() => (showNewProjectDialog = true)}>
			+ New Project
		</button>
	</div>

	{#if projects.length === 0}
		<div class="empty-state">
			<div class="icon"><i class="fas fa-folder-open"></i></div>
			<h2>No projects yet</h2>
			<p>Create your first project to get started with visual modeling</p>
			<button class="cta-btn" onclick={() => (showNewProjectDialog = true)}>
				Create Project
			</button>
		</div>
	{:else}
		<div class="projects-grid">
			{#each projects as project (project.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_autofocus -->
				<div class="project-card" onclick={() => openProject(project.id)}>
					<div class="card-header">
						{#if editingProjectId === project.id}
							<input
								type="text"
								bind:value={editingName}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => {
									if (e.key === 'Enter') saveRename(project.id);
									if (e.key === 'Escape') cancelRename();
								}}
								onblur={() => saveRename(project.id)}
								class="edit-input"
								autofocus
							/>
						{:else}
							<h3>{project.name}</h3>
						{/if}
					</div>

					<div class="card-stats">
						<div class="stat">
							<span class="stat-label">Nodes:</span>
							<span class="stat-value">{project.canvasState.nodes.size}</span>
						</div>
						<div class="stat">
							<span class="stat-label">Edges:</span>
							<span class="stat-value">{project.canvasState.edges.size}</span>
						</div>
						<div class="stat">
							<span class="stat-label">Constraints:</span>
							<span class="stat-value">{project.canvasState.constraints?.size || 0}</span>
						</div>
					</div>

					<div class="card-dates">
						<div class="date">
							<span class="date-label">Created:</span>
							<span class="date-value">{formatDate(project.createdAt)}</span>
						</div>
						<div class="date">
							<span class="date-label">Modified:</span>
							<span class="date-value">{formatDate(project.updatedAt)}</span>
						</div>
					</div>

					<div class="card-actions">
						<button
							class="action-btn"
							onclick={(e) => {
								e.stopPropagation();
								goto(`/modeler/${project.id}/export`);
							}}
							title="Export SQL"
						>
							<i class="fas fa-database"></i>
						</button>
						<button
							class="action-btn"
							onclick={(e) => startRename(project.id, project.name, e)}
							title="Rename"
						>
							<i class="fas fa-pen"></i>
						</button>
						<button
							class="action-btn"
							onclick={(e) => exportProjectAsJSON(project, e)}
							title="Export JSON"
						>
							<i class="fas fa-download"></i>
						</button>
						<button
							class="action-btn delete"
							onclick={(e) => deleteProject(project.id, e)}
							title="Delete"
						>
							<i class="fas fa-trash"></i>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showNewProjectDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_autofocus -->
	<div class="modal-overlay" onclick={() => (showNewProjectDialog = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create New Project</h2>
			<input
				type="text"
				bind:value={newProjectName}
				placeholder="Enter project name..."
				onkeydown={(e) => e.key === 'Enter' && createNewProject()}
				autofocus
			/>
			<div class="modal-actions">
				<button class="cancel-btn" onclick={() => (showNewProjectDialog = false)}> Cancel </button>
				<button class="create-btn" onclick={createNewProject} disabled={!newProjectName.trim()}>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.projects-page {
		min-height: 100vh;
		background: var(--bg-primary);
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.back-link {
		color: var(--accent-primary);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--accent-hover);
	}

	.header h1 {
		flex: 1;
		text-align: center;
		margin: 0;
	}

	.new-project-btn {
		padding: 0.75rem 1.5rem;
		background: var(--accent-primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.new-project-btn:hover {
		background: var(--accent-hover);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		max-width: 500px;
		margin: 4rem auto;
	}

	.empty-state .icon {
		font-size: 5rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h2 {
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.empty-state p {
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}

	.cta-btn {
		padding: 1rem 2rem;
		background: var(--accent-primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.cta-btn:hover {
		background: var(--accent-hover);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.project-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.project-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		border-color: var(--accent-primary);
	}

	.card-header {
		margin-bottom: 1rem;
	}

	.card-header h3 {
		margin: 0;
		color: var(--text-primary);
		font-size: 1.25rem;
	}

	.edit-input {
		width: 100%;
		padding: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		border: 2px solid var(--accent-primary);
		border-radius: 4px;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.card-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 1rem;
		background: var(--bg-primary);
		border-radius: 4px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.card-dates {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: var(--bg-primary);
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.date {
		display: flex;
		justify-content: space-between;
	}

	.date-label {
		color: var(--text-secondary);
	}

	.date-value {
		color: var(--text-primary);
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.action-btn {
		padding: 0.5rem 0.75rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.action-btn:hover {
		background: var(--accent-primary);
		border-color: var(--accent-primary);
		color: white;
		transform: scale(1.1);
	}

	.action-btn.delete:hover {
		background: #e74c3c;
		border-color: #e74c3c;
		color: white;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--bg-secondary);
		padding: 2rem;
		border-radius: 12px;
		width: 90%;
		max-width: 500px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.modal h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: var(--text-primary);
	}

	.modal input {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		border: 2px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.modal input:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.cancel-btn,
	.create-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-btn {
		background: var(--bg-primary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.cancel-btn:hover {
		background: var(--border-color);
	}

	.create-btn {
		background: var(--accent-primary);
		color: white;
	}

	.create-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.create-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
