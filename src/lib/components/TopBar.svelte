<!-- @component
The TopBar component is, similar to normal desktop app IDEs, a bar with some global actions (e.g., save, load, export, etc.) and breadcrumbs. 
For now, we keep it simple with just some placeholder buttons for the global actions and the breadcrumbs will be added later 
when we have a better idea of the structure of our app and the different views. 
-->
<script lang="ts">
	import { activeTool, currentProject, projects } from '$lib/stores/app';
	import {
		createProject,
		getProjects,
		importProject,
		setCurrentProjectId
	} from '$lib/stores/localstorage';
	import { theme } from '$lib/stores/theme.svelte';

	let showProjectMenu = $state(false);
	let newProjectName = $state('');
	let newProjectDesc = $state('');
	let createHover = $state(false);

	function handleCreateProject() {
		if (newProjectName.trim()) {
			const proj = createProject(newProjectName);
			currentProject.set(proj);
			projects.set(getProjects());
			newProjectName = '';
			showProjectMenu = false;
		}
	}

	function handleSelectProject(id: string) {
		setCurrentProjectId(id);
		const selected = getProjects().find((p) => p.id === id);
		if (selected) {
			currentProject.set(selected);
		}
		showProjectMenu = false;
	}

	function openExport() {
		activeTool.set('export');
	}

	async function handleImport(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const text = await file.text();
		try {
			const parsed = JSON.parse(text);
			if (parsed && parsed.project) {
				importProject(parsed.project);
				projects.set(getProjects());
				const p = getProjects().find((x) => x.id === parsed.project.id);
				if (p) currentProject.set(p);
			} else if (parsed && parsed.id) {
				importProject(parsed);
				projects.set(getProjects());
				const p = getProjects().find((x) => x.id === parsed.id);
				if (p) currentProject.set(p);
			}
		} catch (err) {
			console.error('Import failed', err);
		}
		input.value = '';
	}
</script>

<div class="top-bar">
	<div class="left">
		<!-- favicon, app title: "mathgraph", project selector -->
		<img src="/favicon.png" alt="MathGraph Logo" class="logo" />
		<span class="app-title">MathGraph</span>

		<div class="project-selector">
			<button class="project-btn" on:click={() => (showProjectMenu = !showProjectMenu)}>
				{$currentProject?.name || 'No Project'} ▼
			</button>
			{#if showProjectMenu}
				<div class="project-menu">
					{#each $projects || [] as proj (proj.id)}
						<button
							class="project-item"
							class:active={proj.id === $currentProject?.id}
							on:click={() => handleSelectProject(proj.id)}
						>
							{proj.name}
						</button>
					{/each}

					<div class="project-divider"></div>

					<!-- Import / Export -->
					<div class="project-actions">
						<label class="action"
							>Import from JSON
							<input type="file" accept="application/json" on:change={(e) => handleImport(e)} />
						</label>
						<button on:click={() => openExport()} title="Open export panel"
							>Export visual JSON</button
						>
					</div>

					<div class="project-divider"></div>
					<div
						class="create-project"
						on:mouseenter={() => (createHover = true)}
						on:mouseleave={() => (createHover = false)}
					>
						{#if createHover}
							<div class="create-inline">
								<input
									type="text"
									placeholder="New project name..."
									bind:value={newProjectName}
									on:keydown={(e) => e.key === 'Enter' && handleCreateProject()}
								/>
								<input
									type="text"
									placeholder="Description (optional)"
									bind:value={newProjectDesc}
								/>
								<button on:click={handleCreateProject}>Create</button>
							</div>
						{:else}
							<button>Create new ▶</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

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
		position: relative;
		z-index: 10;

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

			.project-selector {
				position: relative;

				.project-btn {
					padding: 0.4rem 0.8rem;
					border: 1px solid var(--border-color);
					border-radius: 4px;
					cursor: pointer;
					background: var(--bg-secondary);
					color: inherit;
					font-size: 0.9rem;

					&:hover {
						background: var(--bg-primary);
					}
				}

				.project-menu {
					position: absolute;
					top: 100%;
					left: 0;
					background: var(--bg-secondary);
					border: 1px solid var(--border-color);
					border-radius: 4px;
					margin-top: 4px;
					min-width: 200px;
					max-height: 300px;
					overflow-y: auto;
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

					.project-item {
						display: block;
						width: 100%;
						padding: 0.6rem 0.8rem;
						border: none;
						background: transparent;
						text-align: left;
						cursor: pointer;
						font-size: 0.9rem;

						&:hover {
							background: var(--bg-primary);
						}

						&.active {
							background: var(--accent-color);
							color: white;
						}
					}

					.project-divider {
						height: 1px;
						background: var(--border-color);
						margin: 0.4rem 0;
					}

					.create-project {
						display: flex;
						gap: 0.4rem;
						padding: 0.6rem 0.8rem;
						border-top: 1px solid var(--border-color);

						input {
							flex: 1;
							padding: 0.4rem;
							border: 1px solid var(--border-color);
							border-radius: 3px;
							background: var(--bg-primary);
							color: inherit;
							font-size: 0.85rem;

							&:focus {
								outline: none;
								border-color: var(--accent-color);
							}
						}

						button {
							padding: 0.4rem 0.8rem;
							border: 1px solid var(--border-color);
							border-radius: 3px;
							background: var(--accent-color);
							color: white;
							cursor: pointer;
							font-size: 0.85rem;

							&:hover {
								opacity: 0.9;
							}
						}
					}
				}
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
