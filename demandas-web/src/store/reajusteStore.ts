import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReajusteEntry } from '@/types/reajuste'

interface ReajusteState {
  items: ReajusteEntry[]
  add: (e: Omit<ReajusteEntry, 'id' | 'createdAt'>) => ReajusteEntry
  remove: (id: string) => void
}

export const useReajusteStore = create<ReajusteState>()(
  persist(
    (set) => ({
      items: [],
      add: (payload) => {
        const entry: ReajusteEntry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...payload }
        set((s) => ({ items: [entry, ...s.items] }))
        return entry
      },
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
    }),
    { name: 'reajuste-v1' }
  )
)


