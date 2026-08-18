export const ALERT_DELIVERY_EVENT = 'nig-alert-received'
export const ALERT_DELIVERY_PREF_EVENT = 'nig-alert-delivery-pref'
export const ALERT_DELIVERY_STORAGE_KEY = 'alert-delivery-mode'
export const ALERT_WINDOW_DURATION_KEY = 'alert-window-duration-ms'
export const ALERT_REPEAT_INTERVAL_KEY = 'alert-repeat-interval-ms'

export type AlertDeliveryMode = 'padrao' | 'som' | 'tela_cheia' | 'som_e_tela'

export const ALERT_DELIVERY_OPTIONS: { id: AlertDeliveryMode; label: string; hint: string }[] = [
  { id: 'padrao', label: 'Padrão', hint: 'Somente o sino e a lista, como hoje.' },
  { id: 'som', label: 'Com alerta sonoro', hint: 'Toca um som curto quando chegar alerta novo.' },
  { id: 'tela_cheia', label: 'Aviso em janela', hint: 'Abre uma janela na frente da tela pelo tempo configurado.' },
  { id: 'som_e_tela', label: 'Som e janela', hint: 'Som + janela, no tempo e no intervalo definidos abaixo.' },
]

/** 0 = permanece até o usuário fechar */
export const ALERT_WINDOW_DURATION_OPTIONS: { ms: number; label: string }[] = [
  { ms: 5_000, label: '5 segundos' },
  { ms: 10_000, label: '10 segundos' },
  { ms: 20_000, label: '20 segundos' },
  { ms: 30_000, label: '30 segundos' },
  { ms: 0, label: 'Até eu fechar' },
]

/** 0 = não reaparece sozinho */
export const ALERT_REPEAT_INTERVAL_OPTIONS: { ms: number; label: string }[] = [
  { ms: 0, label: 'Não repetir' },
  { ms: 60_000, label: 'A cada 1 minuto' },
  { ms: 5 * 60_000, label: 'A cada 5 minutos' },
  { ms: 15 * 60_000, label: 'A cada 15 minutos' },
  { ms: 30 * 60_000, label: 'A cada 30 minutos' },
]

export const DEFAULT_ALERT_WINDOW_DURATION_MS = 10_000
export const DEFAULT_ALERT_REPEAT_INTERVAL_MS = 5 * 60_000

export type AlertReceivedDetail = {
  id: string
  titulo: string
  mensagem: string
  prioridade?: string
}

function allowedMs(options: { ms: number }[]): number[] {
  return options.map((o) => o.ms)
}

export function parseStoredMs(raw: string | null, allowed: number[], fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  if (!allowed.includes(n)) return fallback
  return n
}

function emitPrefChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ALERT_DELIVERY_PREF_EVENT))
}

export function getAlertDeliveryMode(): AlertDeliveryMode {
  if (typeof localStorage === 'undefined') return 'padrao'
  const raw = localStorage.getItem(ALERT_DELIVERY_STORAGE_KEY)
  if (raw === 'som' || raw === 'tela_cheia' || raw === 'som_e_tela' || raw === 'padrao') return raw
  return 'padrao'
}

export function setAlertDeliveryMode(mode: AlertDeliveryMode) {
  localStorage.setItem(ALERT_DELIVERY_STORAGE_KEY, mode)
  emitPrefChange()
}

export function getAlertWindowDurationMs(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_ALERT_WINDOW_DURATION_MS
  return parseStoredMs(
    localStorage.getItem(ALERT_WINDOW_DURATION_KEY),
    allowedMs(ALERT_WINDOW_DURATION_OPTIONS),
    DEFAULT_ALERT_WINDOW_DURATION_MS
  )
}

export function setAlertWindowDurationMs(ms: number) {
  localStorage.setItem(ALERT_WINDOW_DURATION_KEY, String(ms))
  emitPrefChange()
}

export function getAlertRepeatIntervalMs(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_ALERT_REPEAT_INTERVAL_MS
  return parseStoredMs(
    localStorage.getItem(ALERT_REPEAT_INTERVAL_KEY),
    allowedMs(ALERT_REPEAT_INTERVAL_OPTIONS),
    DEFAULT_ALERT_REPEAT_INTERVAL_MS
  )
}

export function setAlertRepeatIntervalMs(ms: number) {
  localStorage.setItem(ALERT_REPEAT_INTERVAL_KEY, String(ms))
  emitPrefChange()
}

export function notificationsAreEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem('notifications-enabled')
  if (v === null) return true
  return v === 'true'
}

export function stripAlertHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html || ''
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
}

export function pickUnreadAlertForReminder(
  notifications: Array<{
    id: string
    titulo?: string
    mensagem?: string
    prioridade?: string
    lida?: boolean
    snoozedUntil?: string
  }>,
  now = new Date()
): AlertReceivedDetail | null {
  const next = notifications.find((n) => {
    if (n.lida) return false
    if (!n.titulo) return false
    if (n.snoozedUntil && new Date(n.snoozedUntil) > now) return false
    return true
  })
  if (!next?.titulo) return null
  return {
    id: next.id,
    titulo: next.titulo,
    mensagem: next.mensagem || '',
    prioridade: next.prioridade,
  }
}

export function playAlertSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => {
      void ctx.close()
    }
  } catch {
    /* autoplay bloqueado ou AudioContext indisponível */
  }
}
