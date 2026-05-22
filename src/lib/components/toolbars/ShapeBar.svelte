<!-- @component
The ShapeBar is one of the tool-specific left sidebars that contains all the objects 
from the theory represented as shapes that can be dragged into the modeler canvas.
To facilitate this, 
 
 -->
<script lang="ts">
	import { shapeTool } from '$lib/stores/modeler.svelte';

	function select(shape: string) {
		shapeTool.selected = shape;
		shapeTool.mode = 'idle';
	}
</script>

<button on:click={() => select('circle')}>Circle</button>
<button on:click={() => select('rect')}>Rectangle</button>
