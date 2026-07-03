# heich-gi

PWA personal de GPS con dos modos: **tracking en vivo** (seguimiento continuo en primer plano con wake lock) y **marcar puntos específicos del camino y registrarlos**. Durante el tracking, la app detecta **reencuentros**: al acercarte (≤40 m) a un punto marcado antes, avisa "Ya habías estado aquí: lo marcaste el día tal" (con histéresis de salida a 60 m para no parpadear, aviso solo al entrar, y vibración en Android). Vive en https://coleccionador.live. SvelteKit 2 + Svelte 5 + TypeScript, `adapter-node`.

## Cómo funciona el marcado

"Marcar Punto" no toma el primer fix del GPS (en frío suele venir con ±50-100 m de error): abre una ventana de afinado de ~12 s que se queda con el mejor fix y guarda automáticamente al lograr ±15 m — con "Guardar ya" y "Cancelar" para no esperar. Cada punto se puede renombrar, borrar, abrir en Google Maps y **tomarle fotos** (📷 abre la cámara nativa; la foto se comprime en cliente a ~1600 px + miniatura de 320 px).

## Persistencia local

Puntos y fotos viven en **IndexedDB** (vía Dexie): asíncrona (no bloquea la UI), guarda blobs binarios nativos y tiene cuota generosa (~1,000 fotos ≈ 300 MB). Sobreviven cierres de la app y deploys; se pierden solo al desinstalar la PWA. Los puntos de la era localStorage se migran automáticamente al primer arranque (con respaldo en `heich-gi:points:respaldo-migracion`). Cambios entre contextos del mismo origin se sincronizan por BroadcastChannel.

## Desarrollo

```sh
npm run dev
```

En `localhost` todo funciona (contexto seguro). En desktop la precisión es de WiFi/IP (pobre); para GPS real, el teléfono con la app instalada.

## Estructura

- `src/lib/domain/` — capa de dominio, TypeScript puro sin Svelte:
  - `geolocation/tracker.ts` — tracking continuo (`watchPosition`)
  - `geolocation/capture.ts` — captura de UN punto con afinado de precisión
  - `geolocation/proximity.ts` — reencuentros: haversine + radios con histéresis
  - `wake-lock/wake-lock.ts` — pantalla despierta durante el tracking
  - `persistence/db.ts` + `points-repo.ts` + `photos-repo.ts` — IndexedDB (Dexie): puntos y fotos
  - `photos/photo-processor.ts` — compresión de fotos en cliente (canvas → JPEG)
  - `format/coordinates.ts` — formateo (decimal, DMS, precisión)
  - `transport/point-sink.ts` — interfaz `PointSink`: hoy consola, mañana los endpoints de SvelteKit (opción B)
- `src/lib/stores/` — puentes reactivos dominio → UI (runas): `tracking.svelte.ts` y `points.svelte.ts`
- `src/lib/ui/` — componentes visuales (TrackingPanel, MarkPanel, PointsList, PhotoViewer, CoordsDisplay, StatusBadge)
- `src/app.html` — meta tags PWA/iOS · `static/manifest.webmanifest` — instalabilidad

## Limitaciones conocidas (por diseño de las PWAs, 2026)

- En iOS instalada (standalone), el permiso de ubicación se vuelve a pedir en cada sesión.
- Requiere "ubicación precisa" concedida; la imprecisa entrega fixes desplazados por kilómetros.

## Deploy

Push a `main` → GitHub Action → droplet (pm2 `heich-gi`, puerto 3300, nginx + Certbot). Runbook completo en `DEPLOY.md`.

## Pendientes

- Splash screens iOS (`apple-touch-startup-image`, generar con `npx pwa-asset-generator`).
- Service worker (offline) — fase 2.
- Backend real para los puntos (FastAPI o Firebase) detrás de `PointSink`.
