<script lang="ts">
	import { tracking } from '$lib/stores/tracking.svelte';
	import CoordsDisplay from './CoordsDisplay.svelte';
	import StatusBadge from './StatusBadge.svelte';

	function toggle() {
		if (tracking.running) {
			tracking.stop();
		} else {
			tracking.start();
		}
	}
</script>

<section class="panel">
	<div class="top">
		<StatusBadge status={tracking.status} />
		{#if tracking.wakeLockSupported}
			<span class="wakelock" class:active={tracking.wakeLockActive}>
				{tracking.wakeLockActive ? '🔆 Pantalla activa' : '🌙 Pantalla libre'}
			</span>
		{/if}
	</div>

	<CoordsDisplay point={tracking.current} />

	{#if tracking.status === 'permission-denied'}
		<p class="hint">
			Sin permiso de ubicación. En iOS instalada, el permiso se vuelve a pedir en cada sesión:
			vuelve a iniciar y acepta el aviso. Si no aparece, revisa Ajustes → Privacidad → Ubicación.
		</p>
	{/if}

	<button class="toggle" class:running={tracking.running} onclick={toggle}>
		{tracking.running ? 'Detener' : 'Iniciar tracking'}
	</button>

	<p class="count">{tracking.points.length} puntos en esta sesión</p>
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
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
		flex-wrap: wrap;
	}

	.wakelock {
		font-size: 0.8rem;
		color: var(--text-dim);
	}

	.wakelock.active {
		color: var(--warn);
	}

	.hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--warn);
		text-align: center;
	}

	.toggle {
		padding: 0.9rem 1.5rem;
		border-radius: 12px;
		border: none;
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
		color: #06131f;
		background: var(--accent);
		transition: filter 0.15s ease;
	}

	.toggle:active {
		filter: brightness(0.85);
	}

	.toggle.running {
		background: var(--error);
		color: #1f0808;
	}

	.count {
		margin: 0;
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-dim);
	}
</style>
