import { db, type PhotoRecord } from './db';

export type { PhotoRecord };

/** @returns false si no se pudo persistir (cuota llena / modo privado) */
export async function addPhoto(record: PhotoRecord): Promise<boolean> {
	try {
		await db.fotos.put(record);
		return true;
	} catch {
		return false;
	}
}

export async function allPhotos(): Promise<PhotoRecord[]> {
	try {
		const rows = await db.fotos.toArray();
		return rows.sort((a, b) => a.createdAt - b.createdAt);
	} catch {
		return [];
	}
}

export async function deletePhoto(id: string): Promise<boolean> {
	try {
		await db.fotos.delete(id);
		return true;
	} catch {
		return false;
	}
}

export async function deletePhotosForPoint(pointId: string): Promise<boolean> {
	try {
		await db.fotos.where('pointId').equals(pointId).delete();
		return true;
	} catch {
		return false;
	}
}
