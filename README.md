# heich-gi

PWA personal de tracking GPS en primer plano. SvelteKit 2 + Svelte 5 + TypeScript, `adapter-node`.

## Desarrollo

```sh
npm run dev
```

En `localhost` todo funciona (es contexto seguro): geolocalización, wake lock e instalación como PWA en Chrome/Edge de escritorio. Para probar en el teléfono se necesita HTTPS (droplet o túnel).

## Estructura

- `src/lib/domain/` — capa de dominio, TypeScript puro sin Svelte: `geolocation/` (watchPosition), `wake-lock/`, `format/` (coordenadas), `transport/` (interfaz `PointSink`, hoy consola, mañana FastAPI/Firebase).
- `src/lib/stores/tracking.svelte.ts` — puente reactivo dominio → UI (runas de Svelte 5).
- `src/lib/ui/` — componentes visuales.
- `src/app.html` — meta tags PWA/iOS (equivalente al `index.html`).
- `static/manifest.webmanifest` + `static/icons/` — instalabilidad.

## Limitaciones conocidas (por diseño de las PWAs, 2026)

- No hay geolocalización en background: teléfono bloqueado = tracking pausado (iOS y Android). El wake lock solo evita que la pantalla se apague sola.
- En iOS instalada (standalone), el permiso de ubicación se vuelve a pedir en cada sesión.
- Requiere "ubicación precisa" concedida; la imprecisa entrega fixes desplazados por kilómetros.

## Pendientes

- Splash screens iOS (`apple-touch-startup-image`, generar con `npx pwa-asset-generator`).
- Service worker (offline) — fase 2.
- Backend real para los puntos (FastAPI o Firebase) detrás de `PointSink`.

## Build

```sh
npm run build   # produce build/ (adapter-node)
node build/index.js
```
