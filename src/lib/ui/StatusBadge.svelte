<script lang="ts">
	import type { TrackingStatus } from '$lib/domain/geolocation/types';

	let { status }: { status: TrackingStatus } = $props();

	const LABELS: Record<TrackingStatus, string> = {
		idle: 'Inactivo',
		acquiring: 'Buscando señal…',
		tracking: 'Rastreando',
		'permission-denied': 'Permiso denegado',
		unavailable: 'GPS no disponible'
	};
</script>

<span class="badge {status}">
	<span class="dot"></span>
	{LABELS[status]}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		font-size: 0.85rem;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--text-dim);
	}

	.acquiring .dot {
		background: var(--warn);
		animation: pulse 1.2s ease-in-out infinite;
	}

	.tracking .dot {
		background: var(--ok);
		animation: pulse 1.6s ease-in-out infinite;
	}

	.permission-denied .dot,
	.unavailable .dot {
		background: var(--error);
	}

	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
</style>
