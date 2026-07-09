import { createKickOffItem, type KickOffEstrategiaItem } from './placementKickOffEstrategia'

export type EstrategiaTextTool = 'bullet' | 'number' | 'dash'

export function estrategiaTextRows(
  text: string,
  opts?: { min?: number; max?: number; charsPerLine?: number }
): number {
  const min = opts?.min ?? 2
  const max = opts?.max ?? 12
  const charsPerLine = opts?.charsPerLine ?? 46
  if (!text.trim()) return min
  const byNewline = text.split('\n').length
  const byWrap = Math.ceil(text.length / charsPerLine)
  return Math.min(max, Math.max(min, byNewline, byWrap))
}

export function moveEstrategiaItem(
  itens: KickOffEstrategiaItem[],
  itemId: string,
  direction: -1 | 1
): KickOffEstrategiaItem[] {
  const idx = itens.findIndex((i) => i.id === itemId)
  if (idx < 0) return itens
  const next = idx + direction
  if (next < 0 || next >= itens.length) return itens
  const copy = [...itens]
  ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
  return copy
}

export function duplicateEstrategiaItem(
  itens: KickOffEstrategiaItem[],
  itemId: string
): KickOffEstrategiaItem[] {
  const idx = itens.findIndex((i) => i.id === itemId)
  if (idx < 0) return itens
  const src = itens[idx]
  const dup = createKickOffItem(src.rotulo, src.valor)
  const copy = [...itens]
  copy.splice(idx + 1, 0, dup)
  return copy
}

export function appendEstrategiaTextTool(current: string, tool: EstrategiaTextTool): string {
  const line =
    tool === 'bullet' ? '• ' : tool === 'number' ? '1. ' : '— '
  const trimmed = current.trimEnd()
  if (!trimmed) return line
  if (trimmed.endsWith('\n')) return `${trimmed}${line}`
  return `${trimmed}\n${line}`
}

export function formatAberturaValorParaEstrategia(valor: string): string {
  const v = String(valor ?? '').trim()
  if (!v || v === '—') return ''
  return v.replace(/ · /g, '\n')
}
