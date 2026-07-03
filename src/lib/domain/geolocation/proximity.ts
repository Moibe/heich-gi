import type { GeoPoint, MarkedPoint } from './types';

/** Radio para considerar que "estás en" un punto marcado */
export const ENTER_RADIUS_M = 40;
/** Radio de salida mayor que el de entrada (histéresis): evita que el aviso
 *  parpadee cuando el GPS oscila justo en la frontera */
export const EXIT_RADIUS_M = 60;
/** Un punto recién marcado no cuenta como "ya habías estado aquí" */
export const MIN_POINT_AGE_MS = 5 * 60 * 1000;

const EARTH_RADIUS_M = 6371008.8;

/** Distancia haversine en metros */
export function distanceMeters(
	a: { lat: number; lon: number },
	b: { lat: number; lon: number }
): number {
	const rad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * rad;
	const dLon = (b.lon - a.lon) * rad;
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export interface NearbyHit {
	point: MarkedPoint;
	distance: number;
}

/**
 * Detecta reencuentros con puntos marcados: mantiene el conjunto de puntos
 * "dentro del radio" entre fixes para avisar solo al ENTRAR (no en cada fix)
 * y aplicar la histéresis de salida.
 */
export class ProximityWatcher {
	#inside = new Set<string>();

	update(
		fix: GeoPoint,
		points: MarkedPoint[],
		now: number = Date.now()
	): { entered: NearbyHit[]; nearby: NearbyHit[] } {
		const entered: NearbyHit[] = [];
		const nearby: NearbyHit[] = [];
		const stillInside = new Set<string>();

		for (const point of points) {
			if (now - point.timestamp < MIN_POINT_AGE_MS) continue;
			const distance = distanceMeters(fix, point);
			const wasInside = this.#inside.has(point.id);
			const isInside = distance <= (wasInside ? EXIT_RADIUS_M : ENTER_RADIUS_M);
			if (!isInside) continue;
			stillInside.add(point.id);
			const hit: NearbyHit = { point, distance };
			nearby.push(hit);
			if (!wasInside) entered.push(hit);
		}

		this.#inside = stillInside;
		nearby.sort((a, b) => a.distance - b.distance);
		return { entered, nearby };
	}

	reset(): void {
		this.#inside.clear();
	}
}
