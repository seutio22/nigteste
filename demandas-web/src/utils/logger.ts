/** Utilitário de log — informações sensíveis só em desenvolvimento. */
export const isDev = import.meta.env.DEV

export function logDev(...args: unknown[]): void {
  if (isDev) console.log(...args)
}

export function logWarnDev(...args: unknown[]): void {
  if (isDev) console.warn(...args)
}

/** Erros reais permanecem visíveis em produção (sem dados sensíveis no texto). */
export function logError(...args: unknown[]): void {
  console.error(...args)
}
