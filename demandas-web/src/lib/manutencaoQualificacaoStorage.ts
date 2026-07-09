import {
  type ManutencaoQualificacao,
  EMPTY_MANUTENCAO_QUALIFICACAO,
  parseManutencaoQualificacao,
} from '../types/manutencaoQualificacao'

const STORAGE_KEY = 'nig-manutencao-qualificacao-v1'

function readAll(): Record<string, ManutencaoQualificacao> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, ManutencaoQualificacao> = {}
    for (const [id, value] of Object.entries(parsed)) {
      const q = parseManutencaoQualificacao(value)
      if (q) out[id] = q
    }
    return out
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, ManutencaoQualificacao>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function loadManutencaoQualificacaoLocal(manutencaoId: string): ManutencaoQualificacao {
  return readAll()[manutencaoId] ?? { ...EMPTY_MANUTENCAO_QUALIFICACAO }
}

export function saveManutencaoQualificacaoLocal(
  manutencaoId: string,
  qualificacao: ManutencaoQualificacao,
): void {
  const map = readAll()
  map[manutencaoId] = qualificacao
  writeAll(map)
}
