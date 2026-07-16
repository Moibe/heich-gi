<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { invalidateAll } from '$app/navigation';
	import { formatAccuracy } from '$lib/domain/format/coordinates';
	import { formatDate } from '$lib/domain/format/dates';
	import { GOOD_ACCURACY_M } from '$lib/domain/geolocation/types';
	import type { LocationFix } from '$lib/server/db/fixes-repo';

	let { fixes }: { fixes: LocationFix[] } = $props();

	// centro de respaldo (CDMX) cuando aún no hay ningún fix que enmarcar
	const FALLBACK_CENTER: L.LatLngTuple = [19.4326, -99.1332];
	const FALLBACK_ZOOM = 12;

	let container: HTMLDivElement;
	let map: L.Map | undefined;
	let markersLayer: L.LayerGroup | undefined;
	let refreshing = $state(false);

	function popupHtml(f: LocationFix): string {
		const lines = [
			`<strong>${formatDate(f.tst * 1000)}</strong>`,
			f.accuracy !== null ? formatAccuracy(f.accuracy) : '± ?',
			f.velocity !== null ? `${Math.round(f.velocity)} km/h` : null,
			f.battery !== null ? `🔋 ${f.battery}%` : null
		];
		return lines.filter(Boolean).join('<br>');
	}

	function renderMarkers(): void {
		if (!map || !markersLayer) return;
		markersLayer.clearLayers();

		const latLngs: L.LatLngTuple[] = [];
		for (const f of fixes) {
			const good = f.accuracy !== null && f.accuracy <= GOOD_ACCURACY_M;
			L.circleMarker([f.lat, f.lon], {
				radius: 6,
				weight: 2,
				color: good ? '#34d399' : '#93a4bf',
				fillColor: good ? '#34d399' : '#93a4bf',
				fillOpacity: 0.85
			})
				.bindPopup(popupHtml(f))
				.addTo(markersLayer);
			latLngs.push([f.lat, f.lon]);
		}

		if (latLngs.length > 0) {
			map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24], maxZoom: 16 });
		}
	}

	onMount(() => {
		map = L.map(container).setView(FALLBACK_CENTER, FALLBACK_ZOOM);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19
		}).addTo(map);
		markersLayer = L.layerGroup().addTo(map);
		renderMarkers();
	});

	onDestroy(() => {
		map?.remove();
	});

	// re-dibuja los marcadores cuando `fixes` cambia (p.ej. tras refrescar)
	$effect(() => {
		fixes;
		renderMarkers();
	});

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
	{/if}

	<div class="map" bind:this={container}></div>
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

	.map {
		height: 60vh;
		min-height: 320px;
		border-radius: 12px;
		overflow: hidden;
	}
</style>
