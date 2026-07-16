import { json } from '@sveltejs/kit';
import { and, desc, eq, gte } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { fixes } from '$lib/server/db/schema';
import { requireBasicAuth } from '$lib/server/basic-auth';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 2000;

/**
 * Historial de fixes recibidos, más reciente primero. Mismas credenciales que
 * el receptor. Query params: ?limit=200&since=<unix segundos>&device=<id>
 */
export const GET: RequestHandler = async ({ request, url }) => {
	const denied = requireBasicAuth(request);
	if (denied) return denied;

	const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
	const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
	const since = Number(url.searchParams.get('since')) || 0;
	const device = url.searchParams.get('device');

	const conditions = [];
	if (since > 0) conditions.push(gte(fixes.tst, since));
	if (device) conditions.push(eq(fixes.device, device));

	const rows = db
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
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(fixes.tst))
		.limit(limit)
		.all();

	return json({ count: rows.length, fixes: rows });
};
