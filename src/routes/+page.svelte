<script lang="ts">
	import HistoryPanel from '$lib/ui/HistoryPanel.svelte';
	import MarkPanel from '$lib/ui/MarkPanel.svelte';
	import PointsList from '$lib/ui/PointsList.svelte';
	import TrackingPanel from '$lib/ui/TrackingPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>heich-gi</title>
</svelte:head>

<div class="stack">
	<TrackingPanel />
	<MarkPanel />
	<PointsList />
	<HistoryPanel fixes={data.fixes} />
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		margin-top: 1.5rem;
	}
</style>
