import { PointCapture, type CaptureEndReason } from '$lib/domain/geolocation/capture';
import type { CaptureStatus, GeoPoint, MarkedPoint } from '$lib/domain/geolocation/types';
import {
	addPoint,
	deletePointWithPhotos,
	loadPoints,
	migrateFromLocalStorage,
	updatePoint
} from '$lib/domain/persistence/points-repo';
import { addPhoto, allPhotos, deletePhoto } from '$lib/domain/persistence/photos-repo';
import { processPhoto } from '$lib/domain/photos/photo-processor';
import { ConsoleSink, type PointSink } from '$lib/domain/transport/point-sink';

/** Foto lista para pintar en la UI (object URLs sobre los blobs de IndexedDB) */
export interface PhotoView {
	id: string;
	pointId: string;
	thumbUrl: string;
	fullUrl: string;
	createdAt: number;
}

const CHANNEL_NAME = 'heich-gi:cambios';

class PointsStore {
	points = $state<MarkedPoint[]>([]);
	/** fotos por pointId */
	photos = $state<Record<string, PhotoView[]>>({});
	/** false hasta que migración + carga inicial terminan (evita flash de "sin puntos") */
	ready = $state(false);
	status = $state<CaptureStatus>('idle');
	/** Mejor fix de la captura en curso (para feedback en vivo) */
	best = $state<GeoPoint | null>(null);
	lastReason = $state<CaptureEndReason | null>(null);
	/** true si el último guardado local falló (cuota/modo privado) */
	persistFailed = $state(false);
	/** pointId con foto procesándose (feedback ⏳ y candado de reentrada) */
	photoBusy = $state<string | null>(null);
	/** true si la última foto no se pudo procesar o guardar */
	photoFailed = $state(false);

	capturing = $derived(this.status === 'acquiring');

	#sink: PointSink = new ConsoleSink();
	#channel: BroadcastChannel | null = null;

	// Cache de object URLs POR FOTO: las fotos que permanecen entre reloads
	// conservan su URL — nunca se revoca una URL que la UI pueda estar mostrando
	#urlCache = new Map<string, { thumbUrl: string; fullUrl: string }>();
	#reloadRunning = false;
	#reloadQueued = false;

