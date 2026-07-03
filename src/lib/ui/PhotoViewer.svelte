<script lang="ts">
	import type { PhotoView } from '$lib/stores/points.svelte';

	let {
		photo,
		onclose,
		ondelete
	}: { photo: PhotoView; onclose: () => void; ondelete: () => void } = $props();

	// bloquear el scroll de la lista de atrás mientras el visor está abierto
	$effect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="overlay" role="dialog" aria-modal="true" tabindex="-1" onclick={onclose}>
	<img src={photo.fullUrl} alt="Foto del punto" />
	<div class="bar" onclick={(e) => e.stopPropagation()}>
		<button class="danger" onclick={ondelete}>🗑️ Borrar foto</button>
		<button onclick={onclose}>Cerrar</button>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		touch-action: none; /* iOS: que el swipe sobre la foto no scrollee la lista */
		background: rgba(4, 8, 16, 0.92);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: calc(env(safe-area-inset-top) + 1rem) 1rem calc(env(safe-area-inset-bottom) + 1rem);
	}

	img {
		max-width: 100%;
		max-height: 80vh;
		border-radius: 12px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
	}

	.bar {
		display: flex;
		gap: 0.7rem;
	}

	button {
		padding: 0.7rem 1.2rem;
		border-radius: 12px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		color: var(--text);
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.danger {
		color: var(--error);
	}
</style>
