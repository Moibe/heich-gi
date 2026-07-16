<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	<nav class="tabs">
		<a href="/" class:active={page.url.pathname === '/'}>Inicio</a>
		<a href="/historial" class:active={page.url.pathname === '/historial'}>Historial</a>
	</nav>
	{@render children()}
</main>

<style>
	main {
		min-height: 100dvh;
		max-width: 480px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		/* black-translucent en iOS: la app se dibuja bajo la barra de estado,
		   los safe-area-insets evitan que el contenido quede debajo del notch */
		padding: calc(env(safe-area-inset-top) + 1rem) calc(env(safe-area-inset-right) + 1rem)
			calc(env(safe-area-inset-bottom) + 1rem) calc(env(safe-area-inset-left) + 1rem);
	}

	.tabs {
		display: flex;
		gap: 0.3rem;
		padding: 0.3rem;
		margin-bottom: 0.2rem;
		border-radius: 14px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
	}

	.tabs a {
		flex: 1;
		text-align: center;
		padding: 0.55rem 0.8rem;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		color: var(--text-dim);
	}

	.tabs a.active {
		background: var(--accent);
		color: #06131f;
	}
</style>
