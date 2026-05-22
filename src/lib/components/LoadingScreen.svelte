<!-- @component
The LoadingScreen component is a simple full-screen overlay that is shown while the app is loading.
Anywhere in the code 

-->
<script lang="ts">
	import { isLoading } from '$lib/stores/app';
</script>

{#if $isLoading}
	<div class="loading-screen">
		<!-- spinner -->
		<svg class="spinner" viewBox="0 0 50 50">
			<circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"> </circle>
		</svg>
	</div>
{/if}

<style>
	.loading-screen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.999);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		transition: all 0.3s ease;
		.spinner {
			color: var(--accent-primary);
			animation: rotate 2s linear infinite;
			width: 50px;
			height: 50px;
		}
	}
	@keyframes rotate {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
