<script lang="ts">
	import type { LinkKind } from '$lib/modeler/graph';
	import { linkTool } from '$lib/stores/modeler.svelte';

	function setLinkMode(mode: LinkKind | 'OFF') {
		linkTool.set({ mode, sourceId: null });
	}
</script>

<div class="modeler-help">
	<div class="title">Connections</div>
	<div class="note">
		Normal edge: fact/objectified fact -> non-fact object. Specialization/generalization: object ->
		object.
	</div>
	<div class="row">
		<button
			type="button"
			onclick={() => setLinkMode('PREDICATOR_LINE')}
			class:active={$linkTool.mode === 'PREDICATOR_LINE'}
		>
			Normal Edge
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('SPECIALIZATION_ARROW')}
			class:active={$linkTool.mode === 'SPECIALIZATION_ARROW'}
		>
			Specialization
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('GENERALIZATION_ARROW')}
			class:active={$linkTool.mode === 'GENERALIZATION_ARROW'}
		>
			Generalization
		</button>
		<button
			type="button"
			onclick={() => setLinkMode('OFF')}
			class:active={$linkTool.mode === 'OFF'}
		>
			Off
		</button>
	</div>

	<div class="title">Shortcuts</div>
	<ul>
		<li>1 = normal edge mode</li>
		<li>2 = specialization mode</li>
		<li>3 = generalization mode</li>
		<li>Esc = clear link/shape mode</li>
		<li>Wheel = zoom, middle/right drag = pan</li>
		<li>Delete/Backspace on node = delete node</li>
	</ul>

	<div class="note">Connection flow: pick mode -> click source -> click target.</div>
</div>

<style>
	.modeler-help {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem 1rem 1rem;
		color: var(--text-primary);

		.title {
			font-size: 0.84rem;
			font-weight: 700;
			color: var(--text-secondary);
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;

			button {
				padding: 0.3rem 0.55rem;
				border: 1px solid var(--border-color);
				border-radius: 7px;
				background: var(--bg-primary);
				color: var(--text-primary);
				cursor: pointer;
				font-size: 0.78rem;

				&.active {
					background: var(--primary-color);
					color: white;
					border-color: var(--primary-color);
				}
			}
		}

		ul {
			padding-left: 1rem;
			display: grid;
			gap: 0.32rem;
			font-size: 0.83rem;
			color: var(--text-secondary);
		}

		.note {
			padding: 0.6rem;
			border-radius: 8px;
			background: color-mix(in oklab, var(--bg-primary) 88%, black 12%);
			font-size: 0.82rem;
			color: var(--text-secondary);
		}
	}
</style>
