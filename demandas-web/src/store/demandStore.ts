import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Demand, DemandId } from '@/types/demand'
import type { TimelineEvent } from '@/types/timeline'

interface DemandState {
  items: Demand[]
  timeline: TimelineEvent[]
  add: (d: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>) => Demand
  upsert: (d: Demand) => void
  remove: (id: DemandId) => void
  clear: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
}

export const useDemandStore = create<DemandState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      add: (payload) => {
        function pad(num: number, size: number) {
          let s = String(num)
          while (s.length < size) s = '0' + s
          return s
        }
        function generateTicket(existing: Demand[]): string {
          const now = new Date()
          const y = now.getFullYear()
          const m = pad(now.getMonth() + 1, 2)
          const ym = `${y}${m}`
          const key = `ticket-seq-${ym}`
          let seq = 1
          try {
            const raw = localStorage.getItem(key)
            if (raw) seq = Number(raw) + 1
          } catch {}
          // garantir unicidade local
          let ticket = `DEM-${ym}-${pad(seq, 4)}`
          const has = (t: string) => existing.some((d) => (d.ticket || '').toUpperCase() === t.toUpperCase())
          while (has(ticket)) {
            seq += 1
            ticket = `DEM-${ym}-${pad(seq, 4)}`
          }
          try { localStorage.setItem(key, String(seq)) } catch {}
          return ticket
        }
        const now = new Date().toISOString()
        const ticket = payload.ticket ?? generateTicket(get().items)
        const demand: Demand = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...payload, ticket }
        set((s) => ({ items: [demand, ...s.items] }))
        // log create
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
      clear: () => set({ items: [] }),
      log: (e) => set((s) => ({ timeline: [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...e }, ...s.timeline] })),
    }),
    { name: 'demands-v1' }
  )
)


