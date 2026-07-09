import { useCallback, useEffect, useRef, useState } from 'react'
import { registerPlacementFlush, ensurePlacementBeforeUnloadFlush } from './placementFlushRegistry'

const DEFAULT_COMMIT_MS = 400

type UsePlacementFieldDraftOptions = {
  commitDelayMs?: number
  commitOnBlur?: boolean
}

/**
 * Mantém valor local enquanto digita; commit debounced evita re-render do form inteiro a cada tecla.
 */
export function usePlacementFieldDraft(
  externalValue: string,
  onCommit: (value: string) => void,
  options?: UsePlacementFieldDraftOptions
) {
  const commitDelayMs = options?.commitDelayMs ?? DEFAULT_COMMIT_MS
  const commitOnBlur = options?.commitOnBlur ?? true
  const [localValue, setLocalValue] = useState(externalValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusedRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const localRef = useRef(localValue)
  localRef.current = localValue
  const externalRef = useRef(externalValue)
  externalRef.current = externalValue

  useEffect(() => {
    if (focusedRef.current) return
    if (timerRef.current) return
    if (externalValue !== localRef.current) {
      setLocalValue(externalValue)
    }
  }, [externalValue])

  const flushCommit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const v = localRef.current
    if (v !== externalRef.current) {
      onCommitRef.current(v)
    }
  }, [])

  const scheduleCommit = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flushCommit, commitDelayMs)
  }, [commitDelayMs, flushCommit])

  const onChange = useCallback(
    (value: string) => {
      setLocalValue(value)
      localRef.current = value
      scheduleCommit()
    },
    [scheduleCommit]
  )

  const onFocus = useCallback(() => {
    focusedRef.current = true
  }, [])

  const onBlur = useCallback(() => {
    focusedRef.current = false
    if (commitOnBlur) flushCommit()
  }, [commitOnBlur, flushCommit])

  useEffect(() => {
    ensurePlacementBeforeUnloadFlush()
    return registerPlacementFlush(flushCommit)
  }, [flushCommit])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      flushCommit()
    },
    [flushCommit]
  )

  return { value: localValue, onChange, onFocus, onBlur, flushCommit }
}

/** Chave estável para evitar PUT redundante (só no momento do save). */
export function kickOffStableKey(kickOff: unknown): string {
  try {
    return JSON.stringify(kickOff)
  } catch {
    return String(kickOff)
  }
}
