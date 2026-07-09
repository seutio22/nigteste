import type { Operadora } from '../../../types/masterData'
import type { CotacaoFormState } from './CotacaoFormFields'
import { itensToApiPayload } from './placementCotacaoDetalhes'
import type { KickOffAberturaLabels } from './placementKickOffEstrategia'
import {
  formatCoberturasEspeciaisResumo,
  formatPlanosResumoLinhas,
  resolveOperadoraNome,
} from './placementKickOffFormatters'
import {
  formatMultaRescisaoResumo,
  formatConvencaoColetivaResumo,
  labelFormularioTipo,
  labelSimNaoChoice,
} from './placementFormularioContrato'

export type AberturaResumoLinha = {
  id: string
  grupo: string
  rotulo: string
  valor: string
  vazio: boolean
}

export type AberturaResumoGrupo = {
  titulo: string
  linhas: AberturaResumoLinha[]
}

function pushLinha(
  bucket: AberturaResumoLinha[],
  grupo: string,
  id: string,
  rotulo: string,
  valor: string | undefined | null
) {
  const v = String(valor ?? '').trim()
  bucket.push({
    id,
    grupo,
    rotulo,
    valor: v || '—',
    vazio: !v,
  })
}

export type BuildAberturaResumoInput = {
  form: CotacaoFormState
  labels: KickOffAberturaLabels
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  subfaturas?: { razaoSocial: string; cnpj: string; vidas?: number | null; cidade?: string | null; uf?: string | null }[]
}

