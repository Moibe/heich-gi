export class WakeLockManager {
	#sentinel: WakeLockSentinel | null = null;
	#wanted = false;
	#acquiring = false;
	#onChange: (active: boolean) => void;

	// El wake lock se libera solo cuando el documento se oculta (o por batería baja /
	// ahorro de energía): hay que re-adquirirlo al volver a visible
	#onVisible = () => {
		if (document.visibilityState === 'visible' && this.#wanted) {
			void this.#acquire();
		}
	};

	constructor(onChange: (active: boolean) => void) {
		this.#onChange = onChange;
	}

	/** false en iOS < 16.4 y navegadores viejos; la app funciona igual, solo sin bloqueo de pantalla */
	static get supported(): boolean {
		return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
	}

	async enable(): Promise<void> {
		if (this.#wanted) return;
		this.#wanted = true;
		document.addEventListener('visibilitychange', this.#onVisible);
		await this.#acquire();
	}

	async disable(): Promise<void> {
		this.#wanted = false;
		document.removeEventListener('visibilitychange', this.#onVisible);
		const sentinel = this.#sentinel;
		this.#sentinel = null;
		if (sentinel) {
			await sentinel.release();
		}
		this.#onChange(false);
	}

	async #acquire(): Promise<void> {
		if (!WakeLockManager.supported || this.#sentinel || this.#acquiring) return;
		this.#acquiring = true;
		try {
			const sentinel = await navigator.wakeLock.request('screen');
			if (!this.#wanted) {
				// disable() llegó mientras el request estaba pendiente
				void sentinel.release();
				return;
			}
			sentinel.addEventListener('release', () => {
				// liberado por el sistema (documento oculto, batería baja, ahorro de energía)
				if (this.#sentinel === sentinel) {
					this.#sentinel = null;
					this.#onChange(false);
				}
			});
			this.#sentinel = sentinel;
			this.#onChange(true);
		} catch {
			// NotAllowedError: ahorro de energía, batería baja o documento no visible
			this.#onChange(false);
		} finally {
			this.#acquiring = false;
		}
	}
}
