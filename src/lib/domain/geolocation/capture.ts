import type { GeoPoint } from './types';

export type CaptureEndReason =
	| 'good-fix' // llegó un fix con precisión suficiente: se guardó solo
	| 'window-elapsed' // se acabó la ventana: se guardó el mejor fix disponible
	| 'accepted' // el usuario pulsó "Guardar ya"
	| 'cancelled'
	| 'permission-denied'
	| 'unavailable'
	| 'no-signal'; // terminó la ventana sin ningún fix

export interface CaptureCallbacks {
	/** Cada vez que mejora el mejor fix de la ventana */
	onProgress: (best: GeoPoint) => void;
	onEnd: (result: GeoPoint | null, reason: CaptureEndReason) => void;
}

/** Con esta precisión el punto se da por bueno y la captura cierra sola */
const GOOD_FIX_M = 15;
/** Ventana máxima de afinado; al cerrarse se guarda el mejor fix que haya */
const CAPTURE_WINDOW_MS = 12000;

// timeout finito: el default (Infinity) dejaría el watch colgado sin feedback
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

/**
 * Captura de UN punto con afinado de precisión: abre un watch corto, va
 * quedándose con el mejor fix, y cierra solo al lograr GOOD_FIX_M o al
 * agotarse la ventana. El primer fix del GPS en frío suele ser malo
 * (±50-100 m); tomarlo directo arruinaría "marcar ESTE punto".
 */
export class PointCapture {
	#watchId: number | null = null;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#best: GeoPoint | null = null;
	#callbacks: CaptureCallbacks;

	// Con la app oculta el usuario no ve la precisión ni puede cancelar, y los
	// callbacks de geo se pausan pero el timer no: al vencer la ventana se
	// auto-guardaría un fix pobre (>15 m, porque uno bueno ya habría cerrado).
	// Lo honesto es cancelar; al volver, el usuario marca de nuevo.
	#onVisibility = () => {
		if (document.visibilityState === 'hidden') {
			this.#settle(null, 'cancelled');
		}
	};

	constructor(callbacks: CaptureCallbacks) {
		this.#callbacks = callbacks;
	}

	get active(): boolean {
		return this.#watchId !== null;
	}

	start(): void {
		if (this.#watchId !== null) return;
		if (!('geolocation' in navigator)) {
			this.#callbacks.onEnd(null, 'unavailable');
			return;
		}
		this.#best = null;
		this.#watchId = navigator.geolocation.watchPosition(
			(pos) => this.#onFix(pos),
			(err) => this.#onError(err),
			GEO_OPTS
		);
		this.#timer = setTimeout(() => {
			this.#settle(this.#best, this.#best ? 'window-elapsed' : 'no-signal');
		}, CAPTURE_WINDOW_MS);
		document.addEventListener('visibilitychange', this.#onVisibility);
	}

	/** "Guardar ya": cierra con el mejor fix actual (null si aún no hay ninguno) */
	accept(): void {
		this.#settle(this.#best, 'accepted');
	}

	cancel(): void {
		this.#settle(null, 'cancelled');
	}

	#onFix(pos: GeolocationPosition): void {
		if (this.#watchId === null) return; // fix tardío tras settle
		const point = toPoint(pos);
		if (!this.#best || point.accuracy < this.#best.accuracy) {
			this.#best = point;
			this.#callbacks.onProgress(point);
		}
		if (point.accuracy <= GOOD_FIX_M) {
			this.#settle(this.#best, 'good-fix');
		}
	}

	#onError(err: GeolocationPositionError): void {
		if (this.#watchId === null) return;
		if (err.code === err.PERMISSION_DENIED) {
			this.#settle(null, 'permission-denied');
			return;
		}
		// POSITION_UNAVAILABLE y TIMEOUT son transitorios: el watch sigue
		// intentando y la ventana decide al final
	}

	// Único punto de salida: garantiza cierre del watch/timer y un solo onEnd
	#settle(result: GeoPoint | null, reason: CaptureEndReason): void {
		if (this.#watchId === null) return;
		navigator.geolocation.clearWatch(this.#watchId);
		this.#watchId = null;
		if (this.#timer !== null) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		document.removeEventListener('visibilitychange', this.#onVisibility);
		this.#callbacks.onEnd(result, reason);
	}
}
