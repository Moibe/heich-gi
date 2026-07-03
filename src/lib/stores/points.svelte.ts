import { PointCapture, type CaptureEndReason } from '$lib/domain/geolocation/capture';
import type { CaptureStatus, GeoPoint, MarkedPoint } from '$lib/domain/geolocation/types';
import {
	addPoint,
	deletePoint,
	loadPoints,
	migrateFromLocalStorage,
	updatePoint
} from '$lib/domain/persistence/points-repo';
import {
	addPhoto,
	allPhotos,
	deletePhoto,
	deletePhotosForPoint
} from '$lib/domain/persistence/photos-repo';
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

	capturing = $derived(this.status === 'acquiring');

	#sink: PointSink = new ConsoleSink();
	#channel: BroadcastChannel | null = null;

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
				this.points.push(marked);
				void addPoint(marked).then((ok) => {
					this.persistFailed = !ok;
					if (ok) this.#notify();
				});
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
		// pedir al navegador que no purgue IndexedDB por presión de espacio
		void navigator.storage?.persist?.();
		await migrateFromLocalStorage();
		await this.#reload();
		this.ready = true;
	}

	async #reload(): Promise<void> {
		this.points = await loadPoints();
		for (const list of Object.values(this.photos)) {
			for (const f of list) {
				URL.revokeObjectURL(f.thumbUrl);
				URL.revokeObjectURL(f.fullUrl);
			}
		}
		const map: Record<string, PhotoView[]> = {};
		for (const rec of await allPhotos()) {
			(map[rec.pointId] ??= []).push({
				id: rec.id,
				pointId: rec.pointId,
				thumbUrl: URL.createObjectURL(rec.thumb),
				fullUrl: URL.createObjectURL(rec.full),
				createdAt: rec.createdAt
			});
		}
		this.photos = map;
	}

	#notify(): void {
		this.#channel?.postMessage('cambio');
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
		this.points = this.points.filter((p) => p.id !== id);
		for (const f of this.photos[id] ?? []) {
			URL.revokeObjectURL(f.thumbUrl);
			URL.revokeObjectURL(f.fullUrl);
		}
		delete this.photos[id];
		void deletePoint(id).then((ok) => {
			this.persistFailed = !ok;
			if (ok) this.#notify();
		});
		void deletePhotosForPoint(id);
	}

	rename(id: string, label: string): void {
		const point = this.points.find((p) => p.id === id);
		if (!point) return;
		point.label = label.trim() || point.label;
		void updatePoint({ ...point }).then((ok) => {
			this.persistFailed = !ok;
			if (ok) this.#notify();
		});
	}

	async addPhotoToPoint(pointId: string, file: File): Promise<void> {
		if (this.photoBusy !== null) return;
		this.photoBusy = pointId;
		try {
			const { full, thumb } = await processPhoto(file);
			const record = { id: crypto.randomUUID(), pointId, full, thumb, createdAt: Date.now() };
			const ok = await addPhoto(record);
			this.persistFailed = !ok;
			if (ok) {
				const view: PhotoView = {
					id: record.id,
					pointId,
					thumbUrl: URL.createObjectURL(thumb),
					fullUrl: URL.createObjectURL(full),
					createdAt: record.createdAt
				};
				this.photos[pointId] = [...(this.photos[pointId] ?? []), view];
				this.#notify();
			}
		} catch {
			// foto indecodificable: no romper la UI
		} finally {
			this.photoBusy = null;
		}
	}

	async removePhoto(view: PhotoView): Promise<void> {
		const ok = await deletePhoto(view.id);
		if (!ok) return;
		URL.revokeObjectURL(view.thumbUrl);
		URL.revokeObjectURL(view.fullUrl);
		this.photos[view.pointId] = (this.photos[view.pointId] ?? []).filter((f) => f.id !== view.id);
		this.#notify();
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
