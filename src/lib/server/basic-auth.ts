import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

// comparar hashes (largo fijo) permite timingSafeEqual aunque los strings
// midan distinto, sin filtrar la longitud de la credencial real
function digest(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

function safeEqual(a: string, b: string): boolean {
	return timingSafeEqual(digest(a), digest(b));
}

/**
 * Guardia de HTTP Basic para los endpoints de OwnTracks. Devuelve null si las
 * credenciales del request son válidas, o la Response de error a retornar.
 * Sin credenciales configuradas en el server responde 503: el receptor jamás
 * opera abierto al público.
 */
export function requireBasicAuth(request: Request): Response | null {
	const user = env.OWNTRACKS_USER;
	const pass = env.OWNTRACKS_PASS;
	if (!user || !pass) {
		return new Response('receptor sin credenciales configuradas', { status: 503 });
	}

	const header = request.headers.get('authorization') ?? '';
	const [scheme, encoded] = header.split(' ');
	let ok = false;
	if (scheme?.toLowerCase() === 'basic' && encoded) {
		try {
			const decoded = atob(encoded);
			const sep = decoded.indexOf(':');
			if (sep > 0) {
				ok = safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), pass);
			}
		} catch {
			ok = false;
		}
	}

	if (!ok) {
		return new Response('no autorizado', {
			status: 401,
			headers: { 'WWW-Authenticate': 'Basic realm="owntracks"' }
		});
	}
	return null;
}
