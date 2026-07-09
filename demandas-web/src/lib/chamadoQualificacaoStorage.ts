import {
  type ChamadoQualificacao,
  EMPTY_CHAMADO_QUALIFICACAO,
  parseChamadoQualificacao,
} from '../types/chamadoQualificacao'

const STORAGE_KEY = 'nig-chamado-qualificacao-v1'

function readAll(): Record<string, ChamadoQualificacao> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, ChamadoQualificacao> = {}
    for (const [id, value] of Object.entries(parsed)) {
      const q = parseChamadoQualificacao(value)
      if (q) out[id] = q
    }
    return out
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, ChamadoQualificacao>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function loadChamadoQualificacaoLocal(demandId: string): ChamadoQualificacao {
  return readAll()[demandId] ?? { ...EMPTY_CHAMADO_QUALIFICACAO }
}

export function saveChamadoQualificacaoLocal(
  demandId: string,
  qualificacao: ChamadoQualificacao,
): void {
  const map = readAll()
  map[demandId] = qualificacao
  writeAll(map)
}
