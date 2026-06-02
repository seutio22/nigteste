import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
  type ComunicarMercadoState,
} from './placementComunicarMercado'
import type { Operadora } from '../../../types/masterData'
import type { KickOffEstrategia } from './placementKickOffEstrategia'

export type AguardandoOperadoraFornecedorState = {
  dataRetornoEfetiva: string
  retornoRecebido: boolean
  comissaoAgenciamento: string
  comissaoVitalicio: string
  observacoes: string
}

export type AguardandoOperadoraState = {
  fornecedores: Record<string, AguardandoOperadoraFornecedorState>
}

function normKey(nome: string): string {
  return nome.trim().toLowerCase()
}

export function emptyAguardandoOperadoraFornecedor(
  form: CotacaoFormState
): AguardandoOperadoraFornecedorState {
  const fin = form.dadosFinanceiros?.estudo
  return {
    dataRetornoEfetiva: '',
    retornoRecebido: false,
    comissaoAgenciamento: fin?.comissaoAgenciamento?.trim() ?? '',
    comissaoVitalicio: fin?.comissaoVitalicio?.trim() ?? '',
    observacoes: '',
  }
}

export function ensureAguardandoOperadoraState(
  current: AguardandoOperadoraState | null | undefined,
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  comunicarMercado?: ComunicarMercadoState | null
): AguardandoOperadoraState {
  const nomes = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  const comunicar =
    comunicarMercado ??
    ensureComunicarMercadoState(
      parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
      form,
      operadoras,
      operadorasById
    )

  const fornecedores: Record<string, AguardandoOperadoraFornecedorState> = {
    ...(current?.fornecedores ?? {}),
  }

  for (const nome of nomes) {
    const key = normKey(nome)
    const fromComunicar = comunicar.fornecedores[key]
    const legacyRetorno = fromComunicar?.dataRetornoEfetiva?.trim() ?? ''

    if (!fornecedores[key]) {
      fornecedores[key] = {
        ...emptyAguardandoOperadoraFornecedor(form),
        dataRetornoEfetiva: legacyRetorno,
        retornoRecebido: !!legacyRetorno,
      }
    } else if (!fornecedores[key].dataRetornoEfetiva && legacyRetorno) {
      fornecedores[key] = {
        ...fornecedores[key],
        dataRetornoEfetiva: legacyRetorno,
        retornoRecebido: fornecedores[key].retornoRecebido || !!legacyRetorno,
      }
    }
  }

  return { fornecedores }
}

export function parseAguardandoOperadoraFromKickOff(
  estrategia: KickOffEstrategia | null | undefined
): AguardandoOperadoraState | null {
  const raw = (estrategia as { aguardandoOperadora?: unknown } | null | undefined)?.aguardandoOperadora
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const fornRaw = o.fornecedores
  const fornecedores: Record<string, AguardandoOperadoraFornecedorState> = {}
  if (fornRaw && typeof fornRaw === 'object' && !Array.isArray(fornRaw)) {
    for (const [key, val] of Object.entries(fornRaw as Record<string, unknown>)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue
      const f = val as Record<string, unknown>
      fornecedores[key] = {
        dataRetornoEfetiva: String(f.dataRetornoEfetiva ?? ''),
        retornoRecebido: f.retornoRecebido === true,
        comissaoAgenciamento: String(f.comissaoAgenciamento ?? ''),
        comissaoVitalicio: String(f.comissaoVitalicio ?? ''),
        observacoes: String(f.observacoes ?? ''),
      }
    }
  }
  return { fornecedores }
}

export function aguardandoOperadoraIsComplete(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): boolean {
  const nomes = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  if (!nomes.length) return false
  const state = ensureAguardandoOperadoraState(
    parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
    form,
    operadoras,
    operadorasById
  )
  return nomes.every((nome) => state.fornecedores[normKey(nome)]?.retornoRecebido === true)
}
