import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Puerto dedicado en dev: heich-gi es una PWA (manifest con scope "/"), y al
	// instalarse "reclama" todo el origin localhost:PUERTO. Si compartiera el 5173
	// default con otras apps Vite, su "Abrir en la app" se colaría en ellas. Con un
	// puerto propio su scope PWA queda aislado. (No afecta prod: allá es coleccionador.live.)
	server: { port: 5180, strictPort: true },
	preview: { port: 5180, strictPort: true },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node: deploy al droplet con pm2 detrás de nginx
			adapter: adapter()
		})
	]
});
