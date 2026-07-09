/** Executa callback após first paint / idle — não bloqueia digitação na abertura. */
export function runWhenIdle(fn: () => void, timeoutMs = 2000): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: timeoutMs })
    return
  }
  setTimeout(fn, 0)
}
