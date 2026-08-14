export type ProdutividadePageKey =
  | 'demandas'
  | 'manutencoes'
  | 'atendimentos'
  | 'validacoes'
  | 'reajustes'
  | 'analytics'
  | 'projetos'

export type CatalogKey =
  | 'tiposServico'
  | 'tiposDemanda'
  | 'tiposCadastro'
  | 'padrao'
  | 'relatorios'
  | 'modelos'

export type QuantityKey =
  | 'qtdSistemas'
  | 'qtdUsuarios'
  | 'qtdClientes'
  | 'qtdRetornos'
  | 'qtdItens'
  | 'qtdContratos'
  | 'qtdSubs'

export type TempoBaseKey =
  | 'tempoSistemasSeconds'
  | 'tempoUsuariosSeconds'
  | 'tempoClientesSeconds'
  | 'tempoRetornosSeconds'
  | 'tempoItensSeconds'
  | 'tempoContratosSeconds'
  | 'tempoSubsSeconds'

export type TempoAdicionalKey =
  | 'tempoSistemasAdicionalSeconds'
  | 'tempoUsuariosAdicionalSeconds'
  | 'tempoClientesAdicionalSeconds'
  | 'tempoRetornosAdicionalSeconds'
  | 'tempoItensAdicionalSeconds'
  | 'tempoContratosAdicionalSeconds'
  | 'tempoSubsAdicionalSeconds'

export type TipoFieldConfig =
  | { key: 'tipo1Id' | 'tipo2Id'; label: string; source: 'catalog'; catalog: CatalogKey }
  | { key: 'tipo1Id' | 'tipo2Id'; label: string; source: 'enum'; options: { value: string; label: string }[] }

export type QuantityFieldConfig = {
  key: QuantityKey
  label: string
  tempoBaseKey: TempoBaseKey
  tempoAdicionalKey: TempoAdicionalKey
}

export type PageProdutividadeConfig = {
  pageKey: ProdutividadePageKey
  label: string
  tipo1: TipoFieldConfig | null
  tipo2: TipoFieldConfig | null
  quantities: QuantityFieldConfig[]
  /** Páginas sem quantidade usam um único tempo previsto. */
  allowTempoFixo?: boolean
  hint?: string
}

const Q = {
  sistemas: {
    key: 'qtdSistemas' as const,
    label: 'Sistemas',
    tempoBaseKey: 'tempoSistemasSeconds' as const,
    tempoAdicionalKey: 'tempoSistemasAdicionalSeconds' as const,
  },
  usuarios: {
    key: 'qtdUsuarios' as const,
    label: 'Usuários',
    tempoBaseKey: 'tempoUsuariosSeconds' as const,
    tempoAdicionalKey: 'tempoUsuariosAdicionalSeconds' as const,
  },
  clientes: {
    key: 'qtdClientes' as const,
    label: 'Clientes',
    tempoBaseKey: 'tempoClientesSeconds' as const,
    tempoAdicionalKey: 'tempoClientesAdicionalSeconds' as const,
  },
  retornos: {
    key: 'qtdRetornos' as const,
    label: 'Retornos',
    tempoBaseKey: 'tempoRetornosSeconds' as const,
    tempoAdicionalKey: 'tempoRetornosAdicionalSeconds' as const,
  },
  itens: {
    key: 'qtdItens' as const,
    label: 'Itens',
    tempoBaseKey: 'tempoItensSeconds' as const,
    tempoAdicionalKey: 'tempoItensAdicionalSeconds' as const,
  },
  contratos: {
    key: 'qtdContratos' as const,
    label: 'Contratos',
    tempoBaseKey: 'tempoContratosSeconds' as const,
    tempoAdicionalKey: 'tempoContratosAdicionalSeconds' as const,
  },
  subs: {
    key: 'qtdSubs' as const,
    label: "SUB's",
    tempoBaseKey: 'tempoSubsSeconds' as const,
    tempoAdicionalKey: 'tempoSubsAdicionalSeconds' as const,
  },
}