export function buildAberturaResumoLinhas(input: BuildAberturaResumoInput): AberturaResumoLinha[] {
  const { form, labels, operadoras, operadorasById, subfaturas = [] } = input
  const linhas: AberturaResumoLinha[] = []
  const g = (name: string) => name
  const opNome = (id: string) => resolveOperadoraNome(id, operadoras, operadorasById)

  pushLinha(linhas, g('Identificação'), 'ticket', 'Ticket', form.ticket)
  pushLinha(linhas, g('Identificação'), 'status', 'Status do processo', form.status)
  pushLinha(linhas, g('Identificação'), 'solicitante', 'Solicitante', labels.solicitante || form.solicitante)
  pushLinha(linhas, g('Identificação'), 'data-inicio', 'Data de início', form.dataInicio)
  pushLinha(linhas, g('Identificação'), 'data-limite', 'Data limite', form.dataLimite)
  pushLinha(linhas, g('Identificação'), 'vigencia', 'Início de vigência', labels.vigenciaApolice)
  pushLinha(linhas, g('Identificação'), 'projeto', 'Projeto', labels.projeto)
  pushLinha(linhas, g('Identificação'), 'pedido', 'Pedido/conta', labels.pedido)
  pushLinha(linhas, g('Identificação'), 'temperatura', 'Temperatura', labels.temperatura)
  pushLinha(linhas, g('Identificação'), 'analista-cadastro', 'Analista de cadastro', labels.analistaCadastro)
  pushLinha(linhas, g('Identificação'), 'analista-resp', 'Analista responsável', labels.analistaResponsavel)

  pushLinha(
    linhas,
    g('Estipulante'),
    'estipulante',
    form.clienteTipo === 'prospect' ? 'Prospect' : 'Estipulante',
    labels.estipulante
  )
  pushLinha(linhas, g('Estipulante'), 'grupo-economico', 'Grupo econômico', labels.grupoEconomico)
  pushLinha(linhas, g('Estipulante'), 'filial', 'Filial', labels.filial)
  pushLinha(linhas, g('Estipulante'), 'corretor', 'Corretor parceiro', labels.corretorParceiro)

  const apiItens = itensToApiPayload(form.itens, form.formularioTipo)
  apiItens.forEach((item, idx) => {
    const forn = opNome(item.fornecedorId)
    pushLinha(
      linhas,
      g('Mapeamento'),
      `map-prod-${idx}`,
      `Produto ${idx + 1}`,
      item.produtoNome
    )
    pushLinha(linhas, g('Mapeamento'), `map-forn-${idx}`, `Fornecedor atual ${idx + 1}`, forn)
  })

  pushLinha(linhas, g('Contrato'), 'tipo-contratacao', 'Tipo de contratação', labels.tipoContratacao)
  pushLinha(linhas, g('Contrato'), 'modalidade', 'Modalidade de contrato', labels.modalidadeContrato)
  pushLinha(linhas, g('Contrato'), 'prazo-vigencia', 'Duração Contratual', labels.prazoVigencia)
  pushLinha(linhas, g('Contrato'), 'break-even', 'Break-even', labels.breakEven || form.breakEven)
  pushLinha(
    linhas,
    g('Contrato'),
    'formulario-tipo',
    'Formulário',
    labels.formularioTipo || labelFormularioTipo(form.formularioTipo)
  )
  pushLinha(
    linhas,
    g('Contrato'),
    'multa-rescisao',
    'Multa para rescisão contratual',
    labels.multaRescisao || formatMultaRescisaoResumo(form)
  )
  pushLinha(
    linhas,
    g('Contrato'),
    'convencao-coletiva',
    'Em acordo coletivo',
    labels.convencaoColetiva || formatConvencaoColetivaResumo(form)
  )
  pushLinha(linhas, g('Contrato'), 'coparticipacao', 'Coparticipação (detalhe)', labels.coparticipacao)
  pushLinha(linhas, g('Contrato'), 'comissao-atual', 'Comissão contrato vigente', labels.comissaoAtual)
  pushLinha(linhas, g('Contrato'), 'contribuicao', 'Participação / contribuição', labels.contribuicao)

  pushLinha(linhas, g('Planos e condições'), 'upgrade-downgrade', 'Upgrade e downgrade', labels.upgradeDowngrade)

  const planosLinhas = formatPlanosResumoLinhas(form.planos, form.itens, operadoras)
  planosLinhas.forEach((txt, idx) => {
    pushLinha(linhas, g('Planos e condições'), `plano-${idx}`, `Plano ${idx + 1}`, txt)
  })

  pushLinha(linhas, g('Planos e condições'), 'reembolso', 'Reembolso (tabela)', labels.reembolso)

  formatCoberturasEspeciaisResumo(form).forEach((txt, idx) => {
    pushLinha(linhas, g('Coberturas especiais'), `cob-${idx}`, `Cobertura ${idx + 1}`, txt)
  })

  subfaturas.forEach((s, idx) => {
    const det = [
      s.razaoSocial,
      s.cnpj,
      s.cidade && s.uf ? `${s.cidade}/${s.uf}` : s.cidade || s.uf,
      s.vidas != null ? `${s.vidas} vidas` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    pushLinha(linhas, g('Subfaturas'), `sub-${idx}`, `Empresa ${idx + 1}`, det)
  })

  form.subfaturasDraft.forEach((s, idx) => {
    pushLinha(
      linhas,
      g('Subfaturas'),
      `sub-draft-${idx}`,
      `Empresa (rascunho) ${idx + 1}`,
      [s.razaoSocial, s.cnpj].filter(Boolean).join(' · ')
    )
  })

  pushLinha(linhas, g('Contexto'), 'descricao', 'Descrição', form.descricao)
  pushLinha(linhas, g('Contexto'), 'observacoes', 'Observações', form.observacoes)

  return linhas
}

export function groupAberturaResumoLinhas(linhas: AberturaResumoLinha[]): AberturaResumoGrupo[] {
  const order: string[] = []
  const map = new Map<string, AberturaResumoLinha[]>()
  for (const l of linhas) {
    if (!map.has(l.grupo)) {
      map.set(l.grupo, [])
      order.push(l.grupo)
    }
    map.get(l.grupo)!.push(l)
  }
  return order.map((titulo) => ({ titulo, linhas: map.get(titulo)! }))
}

export function resolveResumoLinhaValor(
  linha: AberturaResumoLinha,
  edicoes?: Record<string, string>
): string {
  const editado = edicoes?.[linha.id]
  if (editado !== undefined) return editado.trim() || '—'
  return linha.valor
}

export function resumoLinhaIsWide(linha: AberturaResumoLinha, valorExibido?: string): boolean {
  const v = valorExibido ?? linha.valor
  if (v.length > 100 || v.includes('\n')) return true
  const wideIds = [
    'descricao',
    'observacoes',
    'reembolso',
    'upgrade-downgrade',
    'coparticipacao',
    'multa-rescisao',
    'operadoras-sugestao',
  ]
  if (wideIds.includes(linha.id)) return true
  if (linha.id.startsWith('plano-') || linha.id.startsWith('cob-') || linha.id.startsWith('sub-')) {
    return true
  }
  return false
}

/** No resumo da abertura, apenas temperatura pode ser alterada inline. */
export function resumoLinhaEditavel(linha: AberturaResumoLinha): boolean {
  return linha.id === 'temperatura'
}

/** @deprecated Use buildAberturaResumoLinhas */
export function buildAberturaResumoGrupos(
  form: CotacaoFormState,
  labels: KickOffAberturaLabels
): AberturaResumoGrupo[] {
  return groupAberturaResumoLinhas(
    buildAberturaResumoLinhas({ form, labels, operadoras: [] })
  )
}
