import { randomUUID } from 'node:crypto'

/** Gera protocolo legível: PORTAL-YYYYMMDD-xxxxxxxx */
export function generateProtocol(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = randomUUID().slice(0, 8).toUpperCase()
  return `PORTAL-${y}${m}${day}-${rand}`
}
