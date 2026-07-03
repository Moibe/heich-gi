import { GeoTracker } from '$lib/domain/geolocation/tracker';
import type { GeoPoint, TrackingStatus } from '$lib/domain/geolocation/types';
import { WakeLockManager } from '$lib/domain/wake-lock/wake-lock';
import { ConsoleSink, type PointSink } from '$lib/domain/transport/point-sink';

const MAX_POINTS_IN_MEMORY = 500;

class TrackingStore {
	status = $state<TrackingStatus>('idle');
	current = $state<GeoPoint | null>(null);
	points = $state<GeoPoint[]>([]);
	wakeLockActive = $state(false);

	running = $derived(this.status === 'acquiring' || this.status === 'tracking');

	readonly wakeLockSupported = WakeLockManager.supported;

	#sink: PointSink = new ConsoleSink();

	#tracker = new GeoTracker({
		onPoint: (point) => {
			this.current = point;
			this.points.push(point);
			if (this.points.length > MAX_POINTS_IN_MEMORY) this.points.shift();
			void this.#sink.push(point);
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
	}
}

export const tracking = new TrackingStore();
