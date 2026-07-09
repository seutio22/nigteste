import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runWhenIdle } from './placementDeferIdle'

describe('runWhenIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('usa requestIdleCallback quando disponível', () => {
    const fn = vi.fn()
    const idle = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
    })
    vi.stubGlobal('window', { requestIdleCallback: idle })

    runWhenIdle(fn)
    expect(fn).toHaveBeenCalledOnce()
    expect(idle).toHaveBeenCalledOnce()
  })

  it('cai em setTimeout quando requestIdleCallback não existe', () => {
    vi.stubGlobal('window', {})
    const fn = vi.fn()

    runWhenIdle(fn)
    expect(fn).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(fn).toHaveBeenCalledOnce()
  })
})
