<script lang="ts">
	import type { GeoPoint } from '$lib/domain/geolocation/types';
	import { isPrecise } from '$lib/domain/geolocation/types';
	import {
		formatAccuracy,
		formatDMS,
		formatDecimal,
		formatSpeed,
		formatTime
	} from '$lib/domain/format/coordinates';

	let { point }: { point: GeoPoint | null } = $props();
</script>

{#if point}
	<div class="coords">
		<p class="decimal">{formatDecimal(point)}</p>
		<p class="dms">{formatDMS(point)}</p>
		<div class="meta">
			<span class="chip" class:good={isPrecise(point)}>{formatAccuracy(point.accuracy)}</span>
			<span class="chip">{formatSpeed(point.speed)}</span>
			<span class="chip">{formatTime(point.timestamp)}</span>
		</div>
	</div>
{:else}
	<div class="coords empty">
		<p class="decimal">— , —</p>
		<p class="dms">Sin posición todavía</p>
	</div>
{/if}

<style>
	.coords {
		text-align: center;
	}

	.decimal {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}

	.dms {
		margin: 0.3rem 0 0;
		color: var(--text-dim);
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.empty .decimal {
		color: var(--text-dim);
	}

	.meta {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.9rem;
		flex-wrap: wrap;
	}

	.chip {
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		font-size: 0.8rem;
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
