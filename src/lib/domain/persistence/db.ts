import Dexie, { type EntityTable } from 'dexie';
import type { MarkedPoint } from '../geolocation/types';

export interface PhotoRecord {
	id: string;
	pointId: string;
	/** JPEG re-comprimido (máx 1600 px por lado) */
	full: Blob;
	/** miniatura JPEG (máx 320 px por lado) */
	thumb: Blob;
	createdAt: number;
}

/**
 * IndexedDB vía Dexie: guarda blobs binarios nativos (fotos sin base64) y es
 * asíncrona (no bloquea el hilo de UI, a diferencia de localStorage).
 */
export const db = new Dexie('heich-gi') as Dexie & {
	puntos: EntityTable<MarkedPoint, 'id'>;
	fotos: EntityTable<PhotoRecord, 'id'>;
};

db.version(1).stores({
	// solo se indexa lo que se consulta: id (pk) y timestamp para ordenar;
	// en fotos, pointId para traer/borrar las fotos de un punto
	puntos: 'id, timestamp',
	fotos: 'id, pointId'
});
