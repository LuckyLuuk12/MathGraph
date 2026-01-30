<script lang="ts">
	import { onMount } from 'svelte';

	let { isLoading = $bindable(true) } = $props();

	let show = $state(true);
	let fadeOut = $state(false);

	// Safety timeout - force hide after 10 seconds if still loading
	onMount(() => {
		const timeout = setTimeout(() => {
			if (show) {
				console.warn('Loading screen timeout - forcing hide');
				fadeOut = true;
				setTimeout(() => {
					show = false;
				}, 300);
			}
		}, 10000);

		return () => clearTimeout(timeout);
	});

	// Watch for loading state changes
	$effect(() => {
		if (!isLoading && show) {
			// Start fade out
			fadeOut = true;
			// Remove from DOM after transition
			setTimeout(() => {
				show = false;
			}, 300); // Match transition duration
		}
	});
</script>

{#if show}
	<div class="loading-screen" class:fade-out={fadeOut}>
		<div class="loading-spinner">
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
		</div>
	</div>
{/if}

<style>
	.loading-screen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: #000000;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		opacity: 1;
		transition: opacity 0.3s ease-out;
	}

	.loading-screen.fade-out {
		opacity: 0;
		pointer-events: none;
	}

	.loading-spinner {
		position: relative;
		width: 80px;
		height: 80px;
		animation: rotate 1.2s linear infinite;
	}

	.dot {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #3b82f6;
		top: 50%;
		left: 50%;
		margin: -7px 0 0 -7px;
	}

	.dot:nth-child(1) {
		transform: translateY(-33px);
		opacity: 1;
	}

	.dot:nth-child(2) {
		transform: rotate(45deg) translateY(-33px);
		opacity: 0.875;
	}

	.dot:nth-child(3) {
		transform: rotate(90deg) translateY(-33px);
		opacity: 0.75;
	}

	.dot:nth-child(4) {
		transform: rotate(135deg) translateY(-33px);
		opacity: 0.625;
	}

	.dot:nth-child(5) {
		transform: rotate(180deg) translateY(-33px);
		opacity: 0.5;
	}

	.dot:nth-child(6) {
		transform: rotate(225deg) translateY(-33px);
		opacity: 0.375;
	}

	.dot:nth-child(7) {
		transform: rotate(270deg) translateY(-33px);
		opacity: 0.25;
	}

	.dot:nth-child(8) {
		transform: rotate(315deg) translateY(-33px);
		opacity: 0.125;
	}

	@keyframes rotate {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