/** Tipos e quantidades alinhados a cada página operacional. */
export const PRODUTIVIDADE_PAGES: PageProdutividadeConfig[] = [
  {
    pageKey: 'demandas',
    label: 'Demandas',
    tipo1: { key: 'tipo1Id', label: 'Tipo de serviço', source: 'catalog', catalog: 'tiposServico' },
    tipo2: { key: 'tipo2Id', label: 'Tipo de demanda', source: 'catalog', catalog: 'tiposDemanda' },
    quantities: [Q.sistemas, Q.usuarios, Q.clientes, Q.retornos],
  },
  {
    pageKey: 'manutencoes',
    label: 'Manutenções',
    tipo1: { key: 'tipo1Id', label: 'Tipo de serviço', source: 'catalog', catalog: 'tiposCadastro' },
    tipo2: { key: 'tipo2Id', label: 'Tipo de manutenção', source: 'catalog', catalog: 'padrao' },
    quantities: [Q.sistemas, Q.contratos, Q.retornos],
  },
  {
    pageKey: 'atendimentos',
    label: 'Atendimentos',
    tipo1: {
      key: 'tipo1Id',
      label: 'Tipo de serviço',
      source: 'enum',
      options: [
        { value: 'duvida', label: 'Dúvida' },
        { value: 'solicitacao', label: 'Solicitação' },
        { value: 'incidente', label: 'Incidente' },
      ],
    },
    tipo2: {
      key: 'tipo2Id',
      label: 'Canal de atendimento',
      source: 'enum',
      options: [
        { value: 'teams', label: 'Teams' },
        { value: 'email', label: 'E-mail' },
        { value: 'ligacao', label: 'Ligação' },
        { value: 'mensagem', label: 'Mensagem' },
      ],
    },
    quantities: [Q.retornos],
  },
  {
    pageKey: 'validacoes',
    label: 'Validações',
    tipo1: {
      key: 'tipo1Id',
      label: 'Tipo',
      source: 'enum',
      options: [
        { value: 'Total', label: 'Total' },
        { value: 'SUB', label: 'SUB' },
      ],
    },
    tipo2: null,
    quantities: [Q.contratos, Q.subs, Q.retornos],
    hint: 'Alinhado ao chamado: itens concluídos ramificados em Contrato e SUB\'s (+ retornos).',
  },
  {
    pageKey: 'reajustes',
    label: 'Reajustes',
    tipo1: null,
    tipo2: null,
    quantities: [Q.contratos, Q.itens],
    hint: 'Quantidade de contratos e itens do lançamento de reajuste.',
  },
  {
    pageKey: 'analytics',
    label: 'Analytics',
    tipo1: { key: 'tipo1Id', label: 'Tipo de solicitação', source: 'catalog', catalog: 'relatorios' },
    tipo2: { key: 'tipo2Id', label: 'Modelo', source: 'catalog', catalog: 'modelos' },
    quantities: [Q.itens],
  },
  {
    pageKey: 'projetos',
    label: 'Projetos',
    tipo1: null,
    tipo2: null,
    quantities: [],
    allowTempoFixo: true,
    hint: 'Sem métricas de quantidade — informe um tempo previsto fixo.',
  },
]

export function getPageConfig(pageKey: string): PageProdutividadeConfig {
  return PRODUTIVIDADE_PAGES.find((p) => p.pageKey === pageKey) ?? PRODUTIVIDADE_PAGES[0]
}

/**
 * Tempo da linha: base (1ª unidade) + (qtd - 1) × adicional.
 * Por padrão (formulário): se há tempo e qtd vazia, assume 1 unidade (preview).
 * No chamado (emptyMeansOne: false): qtd vazia/0 → 0 segundos.
 */
export function computeQuantityLineSeconds(
  qtd: number | null | undefined,
  tempoBaseSeconds: number | null | undefined,
  tempoAdicionalSeconds: number | null | undefined,
  opts?: { emptyMeansOne?: boolean }
): number {
  const base = tempoBaseSeconds ?? 0
  const adicional = tempoAdicionalSeconds ?? 0
  if (base <= 0 && adicional <= 0) return 0
  const emptyMeansOne = opts?.emptyMeansOne !== false
  let n: number
  if (qtd == null || qtd < 1) {
    n = emptyMeansOne && (base > 0 || adicional > 0) ? 1 : 0
  } else {
    n = qtd
  }
  if (n <= 0) return 0
  return base + Math.max(0, n - 1) * adicional
}
