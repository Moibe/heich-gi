<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { invalidateAll } from '$app/navigation';
	import { formatAccuracy } from '$lib/domain/format/coordinates';
	import { formatDate } from '$lib/domain/format/dates';
	import { GOOD_ACCURACY_M } from '$lib/domain/geolocation/types';
	import { groupIntoTrips } from '$lib/domain/geolocation/trips';
	import type { LocationFix } from '$lib/server/db/fixes-repo';

	let { fixes }: { fixes: LocationFix[] } = $props();

	// centro de respaldo (CDMX) cuando aún no hay ningún fix que enmarcar
	const FALLBACK_CENTER: L.LatLngTuple = [19.4326, -99.1332];
	const FALLBACK_ZOOM = 12;

	let container: HTMLDivElement;
	let map: L.Map | undefined;
	let markersLayer: L.LayerGroup | undefined;
	let refreshing = $state(false);
	let selectedTripIndex = $state(0);

	// viajes del más reciente al más antiguo; separados por huecos >60min sin fixes
	const trips = $derived(groupIntoTrips(fixes));
	const selectedTrip = $derived(
		trips[Math.min(selectedTripIndex, Math.max(trips.length - 1, 0))] ?? []
	);

	function popupHtml(f: LocationFix): string {
		const lines = [
			`<strong>${formatDate(f.tst * 1000)}</strong>`,
			f.accuracy !== null ? formatAccuracy(f.accuracy) : '± ?',
			f.velocity !== null ? `${Math.round(f.velocity)} km/h` : null,
			f.battery !== null ? `🔋 ${f.battery}%` : null
		];
		return lines.filter(Boolean).join('<br>');
	}

	function renderTrip(): void {
		if (!map || !markersLayer) return;
		markersLayer.clearLayers();

		const latLngs: L.LatLngTuple[] = selectedTrip.map((f) => [f.lat, f.lon]);

		// la línea va primero para que los puntos queden encima, no debajo
		if (latLngs.length > 1) {
			L.polyline(latLngs, { color: '#38bdf8', weight: 3, opacity: 0.7 }).addTo(markersLayer);
		}

		for (const f of selectedTrip) {
			const good = f.accuracy !== null && f.accuracy <= GOOD_ACCURACY_M;
			L.circleMarker([f.lat, f.lon], {
				radius: 6,
				weight: 2,
				color: good ? '#facc15' : '#ef4444',
				fillColor: good ? '#facc15' : '#ef4444',
				fillOpacity: 0.85
			})
				.bindPopup(popupHtml(f))
				.addTo(markersLayer);
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
		renderTrip();
	});

	onDestroy(() => {
		map?.remove();
	});

	// re-dibuja al cambiar de viaje seleccionado o al refrescar los datos
	$effect(() => {
		selectedTrip;
		renderTrip();
	});

	async function refresh() {
		refreshing = true;
		selectedTripIndex = 0; // tras refrescar, mostrar el viaje más reciente
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
		<select class="trip-select" bind:value={selectedTripIndex}>
			{#each trips as trip, i}
				<option value={i}>{formatDate(trip[0].tst * 1000)}</option>
			{/each}
		</select>
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

	.trip-select {
		padding: 0.55rem 0.7rem;
		border-radius: 10px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		color: var(--text);
		font-size: 0.9rem;
	}

	.map {
		height: 60vh;
		min-height: 320px;
		border-radius: 12px;
		overflow: hidden;
	}
</style>
