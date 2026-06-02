/**
 * Origens permitidas para CORS (browser + credenciais).
 * Inclui lista fixa, FRONTEND_URL, CORS_ORIGINS e opcionalmente previews *.vercel.app.
 */

const DEFAULT_ORIGINS: string[] = [
  'https://nigteste.vercel.app',
  'https://nigdynamic.vercel.app',
  'https://nigdynamic.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]

function parseExtraOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (!raw) return []
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Lista fechada (sem wildcard) para comparação exata. */
export function getCorsStaticOrigins(): string[] {
  const set = new Set(DEFAULT_ORIGINS)
  for (const o of parseExtraOrigins()) set.add(o)
  const fe = process.env.FRONTEND_URL?.trim()
  if (fe) set.add(fe)
  return [...set]
}

/** Previews e branch deploys na Vercel (ex.: https://nigteste-xxx-team.vercel.app). */
export function isVercelPreviewOrigin(origin: string): boolean {
  const v = process.env.CORS_ALLOW_VERCEL_PREVIEWS
  if (v !== '1' && v?.toLowerCase() !== 'true') return false
  try {
    return new URL(origin).hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

export function isAllowedRequestOrigin(origin: string | undefined): origin is string {
  if (!origin) return false
  if (getCorsStaticOrigins().includes(origin)) return true
  return isVercelPreviewOrigin(origin)
}

/** Valor para o header Access-Control-Allow-Origin (espelhar origem quando permitida). */
export function resolveAccessControlAllowOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined
  if (isAllowedRequestOrigin(origin)) return origin
  return undefined
}
