import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Fixes de ubicación recibidos de OwnTracks (POST /location). Es el historial
 * "de fondo" del teléfono, independiente del tracking en vivo de la PWA.
 */
export const fixes = sqliteTable(
	'fixes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		/** de topic owntracks/<user>/<device>, p.ej. "iphone" */
		device: text('device').notNull(),
		lat: real('lat').notNull(),
		lon: real('lon').notNull(),
		/** precisión en metros (acc de OwnTracks) */
		accuracy: real('accuracy'),
		altitude: real('altitude'),
		/** km/h según OwnTracks (vel) */
		velocity: real('velocity'),
		/** % de batería al momento del fix */
		battery: integer('battery'),
		/** momento del fix según el teléfono, unix SEGUNDOS (tst de OwnTracks) */
		tst: integer('tst').notNull(),
		/** momento de llegada al server, unix MILISEGUNDOS */
		receivedAt: integer('received_at').notNull(),
		/** payload completo por si luego interesan más campos (regiones, wifi, etc.) */
		raw: text('raw').notNull()
	},
	(t) => [
		// OwnTracks re-envía fixes encolados sin conexión: (device, tst) repetido = retry
		uniqueIndex('ux_fixes_device_tst').on(t.device, t.tst),
		index('ix_fixes_tst').on(t.tst)
	]
);
