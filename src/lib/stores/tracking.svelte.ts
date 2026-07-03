import { GeoTracker } from '$lib/domain/geolocation/tracker';
import { EXIT_RADIUS_M, ProximityWatcher, type NearbyHit } from '$lib/domain/geolocation/proximity';
import type { GeoPoint, TrackingStatus } from '$lib/domain/geolocation/types';
import { WakeLockManager } from '$lib/domain/wake-lock/wake-lock';
import { ConsoleSink, type PointSink } from '$lib/domain/transport/point-sink';
import { points as markedPoints } from './points.svelte';

const MAX_POINTS_IN_MEMORY = 500;

class TrackingStore {
	status = $state<TrackingStatus>('idle');
	current = $state<GeoPoint | null>(null);
	points = $state<GeoPoint[]>([]);
	wakeLockActive = $state(false);
	/** Puntos marcados previamente dentro del radio de encuentro, más cercano primero */
	#nearby = $state<NearbyHit[]>([]);
	nearby = $derived(
		this.#nearby.filter((h) => markedPoints.points.some((p) => p.id === h.point.id))
	);

	running = $derived(this.status === 'acquiring' || this.status === 'tracking');

	readonly wakeLockSupported = WakeLockManager.supported;

	#sink: PointSink = new ConsoleSink();
	#proximity = new ProximityWatcher();

	#tracker = new GeoTracker({
		onPoint: (point) => {
			this.current = point;
			this.points.push(point);
			if (this.points.length > MAX_POINTS_IN_MEMORY) this.points.shift();
			void this.#sink.push(point);

			if (point.accuracy <= EXIT_RADIUS_M) {
				const { entered, nearby } = this.#proximity.update(point, markedPoints.points);
				this.#nearby = nearby;
				if (entered.length > 0) {
					navigator.vibrate?.(200); // Android; iOS lo ignora y queda el aviso visual
				}
			}
		},
		onStatus: (status) => {
			this.status = status;
			// el tracking murió sin pasar por stop(): no dejar la pantalla despierta
			if (status === 'permission-denied' || status === 'unavailable') {
				void this.#wakeLock.disable();
			}
		}
	});

	#wakeLock = new WakeLockManager((active) => {
		this.wakeLockActive = active;
	});

	start(): void {
		this.#tracker.start();
		void this.#wakeLock.enable();
	}

	stop(): void {
		this.#tracker.stop();
		void this.#wakeLock.disable();
		// al reiniciar el tracking, los reencuentros vuelven a avisar
		this.#proximity.reset();
		this.#nearby = [];
	}
}

export const tracking = new TrackingStore();