	#capture = new PointCapture({
		onProgress: (point) => {
			this.best = point;
		},
		onEnd: (result, reason) => {
			this.lastReason = reason;
			this.best = null;
			if (result) {
				const marked: MarkedPoint = {
					...result,
					id: crypto.randomUUID(),
					label: this.#nextLabel()
				};
				this.points.push(marked); // optimista: visible al instante
				void this.#afterWrite(addPoint(marked));
				void this.#sink.push(marked);
				this.status = 'idle';
				return;
			}
			this.status =
				reason === 'permission-denied' || reason === 'unavailable' || reason === 'no-signal'
					? reason
					: 'idle';
		}
	});

	constructor() {
		if (typeof window === 'undefined') return;
		void this.#init();
		// localStorage tenía el evento 'storage' para avisar entre contextos;
		// con IndexedDB ese papel lo cumple BroadcastChannel
		if ('BroadcastChannel' in window) {
			this.#channel = new BroadcastChannel(CHANNEL_NAME);
			this.#channel.onmessage = () => void this.#reload();
		}
	}

	async #init(): Promise<void> {
		try {
			// pedir al navegador que no purgue IndexedDB por presión de espacio
			void navigator.storage?.persist?.();
			await migrateFromLocalStorage();
			await this.#reload();
		} catch {
			// arranque degradado: mejor lista vacía que pantalla en blanco eterna
		} finally {
			this.ready = true;
		}
	}

	/** Coalescido: reloads solapados se funden en uno (sin fugas de URLs) */
	async #reload(): Promise<void> {
		if (this.#reloadRunning) {
			this.#reloadQueued = true;
			return;
		}
		this.#reloadRunning = true;
		try {
			do {
				this.#reloadQueued = false;
				await this.#reloadOnce();
			} while (this.#reloadQueued);
		} finally {
			this.#reloadRunning = false;
		}
	}

	async #reloadOnce(): Promise<void> {
		const points = await loadPoints();
		const pointIds = new Set(points.map((p) => p.id));
		const records = await allPhotos();

		// red de seguridad: una foto cuyo punto ya no existe es un huérfano
		// (p.ej. borrado interrumpido en otra sesión) — se limpia de la base
		for (const rec of records) {
			if (!pointIds.has(rec.pointId)) void deletePhoto(rec.id);
		}
		const valid = records.filter((rec) => pointIds.has(rec.pointId));

		const keep = new Set(valid.map((rec) => rec.id));
		for (const [id, urls] of this.#urlCache) {
			if (!keep.has(id)) {
				URL.revokeObjectURL(urls.thumbUrl);
				URL.revokeObjectURL(urls.fullUrl);
				this.#urlCache.delete(id);
			}
		}

		const map: Record<string, PhotoView[]> = {};
		for (const rec of valid) {
			let urls = this.#urlCache.get(rec.id);
			if (!urls) {
				urls = {
					thumbUrl: URL.createObjectURL(rec.thumb),
					fullUrl: URL.createObjectURL(rec.full)
				};
				this.#urlCache.set(rec.id, urls);
			}
			(map[rec.pointId] ??= []).push({
				id: rec.id,
				pointId: rec.pointId,
				thumbUrl: urls.thumbUrl,
				fullUrl: urls.fullUrl,
				createdAt: rec.createdAt
			});
		}

		this.points = points;
		this.photos = map;
	}

	/** Tras cada escritura: registrar éxito/fallo, reconciliar la UI con la base
	 *  (por si un reload de otro contexto pisó la mutación optimista) y avisar */
	async #afterWrite(write: Promise<boolean>): Promise<void> {
		const ok = await write;
		this.persistFailed = !ok;
		await this.#reload();
		if (ok) this.#channel?.postMessage('cambio');
	}

	mark(): void {
		if (this.#capture.active) return;
		this.status = 'acquiring';
		this.lastReason = null;
		this.#capture.start();
	}

	acceptNow(): void {
		this.#capture.accept();
	}

	cancelCapture(): void {
		this.#capture.cancel();
	}

	remove(id: string): void {
		this.points = this.points.filter((p) => p.id !== id); // optimista
		void this.#afterWrite(deletePointWithPhotos(id));
	}

	rename(id: string, label: string): void {
		const point = this.points.find((p) => p.id === id);
		if (!point) return;
		point.label = label.trim() || point.label;
		void this.#afterWrite(updatePoint({ ...point }));
	}

	async addPhotoToPoint(pointId: string, file: File): Promise<void> {
		if (this.photoBusy !== null) return;
		this.photoBusy = pointId;
		this.photoFailed = false;
		try {
			const { full, thumb } = await processPhoto(file);
			// el punto pudo borrarse mientras se procesaba: no crear un huérfano
			if (!this.points.some((p) => p.id === pointId)) return;
			const record = { id: crypto.randomUUID(), pointId, full, thumb, createdAt: Date.now() };
			const ok = await addPhoto(record);
			this.photoFailed = !ok;
			await this.#afterWrite(Promise.resolve(ok));
		} catch (err) {
			console.warn('[heich-gi] foto no procesada', err);
			this.photoFailed = true;
		} finally {
			this.photoBusy = null;
		}
	}

	async removePhoto(view: PhotoView): Promise<void> {
		await this.#afterWrite(deletePhoto(view.id));
	}

	// "Punto N" con N = 1 + el mayor existente: no colisiona tras borrar puntos
	#nextLabel(): string {
		let max = 0;
		for (const p of this.points) {
			const m = /^Punto (\d+)$/.exec(p.label);
			if (m) max = Math.max(max, Number(m[1]));
		}
		return `Punto ${max + 1}`;
	}
}

export const points = new PointsStore();
