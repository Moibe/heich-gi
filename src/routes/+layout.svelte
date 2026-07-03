<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
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
</style>
