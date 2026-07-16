<script lang="ts">
	import HistoryPanel from '$lib/ui/HistoryPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>heich-gi · Historial</title>
</svelte:head>

<div class="stack">
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
