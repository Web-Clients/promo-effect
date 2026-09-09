/**
 * Where the per-role sessions are stored.
 *
 * Kept out of auth.setup.ts because Playwright refuses to let one test file
 * import another.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ADMIN_STATE = path.join(here, '.auth/admin.json');
export const AGENT_STATE = path.join(here, '.auth/agent.json');
