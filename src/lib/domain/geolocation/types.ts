export interface GeoPoint {
	lat: number;
	lon: number;
	/** Radio de error en metros reportado por el dispositivo */
	accuracy: number;
	altitude: number | null;
	/** m/s, null si el dispositivo no lo reporta */
	speed: number | null;
	heading: number | null;
	timestamp: number;
}

/** Un punto marcado y registrado por el usuario */
export interface MarkedPoint extends GeoPoint {
	id: string;
	label: string;
}

export type TrackingStatus = 'idle' | 'acquiring' | 'tracking' | 'permission-denied' | 'unavailable';

export type CaptureStatus = 'idle' | 'acquiring' | 'permission-denied' | 'unavailable' | 'no-signal';

/**
 * Umbral para considerar un fix como preciso. GPS real ronda 5-20 m;
 * en desktop (wifi/IP) puede ser de cientos de metros o kilómetros,
 * por eso se marca la calidad en vez de descartar puntos.
 */
export const GOOD_ACCURACY_M = 50;

export function isPrecise(point: GeoPoint): boolean {
	return point.accuracy <= GOOD_ACCURACY_M;
}
