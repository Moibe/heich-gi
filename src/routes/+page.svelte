<script lang="ts">
	import TrackingPanel from '$lib/ui/TrackingPanel.svelte';
</script>

<svelte:head>
	<title>Heich GI</title>
</svelte:head>

<header>
	<h1>Heich GI</h1>
	<p>Tracker GPS · Fase 1</p>
</header>

<TrackingPanel />

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
</style>
