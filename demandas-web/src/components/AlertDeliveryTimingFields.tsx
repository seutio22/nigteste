import React, { useEffect, useState } from 'react'
import {
  ALERT_DELIVERY_PREF_EVENT,
  ALERT_REPEAT_INTERVAL_OPTIONS,
  ALERT_WINDOW_DURATION_OPTIONS,
  getAlertRepeatIntervalMs,
  getAlertWindowDurationMs,
  setAlertRepeatIntervalMs,
  setAlertWindowDurationMs,
  type AlertDeliveryMode,
} from '../lib/alertDeliveryPrefs'

export function AlertDeliveryTimingFields({
  mode,
  disabled = false,
}: {
  mode: AlertDeliveryMode
  disabled?: boolean
}) {
  const [durationMs, setDurationMs] = useState(() => getAlertWindowDurationMs())
  const [repeatMs, setRepeatMs] = useState(() => getAlertRepeatIntervalMs())
  const showDuration = mode === 'tela_cheia' || mode === 'som_e_tela'
  const showRepeat = mode === 'som' || mode === 'tela_cheia' || mode === 'som_e_tela'

  useEffect(() => {
    const sync = () => {
      setDurationMs(getAlertWindowDurationMs())
      setRepeatMs(getAlertRepeatIntervalMs())
    }
    window.addEventListener(ALERT_DELIVERY_PREF_EVENT, sync)
    return () => window.removeEventListener(ALERT_DELIVERY_PREF_EVENT, sync)
  }, [])

  if (!showDuration && !showRepeat) return null

  const selectClass =
    'w-full rounded-lg border border-apoio-200 bg-white px-3 py-2 text-sm text-secondary-500 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50'

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-apoio-100 bg-white p-3">
      {showDuration && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-apoio-400">Tempo do aviso na tela</span>
          <select
            className={selectClass}
            disabled={disabled}
            value={durationMs}
            onChange={(e) => {
              const next = Number(e.target.value)
              setDurationMs(next)
              setAlertWindowDurationMs(next)
            }}
          >
            {ALERT_WINDOW_DURATION_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {showRepeat && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-apoio-400">
            Repetir enquanto não for lida
          </span>
          <select
            className={selectClass}
            disabled={disabled}
            value={repeatMs}
            onChange={(e) => {
              const next = Number(e.target.value)
              setRepeatMs(next)
              setAlertRepeatIntervalMs(next)
            }}
          >
            {ALERT_REPEAT_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs leading-5 text-apoio-400">
        {mode === 'som'
          ? 'O som toca de novo no intervalo, enquanto houver alerta não lido no sino.'
          : mode === 'tela_cheia'
            ? 'A janela fecha sozinha no tempo escolhido. Se o alerta continuar não lido, ela volta no intervalo.'
            : 'A janela fecha sozinha no tempo escolhido. Se o alerta continuar não lido, som e janela voltam no intervalo.'}
      </p>
    </div>
  )
}
