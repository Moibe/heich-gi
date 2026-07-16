/** Un hueco de más de esto sin ningún fix se considera el límite entre dos viajes */
export const TRIP_GAP_SECONDS = 60 * 60;

/**
 * Agrupa fixes en "viajes": una racha nueva empieza cada vez que el hueco
 * entre dos fixes consecutivos supera `gapSeconds`. Así se separa, p.ej., el
 * regreso a casa de la ida al trabajo del día siguiente usando solo los huecos
 * de tiempo (minutos entre fixes de un mismo viaje, horas entre viajes
 * distintos) — sin asumir nada sobre la hora del día.
 *
 * Devuelve los viajes del más reciente al más antiguo; los fixes DENTRO de
 * cada viaje quedan en orden cronológico (para trazar una ruta).
 */
export function groupIntoTrips<T extends { tst: number }>(
	fixes: T[],
	gapSeconds: number = TRIP_GAP_SECONDS
): T[][] {
	if (fixes.length === 0) return [];
	const sorted = [...fixes].sort((a, b) => a.tst - b.tst);

	const trips: T[][] = [[sorted[0]]];
	for (let i = 1; i < sorted.length; i++) {
		const gap = sorted[i].tst - sorted[i - 1].tst;
		if (gap > gapSeconds) {
			trips.push([sorted[i]]);
		} else {
			trips[trips.length - 1].push(sorted[i]);
		}
	}
	return trips.reverse();
}
