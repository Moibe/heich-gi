import type { GeoPoint } from '../geolocation/types';

/**
 * A dónde van los puntos capturados. Hoy: consola. Mañana: FastAPI o Firebase —
 * la UI y el tracker no cambian, solo se inyecta otro sink.
 */
export interface PointSink {
	push(point: GeoPoint): void | Promise<void>;
}

export class ConsoleSink implements PointSink {
	push(point: GeoPoint): void {
		console.debug('[heich-gi] punto', point);
	}
}
