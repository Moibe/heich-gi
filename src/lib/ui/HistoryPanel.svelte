<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { formatAccuracy, mapsUrl } from '$lib/domain/format/coordinates';
	import { formatDate } from '$lib/domain/format/dates';
	import { GOOD_ACCURACY_M } from '$lib/domain/geolocation/types';
	import type { LocationFix } from '$lib/server/db/fixes-repo';

	let { fixes }: { fixes: LocationFix[] } = $props();

	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}
</script>

<section class="panel">
	<div class="top">
		<h2>Historial de ubicación</h2>
		<button class="refresh" onclick={refresh} disabled={refreshing} title="Actualizar">
			{refreshing ? '⏳' : '🔄'}
		</button>
	</div>

	{#if fixes.length === 0}
		<p class="empty">Sin datos todavía — el receptor de OwnTracks no ha recibido ningún fix.</p>
	{:else}
		<ul class="list">
			{#each fixes as f (f.id)}
				<li class="item">
					<div class="row">
						<span class="time">{formatDate(f.tst * 1000)}</span>
						<a href={mapsUrl(f.lat, f.lon)} target="_blank" rel="noreferrer" title="Abrir en Google Maps"
							>🗺️</a
						>
					</div>
					<div class="meta">
						<span class="chip" class:good={f.accuracy !== null && f.accuracy <= GOOD_ACCURACY_M}>
							{f.accuracy !== null ? formatAccuracy(f.accuracy) : '± ?'}
						</span>
						{#if f.velocity !== null}
							<span class="chip">{Math.round(f.velocity)} km/h</span>
						{/if}
						{#if f.battery !== null}
							<span class="chip">🔋 {f.battery}%</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 16px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.refresh {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.05rem;
		padding: 0.15rem 0.4rem;
	}

	.empty {
		margin: 0;
		text-align: center;
		color: var(--text-dim);
		font-size: 0.9rem;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-height: 360px;
		overflow-y: auto;
	}

	.item {
		padding: 0.65rem 0.8rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--glass-border);
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.row a {
		text-decoration: none;
	}

	.time {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.4rem;
		flex-wrap: wrap;
	}

	.chip {
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		color: var(--text-dim);
	}

	.chip.good {
		color: var(--ok);
		border-color: color-mix(in srgb, var(--ok) 40%, transparent);
	}
</style>
