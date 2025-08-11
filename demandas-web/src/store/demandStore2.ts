import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Demand, DemandId } from '@/types/demand'
import type { TimelineEvent } from '@/types/timeline'

interface DemandState2 {
  items: Demand[]
  timeline: TimelineEvent[]
  add: (d: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>) => Demand
  upsert: (d: Demand) => void
  remove: (id: DemandId) => void
  clear: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
}

export const useDemandStore2 = create<DemandState2>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      add: (payload) => {
        const now = new Date().toISOString()
        const demand: Demand = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...payload }
        set((s) => ({ items: [demand, ...s.items] }))
        set((s) => ({ timeline: [{ id: crypto.randomUUID(), demandaId: demand.id, type: 'create', timestamp: now }, ...s.timeline] }))
        return demand
      },
      upsert: (demand) => set((s) => {
        const exists = s.items.some((d) => d.id === demand.id)
        if (exists) {
          return { items: s.items.map((d) => (d.id === demand.id ? { ...demand, updatedAt: new Date().toISOString() } : d)) }
        }
        return { items: [{ ...demand, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...s.items] }
      }),
      remove: (id) => set((s) => ({ items: s.items.filter((d) => d.id !== id) })),
      clear: () => set({ items: [], timeline: [] }),
      log: (e) => set((s) => ({ timeline: [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...e }, ...s.timeline] })),
    }),
    { name: 'demands2-v1' }
  )
)


