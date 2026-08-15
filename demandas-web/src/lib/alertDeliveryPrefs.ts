export const ALERT_DELIVERY_EVENT = 'nig-alert-received'
export const ALERT_DELIVERY_PREF_EVENT = 'nig-alert-delivery-pref'
export const ALERT_DELIVERY_STORAGE_KEY = 'alert-delivery-mode'

export type AlertDeliveryMode = 'padrao' | 'som' | 'tela_cheia' | 'som_e_tela'

export const ALERT_DELIVERY_OPTIONS: { id: AlertDeliveryMode; label: string; hint: string }[] = [
  { id: 'padrao', label: 'Padrão', hint: 'Somente o sino e a lista, como hoje.' },
  { id: 'som', label: 'Com alerta sonoro', hint: 'Toca um som curto quando chegar alerta novo.' },
  { id: 'tela_cheia', label: 'Aviso em janela', hint: 'Abre uma janela na frente da tela até você fechar.' },
  { id: 'som_e_tela', label: 'Som e janela', hint: 'Som + janela de aviso.' },
]

export type AlertReceivedDetail = {
  id: string
  titulo: string
  mensagem: string
  prioridade?: string
}

export function getAlertDeliveryMode(): AlertDeliveryMode {
  if (typeof localStorage === 'undefined') return 'padrao'
  const raw = localStorage.getItem(ALERT_DELIVERY_STORAGE_KEY)
  if (raw === 'som' || raw === 'tela_cheia' || raw === 'som_e_tela' || raw === 'padrao') return raw
  return 'padrao'
}

export function setAlertDeliveryMode(mode: AlertDeliveryMode) {
  localStorage.setItem(ALERT_DELIVERY_STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent(ALERT_DELIVERY_PREF_EVENT, { detail: mode }))
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
