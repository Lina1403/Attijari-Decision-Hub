// In-memory rate limiter. Kept permissive by default for local demo work.
const store = new Map();
const MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 50);
const WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 1000);

export const rateLimiter = {
  check(ip) {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > WINDOW_MS) return;

    if (entry.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((entry.windowStart + WINDOW_MS - now) / 60_000);
      const err = new Error(
        `Trop de tentatives de connexion. Réessayez dans ${remaining} minute(s).`,
      );
      err.code = 'RATE_LIMITED';
      err.statusCode = 429;
      throw err;
    }
  },

  record(ip) {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
      store.set(ip, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
    }
  },

  reset(ip) {
    store.delete(ip);
  },
};
