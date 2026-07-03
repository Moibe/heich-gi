/**
 * Compresión de fotos en el cliente antes de guardar: una foto de cámara pesa
 * 2-5 MB; re-comprimida a 1600 px queda en ~200-400 KB, con lo que caben
 * cientos en IndexedDB sin despeinarse. La miniatura evita decodificar la
 * versión grande solo para pintar la lista.
 */
const FULL_MAX_PX = 1600;
const THUMB_MAX_PX = 320;
const JPEG_QUALITY = 0.8;

export interface ProcessedPhoto {
	full: Blob;
	thumb: Blob;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
	try {
		// 'from-image' aplica la orientación EXIF (fotos de cámara vienen rotadas)
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		// fallback para navegadores sin createImageBitmap(File): <img> también
		// aplica la orientación EXIF al decodificar
		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.src = url;
			await img.decode();
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

function dimensions(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
	if (source instanceof HTMLImageElement) {
		return { w: source.naturalWidth, h: source.naturalHeight };
	}
	return { w: source.width, h: source.height };
}

function toJpeg(source: ImageBitmap | HTMLImageElement, maxPx: number): Promise<Blob> {
	const { w, h } = dimensions(source);
	const scale = Math.min(1, maxPx / Math.max(w, h));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(w * scale));
	canvas.height = Math.max(1, Math.round(h * scale));
	const ctx = canvas.getContext('2d');
	if (!ctx) return Promise.reject(new Error('canvas 2d no disponible'));
	ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('toBlob falló'))),
			'image/jpeg',
			JPEG_QUALITY
		);
	});
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
	const source = await decode(file);
	try {
		const full = await toJpeg(source, FULL_MAX_PX);
		const thumb = await toJpeg(source, THUMB_MAX_PX);
		return { full, thumb };
	} finally {
		if ('close' in source) source.close();
	}
}
