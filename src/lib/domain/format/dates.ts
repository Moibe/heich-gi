/** "2 jul 2026, 7:45 p.m." — según el locale del dispositivo */
export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}
