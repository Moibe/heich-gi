import type { GeoPoint } from '../geolocation/types';

/** "19.43261, -99.13321" — 5 decimales ≈ 1.1 m de resolución */
export function formatDecimal(point: GeoPoint, decimals = 5): string {
	return `${point.lat.toFixed(decimals)}, ${point.lon.toFixed(decimals)}`;
}

/** "19°25'57.4"N 99°07'59.6"O" */
export function formatDMS(point: GeoPoint): string {
	return `${toDMS(point.lat, 'N', 'S')} ${toDMS(point.lon, 'E', 'O')}`;
}

function toDMS(value: number, positive: string, negative: string): string {
	const hemisphere = value >= 0 ? positive : negative;
	// redondear a décimas de segundo ANTES de partir en grados/minutos evita `59'60.0"`
	const totalTenths = Math.round(Math.abs(value) * 36000);
	const degrees = Math.floor(totalTenths / 36000);
	const minutes = Math.floor((totalTenths % 36000) / 600);
	const seconds = (totalTenths % 600) / 10;
	return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${hemisphere}`;
}

/** "±12 m" o "±1.3 km" */
export function formatAccuracy(meters: number): string {
	if (meters >= 1000) return `±${(meters / 1000).toFixed(1)} km`;
	return `±${Math.round(meters)} m`;
}

/** m/s → "4.3 km/h"; "—" cuando el dispositivo no reporta velocidad */
export function formatSpeed(metersPerSecond: number | null): string {
	if (metersPerSecond === null || Number.isNaN(metersPerSecond)) return '—';
	return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString();
}

/** URL de Google Maps para unas coordenadas sueltas (lat/lon planos) */
export function mapsUrl(lat: number, lon: number): string {
	return `https://www.google.com/maps?q=${lat},${lon}`;
}
