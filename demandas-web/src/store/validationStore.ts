import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ValidationEntry } from '@/types/validation'

interface ValidationState {
  items: ValidationEntry[]
  add: (e: Omit<ValidationEntry, 'id' | 'createdAt'>) => ValidationEntry
  remove: (id: string) => void
  clear: () => void
}

export const useValidationStore = create<ValidationState>()(
  persist(
    (set) => ({
      items: [],
      add: (payload) => {
        const entry: ValidationEntry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...payload }
        set((s) => ({ items: [entry, ...s.items] }))
        return entry
      },
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'validation-v1' }
  )
)


