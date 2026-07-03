<script lang="ts">
	import MarkPanel from '$lib/ui/MarkPanel.svelte';
	import PointsList from '$lib/ui/PointsList.svelte';
	import TrackingPanel from '$lib/ui/TrackingPanel.svelte';
</script>

<svelte:head>
	<title>Coleccionador</title>
</svelte:head>

<header>
	<h1>Coleccionador</h1>
	<p>Tracking y registro de puntos del camino</p>
</header>

<div class="stack">
	<TrackingPanel />
	<MarkPanel />
	<PointsList />
</div>

<style>
	header {
		text-align: center;
		margin: 1.5rem 0 2rem;
	}

	h1 {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: 0.04em;
	}

	p {
		margin: 0.3rem 0 0;
		color: var(--text-dim);
		font-size: 0.9rem;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
</style>
