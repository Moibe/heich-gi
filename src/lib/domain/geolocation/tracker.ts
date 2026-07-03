import type { GeoPoint, TrackingStatus } from './types';

export interface TrackerCallbacks {
	onPoint: (point: GeoPoint) => void;
	onStatus: (status: TrackingStatus) => void;
}

// timeout finito: el default (Infinity) deja el watch colgado sin feedback si el GPS no responde
const GEO_OPTS: PositionOptions = {
	enableHighAccuracy: true,
	maximumAge: 0,
	timeout: 15000
};

function toPoint(pos: GeolocationPosition): GeoPoint {
	const c = pos.coords;
	return {
		lat: c.latitude,
		lon: c.longitude,
		accuracy: c.accuracy,
		altitude: c.altitude,
		speed: c.speed,
		heading: c.heading,
		timestamp: pos.timestamp
	};
}

export class GeoTracker {
	#watchId: number | null = null;
	#callbacks: TrackerCallbacks;

	// Chrome Android pausa los callbacks de geolocalización en background por diseño:
	// al volver a visible se fuerza un fix fresco en vez de esperar al siguiente del watch
	#onVisible = () => {
		if (document.visibilityState === 'visible' && this.#watchId !== null) {
			navigator.geolocation.getCurrentPosition(
				(pos) => this.#emit(pos),
				() => {},
				GEO_OPTS
			);
		}
	};

	constructor(callbacks: TrackerCallbacks) {
		this.#callbacks = callbacks;
	}

	get active(): boolean {
		return this.#watchId !== null;
	}

	start(): void {
		if (this.#watchId !== null) return;
		if (!('geolocation' in navigator)) {
			this.#callbacks.onStatus('unavailable');
			return;
		}
		this.#callbacks.onStatus('acquiring');
		this.#watchId = navigator.geolocation.watchPosition(
			(pos) => this.#emit(pos),
			(err) => this.#handleError(err),
			GEO_OPTS
		);
		document.addEventListener('visibilitychange', this.#onVisible);
	}

	stop(): void {
		if (this.#watchId === null) return;
		navigator.geolocation.clearWatch(this.#watchId);
		this.#watchId = null;
		document.removeEventListener('visibilitychange', this.#onVisible);
		this.#callbacks.onStatus('idle');
	}

	#emit(pos: GeolocationPosition): void {
		// un getCurrentPosition tardío (visibilitychange) puede resolver después de stop()
		if (this.#watchId === null) return;
		this.#callbacks.onStatus('tracking');
		this.#callbacks.onPoint(toPoint(pos));
	}

	#handleError(err: GeolocationPositionError): void {
		if (err.code === err.PERMISSION_DENIED) {
			// En iOS standalone el permiso se re-pregunta por sesión: estado esperado, no excepcional
			this.stop();
			this.#callbacks.onStatus('permission-denied');
			return;
		}
		// POSITION_UNAVAILABLE y TIMEOUT son transitorios: el watch sigue vivo, no hacer clearWatch
		this.#callbacks.onStatus('acquiring');
	}
}
