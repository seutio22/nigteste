import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../lib/api.local'
import type { CotacaoFormState } from './CotacaoFormFields'
import { mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'
import { kickOffStableKey } from './usePlacementFieldDraft'
import { registerPlacementPendingSaveFlush } from './placementFlushRegistry'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type Options = {
  cotacaoId: string | undefined
  onPersisted?: (apiCotacao: unknown) => void
  debounceMs?: number
}

/** Autosave centralizado de kickOffEstrategia com debounce e skip de PUT redundante. */
export function usePlacementKickOffAutosave({
  cotacaoId,
  onPersisted,
  debounceMs = 700,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedKeyRef = useRef('')
  const saveSeqRef = useRef(0)
  const pendingKickOffRef = useRef<NonNullable<CotacaoFormState['kickOffEstrategia']> | null>(null)
  const onPersistedRef = useRef(onPersisted)
  onPersistedRef.current = onPersisted
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const flushSave = useCallback(
    async (kickOff: NonNullable<CotacaoFormState['kickOffEstrategia']>) => {
      if (!cotacaoId) return
      const saveKey = kickOffStableKey(kickOff)
      if (saveKey === lastSavedKeyRef.current) {
        setSaveState('saved')
        return
      }
      const seq = ++saveSeqRef.current
      setSaveState('saving')
      try {
        const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, {
          kickOffEstrategia: kickOff,
        })
        if (seq !== saveSeqRef.current) return
        lastSavedKeyRef.current = saveKey
        onPersistedRef.current?.(mergeSavedKickOffIntoApiCotacao(updated, kickOff))
        setSaveState('saved')
      } catch {
        if (seq === saveSeqRef.current) setSaveState('error')
      }
    },
    [cotacaoId]
  )

  const scheduleSave = useCallback(
    (kickOff: NonNullable<CotacaoFormState['kickOffEstrategia']>, immediate?: boolean) => {
      pendingKickOffRef.current = kickOff
      if (timerRef.current) clearTimeout(timerRef.current)
      if (immediate) {
        void flushSave(kickOff)
        return
      }
      timerRef.current = setTimeout(() => {
        const latest = pendingKickOffRef.current
        if (latest) void flushSave(latest)
      }, debounceMs)
    },
    [debounceMs, flushSave]
  )

  const flushPendingSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const kickOff = pendingKickOffRef.current
    if (kickOff) await flushSave(kickOff)
  }, [flushSave])

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      cancelPendingSave()
    },
    [cancelPendingSave]
  )

  useEffect(() => registerPlacementPendingSaveFlush(flushPendingSave), [flushPendingSave])

  return { saveState, scheduleSave, flushSave, flushPendingSave, cancelPendingSave }
}
