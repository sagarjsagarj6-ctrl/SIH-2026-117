import { randomUUID } from 'node:crypto';

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = String(requestId).slice(0, 128);
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

export const securityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export const getClientAddress = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, name = 'api' } = {}) => {
  const window = asPositiveInteger(windowMs, 15 * 60 * 1000);
  const limit = asPositiveInteger(max, 100);
  const buckets = new Map();

  const cleanup = () => {
    const cutoff = Date.now() - window;
    for (const [key, bucket] of buckets) {
      if (bucket.startedAt <= cutoff) buckets.delete(key);
    }
  };

  return (req, res, next) => {
    const key = `${name}:${getClientAddress(req)}`;
    const now = Date.now();
    const existing = buckets.get(key);
    const bucket = existing && now - existing.startedAt < window
      ? existing
      : { startedAt: now, count: 0 };

    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));

    if (bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((window - (now - bucket.startedAt)) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Try again later.',
        requestId: req.requestId
      });
    }

    if (buckets.size > 1000) cleanup();
    next();
  };
};

export const parseAllowedOrigins = (value) => {
  const configured = String(value || '').split(',').map(origin => origin.trim()).filter(Boolean);
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return [...new Set([...defaults, ...configured])];
};

export const isAllowedOrigin = (origin, allowedOrigins) => !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
