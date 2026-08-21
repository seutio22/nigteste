/**
 * Rate limit simples em memória para login / change-password.
 * Em multi-instância, preferir Redis; isto já mitiga brute-force básico.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20

function keyOf(ip: string, email: string) {
  return `${ip}|${email}`.toLowerCase()
}

export function checkLoginRateLimit(ip: string, email: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const key = keyOf(ip || 'unknown', email || '')
  let b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count > MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }
  return { ok: true }
}

export function clearLoginRateLimit(ip: string, email: string) {
  buckets.delete(keyOf(ip || 'unknown', email || ''))
}

/** Limpa buckets expirados periodicamente (evitar leak de memória). */
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}, 60_000).unref?.()
