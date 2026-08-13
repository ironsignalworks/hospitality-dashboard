/**
 * Secures server-to-server / worker calls to /api/internal/* and optional /api/sync/* triggers.
 * On hosted production deploys, requests are rejected unless secrets are configured (fail closed).
 */

/** True only on production-like deploys (not Vercel/Netlify preview unless NODE_ENV-only fallback). */
export function isProductionDeploy(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production';
  }
  const ctx = process.env.CONTEXT ?? process.env.NETLIFY_CONTEXT;
  if (ctx) {
    return ctx === 'production';
  }
  return process.env.NODE_ENV === 'production';
}

export function isAuthorizedInternalRequest(request: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    if (isProductionDeploy()) return false;
    return true;
  }
  const h = request.headers.get('authorization');
  return h === `Bearer ${secret}`;
}

export function isAuthorizedSyncTrigger(request: Request, cronSecret: string | undefined): boolean {
  if (!cronSecret) {
    if (isProductionDeploy()) return false;
    return true;
  }
  const h = request.headers.get('authorization');
  return h === `Bearer ${cronSecret}`;
}

/** CRON, Netlify, or `INTERNAL_API_SECRET` (handy for manual sync vs workers). */
export function isAuthorizedCronOrInternalRequest(request: Request): boolean {
  const cron = process.env.CRON_SECRET;
  const internal = process.env.INTERNAL_API_SECRET;
  if (!cron && !internal) {
    if (isProductionDeploy()) return false;
    return true;
  }
  const h = request.headers.get('authorization');
  if (cron && h === `Bearer ${cron}`) return true;
  if (internal && h === `Bearer ${internal}`) return true;
  return false;
}
