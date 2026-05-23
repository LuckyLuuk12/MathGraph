<script lang="ts">
	import { currentProject } from '$lib/stores/app';
	import { loadVisualState } from '$lib/stores/localstorage';
	import { modelerStore } from '$lib/stores/modeler.svelte';

	function downloadJson(obj: any, filename = 'mathgraph-export.json') {
		const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportCurrent() {
		if (!$currentProject) return;
		const proj = $currentProject;
		const visual = loadVisualState(proj.id) || {
			nodes: modelerStore.nodes,
			links: modelerStore.links
		};
		const payload = { project: proj, visual };
		downloadJson(payload, `${proj.name.replace(/\s+/g, '-')}-export.json`);
	}
</script>

<div class="export-panel">
	<h3>Export Project</h3>
	<p>Download JSON containing project + visual state.</p>
	<button on:click={exportCurrent} disabled={!$currentProject}>Export current project</button>
</div>
