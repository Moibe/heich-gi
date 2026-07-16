import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { fixes } from '$lib/server/db/schema';
import { requireBasicAuth } from '$lib/server/basic-auth';

/**
 * Receptor de OwnTracks en modo HTTP. La app manda cada fix como POST JSON
 * (_type: "location") con Basic auth, y espera de vuelta un array JSON
 * (nuestro caso: siempre vacío — el array es para features sociales de
 * OwnTracks que no usamos).
 */

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function int(v: unknown): number | null {
	const n = num(v);
	return n === null ? null : Math.trunc(n);
}

/** de "owntracks/<user>/<device>" extrae el device; tid como fallback */
function deviceOf(payload: Record<string, unknown>): string {
	if (typeof payload.topic === 'string') {
		const part = payload.topic.split('/')[2];
		if (part) return part;
	}
	if (typeof payload.tid === 'string' && payload.tid) return payload.tid;
	return 'desconocido';
}

export const POST: RequestHandler = async ({ request }) => {
	const denied = requireBasicAuth(request);
	if (denied) return denied;

	let payload: Record<string, unknown>;
	try {
		payload = await request.json();
	} catch {
		return new Response('JSON inválido', { status: 400 });
	}

	// OwnTracks también manda _type status/waypoint/transition/etc.: se aceptan
	// y se ignoran (un 4xx la dejaría reintentando ese mensaje para siempre)
	if (payload?._type !== 'location') return json([]);

	const lat = num(payload.lat);
	const lon = num(payload.lon);
	if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
		console.warn('[owntracks] location sin lat/lon válidos, ignorado', payload);
		return json([]);
	}

	db.insert(fixes)
		.values({
			device: deviceOf(payload),
			lat,
			lon,
			accuracy: num(payload.acc),
			altitude: num(payload.alt),
			velocity: num(payload.vel),
			battery: int(payload.batt),
			tst: int(payload.tst) ?? Math.floor(Date.now() / 1000),
			receivedAt: Date.now(),
			raw: JSON.stringify(payload)
		})
		// (device, tst) repetido = re-envío de la cola offline de OwnTracks
		.onConflictDoNothing()
		.run();

	return json([]);
};
