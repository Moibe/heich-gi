import type { MarkedPoint } from '../geolocation/types';
import { db } from './db';

/**
 * Persistencia local de los puntos marcados, sobre IndexedDB (Dexie).
 * Cuando exista backend, esto se vuelve el cache local y el PointSink
 * el canal de salida.
 */
const LEGACY_KEY = 'heich-gi:points';

// Sanear en vez de castear: una entrada corrupta (shape viejo, storage editado)
// no debe brickear la app en cada arranque — se descarta o se repara.
function sanitize(raw: unknown, seenIds: Set<string>): MarkedPoint | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const p = raw as Record<string, unknown>;
	if (
		!Number.isFinite(p.lat) ||
		!Number.isFinite(p.lon) ||
		!Number.isFinite(p.accuracy) ||
		!Number.isFinite(p.timestamp)
	) {
		return null;
	}
	let id = typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
	if (seenIds.has(id)) id = crypto.randomUUID(); // ids duplicados rompen el {#each} keyed y rename/remove
	seenIds.add(id);
	return {
		lat: p.lat as number,
		lon: p.lon as number,
		accuracy: p.accuracy as number,
		altitude: typeof p.altitude === 'number' ? p.altitude : null,
		speed: typeof p.speed === 'number' ? p.speed : null,
		heading: typeof p.heading === 'number' ? p.heading : null,
		timestamp: p.timestamp as number,
		id,
		label: typeof p.label === 'string' && p.label.trim() ? p.label : 'Punto'
	};
}

/** Importa (una sola vez) los puntos de la era localStorage a IndexedDB */
export async function migrateFromLocalStorage(): Promise<void> {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(LEGACY_KEY);
	if (!raw) return;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			const seenIds = new Set<string>();
			const migrated = parsed
				.map((item) => sanitize(item, seenIds))
				.filter((p): p is MarkedPoint => p !== null);
			await db.puntos.bulkPut(migrated);
		}
		// respaldo por si algo saliera mal; la clave viva desaparece para no re-migrar
		localStorage.setItem(`${LEGACY_KEY}:respaldo-migracion`, raw);
		localStorage.removeItem(LEGACY_KEY);
	} catch {
		// JSON corrupto: no hay nada rescatable que migrar
	}
}

export async function loadPoints(): Promise<MarkedPoint[]> {
	try {
		const rows: unknown[] = await db.puntos.orderBy('timestamp').toArray();
		const seenIds = new Set<string>();
		return rows.map((r) => sanitize(r, seenIds)).filter((p): p is MarkedPoint => p !== null);
	} catch {
		return [];
	}
}

/** @returns false si no se pudo persistir (cuota llena / modo privado) */
export async function addPoint(point: MarkedPoint): Promise<boolean> {
	try {
		await db.puntos.put({ ...point });
		return true;
	} catch {
		return false;
	}
}

export async function updatePoint(point: MarkedPoint): Promise<boolean> {
	try {
		await db.puntos.put({ ...point });
		return true;
	} catch {
		return false;
	}
}

export async function deletePoint(id: string): Promise<boolean> {
	try {
		await db.puntos.delete(id);
		return true;
	} catch {
		return false;
	}
}
