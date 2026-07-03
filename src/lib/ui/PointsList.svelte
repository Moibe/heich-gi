<script lang="ts">
	import { isPrecise } from '$lib/domain/geolocation/types';
	import { formatAccuracy, formatDecimal, formatTime } from '$lib/domain/format/coordinates';
	import { points, type PhotoView } from '$lib/stores/points.svelte';
	import PhotoViewer from './PhotoViewer.svelte';

	let viewing = $state<PhotoView | null>(null);

	function mapsUrl(lat: number, lon: number): string {
		return `https://www.google.com/maps?q=${lat},${lon}`;
	}

	function onPickPhoto(pointId: string, e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // permitir re-elegir el mismo archivo después
		if (file) void points.addPhotoToPoint(pointId, file);
	}
</script>

{#if points.ready}
	{#if points.photoFailed}
		<p class="photo-error">⚠️ La última foto no se pudo procesar o guardar — intenta de nuevo.</p>
	{/if}
	{#if points.points.length === 0}
		<p class="empty">Aún no hay puntos — marca el primero. 📍</p>
	{:else}
		<ul class="list">
			{#each [...points.points].reverse() as p (p.id)}
				<li class="item">
					<div class="row">
						<input
							class="label"
							value={p.label}
							onchange={(e) => {
								const el = e.currentTarget as HTMLInputElement;
								points.rename(p.id, el.value);
								// si rename rechazó el valor (p.ej. vacío), p.label no cambia y
								// Svelte no re-sincroniza el DOM: hacerlo a mano
								el.value = p.label;
							}}
						/>
						<div class="item-actions">
							<a href={mapsUrl(p.lat, p.lon)} target="_blank" rel="noreferrer" title="Abrir en Google Maps">🗺️</a>
							<button title="Borrar punto" onclick={() => points.remove(p.id)}>🗑️</button>
						</div>
					</div>
					<div class="meta">
						<span class="coords">{formatDecimal(p)}</span>
						<span class="chip" class:good={isPrecise(p)}>{formatAccuracy(p.accuracy)}</span>
						<span class="time">{formatTime(p.timestamp)}</span>
					</div>
					<div class="fotos">
						{#each points.photos[p.id] ?? [] as f (f.id)}
							<button class="thumb" onclick={() => (viewing = f)} title="Ver foto">
								<img src={f.thumbUrl} alt="Foto de {p.label}" />
							</button>
						{/each}
						<label
							class="add-photo"
							class:off={points.photoBusy !== null && points.photoBusy !== p.id}
							title="Tomar foto para este punto"
						>
							<span>{points.photoBusy === p.id ? '⏳' : '📷'}</span>
							<input
								type="file"
								accept="image/*"
								capture="environment"
								disabled={points.photoBusy !== null}
								onchange={(e) => onPickPhoto(p.id, e)}
							/>
						</label>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if viewing}
	<PhotoViewer
		photo={viewing}
		onclose={() => (viewing = null)}
		ondelete={() => {
			const v = viewing;
			viewing = null;
			if (v) void points.removePhoto(v);
		}}
	/>
{/if}

<style>
	.empty {
		text-align: center;
		color: var(--text-dim);
		margin: 2rem 0;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.item {
		padding: 0.9rem 1rem;
		border-radius: 14px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.label {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		color: var(--text);
		font-size: 1rem;
		font-weight: 600;
		padding: 0.15rem 0.25rem;
		border-radius: 6px;
	}

	.label:focus {
		outline: 1px solid var(--accent);
		background: rgba(255, 255, 255, 0.04);
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.item-actions a,
	.item-actions button {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.05rem;
		text-decoration: none;
		padding: 0.15rem;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.45rem;
		flex-wrap: wrap;
	}

	.coords {
		font-size: 0.85rem;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
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

	.time {
		font-size: 0.75rem;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.fotos {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
		flex-wrap: wrap;
	}

	.thumb {
		padding: 0;
		border: 1px solid var(--glass-border);
		border-radius: 10px;
		overflow: hidden;
		background: none;
		cursor: pointer;
		line-height: 0;
	}

	.thumb img {
		width: 56px;
		height: 56px;
		object-fit: cover;
		display: block;
	}

	.add-photo {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px dashed var(--glass-border);
		border-radius: 10px;
		font-size: 1.3rem;
		cursor: pointer;
	}

	.add-photo input {
		display: none;
	}

	.add-photo.off {
		opacity: 0.4;
		cursor: default;
	}

	.photo-error {
		margin: 0 0 0.7rem;
		font-size: 0.85rem;
		color: var(--warn);
		text-align: center;
	}
</style>
