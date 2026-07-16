import type { PageServerLoad } from './$types';
import { recentFixes } from '$lib/server/db/fixes-repo';

const HISTORY_LIMIT = 150;

export const load: PageServerLoad = () => {
	return { fixes: recentFixes(HISTORY_LIMIT) };
};
