import { desc } from 'drizzle-orm';
import { db } from './index';
import { fixes } from './schema';

export interface LocationFix {
	id: number;
	device: string;
	lat: number;
	lon: number;
	accuracy: number | null;
	altitude: number | null;
	velocity: number | null;
	battery: number | null;
	/** unix segundos (convención OwnTracks) */
	tst: number;
	/** unix milisegundos */
	receivedAt: number;
}

/** Últimos fixes recibidos, más reciente primero — para listarlos en la PWA */
export function recentFixes(limit: number): LocationFix[] {
	return db
		.select({
			id: fixes.id,
			device: fixes.device,
			lat: fixes.lat,
			lon: fixes.lon,
			accuracy: fixes.accuracy,
			altitude: fixes.altitude,
			velocity: fixes.velocity,
			battery: fixes.battery,
			tst: fixes.tst,
			receivedAt: fixes.receivedAt
		})
		.from(fixes)
		.orderBy(desc(fixes.tst))
		.limit(limit)
		.all();
}
