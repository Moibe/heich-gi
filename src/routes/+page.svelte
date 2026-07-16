<script lang="ts">
	import MarkPanel from '$lib/ui/MarkPanel.svelte';
	import PointsList from '$lib/ui/PointsList.svelte';
	import TrackingPanel from '$lib/ui/TrackingPanel.svelte';
</script>

<svelte:head>
	<title>heich-gi</title>
</svelte:head>

<div class="stack">
	<TrackingPanel />
	<MarkPanel />
	<PointsList />
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		margin-top: 1.5rem;
	}
</style>
