import type { CotacaoFormState } from './CotacaoFormFields'
import { mercadoFornecedoresFromForm } from './placementComunicarMercado'
import { resolveOperadoraNome } from './placementKickOffFormatters'
import type { Operadora } from '../../../types/masterData'
import type {
  AguardandoOperadoraState,
  MercadoFornecedorClassificacao,
  QuadroMercadoVisibilidade,
} from './placementAguardandoOperadora'

export type MercadoQuadroBuckets = {
  fornecedorAtual: string[]
  mercadoConsultado: string[]
  foraPerfilDeclinado: string[]
  naoApresentada: string[]
}

export const MERCADO_CLASSIFICACAO_LABELS: Record<MercadoFornecedorClassificacao, string> = {
  fornecedor_atual: 'Fornecedor atual',
  mercado_consultado: 'Mercado consultado',
  fora_perfil_declinado: 'Fora do perfil / Declinado',
  nao_apresentada: 'Não apresentada',
}

export const QUADRO_MERCADO_LABELS: Record<keyof QuadroMercadoVisibilidade, string> = {
  showFornecedorAtual: 'Fornecedor atual',
  showMercadoConsultado: 'Mercado consultado',
  showForaPerfilDeclinado: 'Fora do perfil / Declinado',
  showNaoApresentada: 'Não apresentada',
}

export function normMercadoKey(nome: string): string {
  return nome.trim().toLowerCase()
}

/** Operadoras do contrato vigente (mapeamento / itens da abertura). */
export function fornecedoresAtuaisFromForm(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): string[] {
  const nomes = new Set<string>()
  for (const item of form.itens ?? []) {
    const id = String(item.fornecedorId ?? '').trim()
    if (!id) continue
    const nome = resolveOperadoraNome(id, operadoras, operadorasById).trim()
    if (nome) nomes.add(nome)
  }
  return [...nomes]
}

export function defaultClassificacaoFornecedor(
  nome: string,
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): MercadoFornecedorClassificacao {
  const key = normMercadoKey(nome)
  const atuais = fornecedoresAtuaisFromForm(form, operadoras, operadorasById).map(normMercadoKey)
  if (atuais.includes(key)) return 'fornecedor_atual'
  return 'mercado_consultado'
}

/** União mercado analisado + fornecedores do contrato vigente (entrada do processo). */
export function mercadoNomesComFornecedoresAtuais(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): string[] {
  const atuais = fornecedoresAtuaisFromForm(form, operadoras, operadorasById)
  const mercado = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  const seen = new Set<string>()
  const out: string[] = []
  for (const nome of [...atuais, ...mercado]) {
    const k = normMercadoKey(nome)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(nome)
  }
  return out
}

export function buildMercadoQuadroBuckets(
  form: CotacaoFormState,
  state: AguardandoOperadoraState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): MercadoQuadroBuckets {
  const buckets: MercadoQuadroBuckets = {
    fornecedorAtual: [],
    mercadoConsultado: [],
    foraPerfilDeclinado: [],
    naoApresentada: [],
  }

  const mercado = mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById)
  const atuaisKeys = new Set(
    fornecedoresAtuaisFromForm(form, operadoras, operadorasById).map(normMercadoKey)
  )

  for (const nome of mercado) {
    const key = normMercadoKey(nome)
    const st = state.fornecedores[key]
    const classificacao =
      st?.classificacaoMercado ??
      (atuaisKeys.has(key) ? 'fornecedor_atual' : 'mercado_consultado')

    switch (classificacao) {
      case 'fornecedor_atual':
        buckets.fornecedorAtual.push(nome)
        break
      case 'mercado_consultado':
        buckets.mercadoConsultado.push(nome)
        break
      case 'fora_perfil_declinado':
        buckets.foraPerfilDeclinado.push(nome)
        break
      case 'nao_apresentada':
        buckets.naoApresentada.push(nome)
        break
    }
  }

  return buckets
}

export function quadroVisivel(
  vis: QuadroMercadoVisibilidade,
  classificacao: MercadoFornecedorClassificacao
): boolean {
  switch (classificacao) {
    case 'fornecedor_atual':
      return vis.showFornecedorAtual
    case 'mercado_consultado':
      return vis.showMercadoConsultado
    case 'fora_perfil_declinado':
      return vis.showForaPerfilDeclinado
    case 'nao_apresentada':
      return vis.showNaoApresentada
  }
}
