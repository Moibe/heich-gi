<script lang="ts">
	import { formatAccuracy, formatDecimal } from '$lib/domain/format/coordinates';
	import { points } from '$lib/stores/points.svelte';
	import StatusBadge from './StatusBadge.svelte';
</script>

<section class="panel">
	<div class="top">
		{#if points.status === 'idle'}
			<span class="title">📍 Puntos del camino</span>
		{:else}
			<StatusBadge status={points.status} />
		{/if}
		<span class="count">{points.points.length} puntos</span>
	</div>

	{#if points.capturing}
		<div class="live">
			{#if points.best}
				<p class="coords">{formatDecimal(points.best)}</p>
				<p class="accuracy">precisión {formatAccuracy(points.best.accuracy)}</p>
			{:else}
				<p class="coords dim">buscando señal…</p>
				<p class="accuracy">apunta al cielo despejado si tarda</p>
			{/if}
		</div>
		<div class="actions">
			<button class="secondary" onclick={() => points.cancelCapture()}>Cancelar</button>
			<button class="primary" disabled={!points.best} onclick={() => points.acceptNow()}>
				{points.best ? `Guardar ya (${formatAccuracy(points.best.accuracy)})` : 'Guardar ya'}
			</button>
		</div>
	{:else}
		<button class="mark" onclick={() => points.mark()}>Marcar Punto</button>

		{#if points.persistFailed}
			<p class="hint">
				⚠️ No se pudo guardar en el dispositivo (almacenamiento lleno o modo privado): los puntos
				nuevos solo viven en esta sesión.
			</p>
		{/if}

		{#if points.status === 'permission-denied'}
			<p class="hint">
				Sin permiso de ubicación. En iOS instalada, el permiso se vuelve a pedir en cada sesión:
				marca de nuevo y acepta el aviso (con "Ubicación exacta" activada).
			</p>
		{:else if points.status === 'no-signal'}
			<p class="hint">No llegó ningún fix de GPS. Intenta de nuevo, de preferencia a cielo abierto.</p>
		{:else if points.status === 'unavailable'}
			<p class="hint">Este navegador no expone geolocalización.</p>
		{/if}
	{/if}
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.3rem;
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
		gap: 0.5rem;
	}

	.title {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.count {
		font-size: 0.8rem;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.mark {
		padding: 1.1rem 1.5rem;
		border-radius: 14px;
		border: none;
		font-size: 1.15rem;
		font-weight: 700;
		cursor: pointer;
		color: #06131f;
		background: var(--accent);
		transition: filter 0.15s ease;
	}

	.mark:active {
		filter: brightness(0.85);
	}

	.live {
		text-align: center;
	}

	.coords {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.coords.dim {
		color: var(--text-dim);
	}

	.accuracy {
		margin: 0.3rem 0 0;
		color: var(--text-dim);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		gap: 0.7rem;
	}

	.actions button {
		flex: 1;
		padding: 0.85rem 1rem;
		border-radius: 12px;
		border: none;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}

	.primary {
		background: var(--ok);
		color: #04150d;
	}

	.primary:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.secondary {
		background: var(--glass-bg);
		border: 1px solid var(--glass-border) !important;
		color: var(--text);
	}

	.hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--warn);
		text-align: center;
	}
</style>
