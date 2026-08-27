import type { KickOffEstrategia } from './placementKickOffEstrategia'
import type { CotacaoFormState } from './CotacaoFormFields'

/** Pontua blocos de workflow no kickOff (comunicar / aguardando) para detectar resposta API incompleta. */
export function kickOffWorkflowScore(kickOff?: KickOffEstrategia | null): number {
  if (!kickOff) return 0
  let score = 0
  const fornecedoresCm = kickOff.comunicarMercado?.fornecedores
  if (fornecedoresCm) {
    for (const f of Object.values(fornecedoresCm)) {
      if (f.enviado) score += 2
      if (f.dataEnvio) score += 1
    }
  }
  const fornecedoresAo = kickOff.aguardandoOperadora?.fornecedores
  if (fornecedoresAo) {
    for (const f of Object.values(fornecedoresAo)) {
      if (f.retornoRecebido) score += 2
    }
  }
  return score
}

/** Preserva filtros/visibilidade do comparativo quando a API devolve kickOff desatualizado. */
export function preferLocalComparativoConfigInKickOff(
  apiKickOff: KickOffEstrategia | null | undefined,
  localKickOff: KickOffEstrategia | null | undefined
): KickOffEstrategia | null | undefined {
  if (!apiKickOff?.aguardandoOperadora) return apiKickOff
  const localAg = localKickOff?.aguardandoOperadora
  const localCfg = localAg?.comparativoConfig
  if (!localCfg && !localAg?.comparativosEstudos?.length) return apiKickOff
  return {
    ...apiKickOff,
    aguardandoOperadora: {
      ...apiKickOff.aguardandoOperadora,
      ...(localCfg
        ? {
            comparativoConfig: {
              ...apiKickOff.aguardandoOperadora.comparativoConfig,
              ...localCfg,
              colunasOcultas:
                localCfg.colunasOcultas ??
                apiKickOff.aguardandoOperadora.comparativoConfig?.colunasOcultas,
              linhasOcultas:
                localCfg.linhasOcultas ??
                apiKickOff.aguardandoOperadora.comparativoConfig?.linhasOcultas,
            },
          }
        : {}),
      ...(localAg?.apresentacaoPanesOcultas
        ? { apresentacaoPanesOcultas: localAg.apresentacaoPanesOcultas }
        : {}),
      ...(localAg?.comparativosEstudos?.length
        ? {
            comparativosEstudos: localAg.comparativosEstudos,
            comparativoAtivoId: localAg.comparativoAtivoId,
            ...(localAg.propostas ? { propostas: localAg.propostas } : {}),
          }
        : {}),
    },
  }
}

/** Após PUT parcial, garante que o formulário use o kickOff que acabou de ser salvo. */
export function mergeSavedKickOffIntoApiCotacao(
  apiRow: unknown,
  savedKickOff: KickOffEstrategia
): unknown {
  if (!apiRow || typeof apiRow !== 'object') return apiRow
  return { ...(apiRow as Record<string, unknown>), kickOffEstrategia: savedKickOff }
}

/** Pontua conteúdo preenchido (não só quantidade de células vazias) em consolidandoDados. */
function consolidandoContentScore(cd: KickOffEstrategia['consolidandoDados'] | null | undefined): number {
  if (!cd) return 0
  let n = 0
  const scoreCelulas = (arr: unknown) => {
    if (!Array.isArray(arr)) return
    for (const c of arr) {
      if (!c || typeof c !== 'object') continue
      const cell = c as { texto?: unknown; planoLabel?: unknown }
      if (String(cell.texto ?? '').trim()) n += 2
      if (String(cell.planoLabel ?? '').trim()) n += 1
    }
  }
  for (const secao of ['diferenciais', 'condicoes', 'indicadores'] as const) {
    const bloco = cd[secao]
    if (!bloco || typeof bloco !== 'object') continue
    for (const porColuna of Object.values(bloco)) {
      if (Array.isArray(porColuna)) {
        scoreCelulas(porColuna)
      } else if (porColuna && typeof porColuna === 'object') {
        for (const arr of Object.values(porColuna as Record<string, unknown>)) {
          scoreCelulas(arr)
        }
      }
    }
  }
  if (cd.resumoCoberturas?.trim()) n += 2
  if (cd.condicoesContratuais?.trim()) n += 2
  if (cd.notasRodape?.trim()) n += 1
  return n
}

function scoreFilled(v: unknown): number {
  return String(v ?? '').trim() ? 1 : 0
}

/** Pontua conteúdo de propostas (planos/cenários) para não perder digitação em applyCotacaoFromApi. */
export function propostasContentScore(
  ag: KickOffEstrategia['aguardandoOperadora'] | null | undefined
): number {
  if (!ag?.propostas) return 0
  let n = 0
  for (const prop of Object.values(ag.propostas)) {
    if (!prop) continue
    n += 1
    const cenarios = prop.cenarios?.length ? prop.cenarios : null
    const planosLists = cenarios
      ? cenarios.map((c) => c.planos ?? [])
      : [prop.planos ?? []]
    for (const planos of planosLists) {
      for (const p of planos) {
        if (!p) continue
        n += scoreFilled(p.nomePlano)
        n += scoreFilled(p.numeroVidas)
        n += scoreFilled(p.custoPerCapitaBRL)
        n += scoreFilled(p.coparticipacao)
        n += scoreFilled(p.reembolso)
        n += scoreFilled(p.reembolsoConsulta)
        if (p.vidasFaixa) {
          for (const v of Object.values(p.vidasFaixa)) n += scoreFilled(v)
        }
        if (p.custosFaixa) {
          for (const v of Object.values(p.custosFaixa)) n += scoreFilled(v)
        }
        const copart = p.coparticipacaoDetalhe
        if (copart?.possui) n += 2
        if (copart?.linhas) {
          for (const linha of Object.values(copart.linhas)) {
            n += scoreFilled(linha?.valor)
            n += scoreFilled(linha?.limitador)
          }
        }
        const reemb = p.reembolsoDetalhe
        if (reemb) {
          n += scoreFilled(reemb.consultaDias)
          n += scoreFilled(reemb.procedimentosDias)
          if (reemb.valores) {
            for (const v of Object.values(reemb.valores)) n += scoreFilled(v)
          }
        }
      }
    }
    if (cenarios) {
      for (const c of cenarios) {
        n += scoreFilled(c.titulo)
        n += scoreFilled(c.reajustePercent)
      }
    }
  }
  // Espelho nos estudos ativos também conta (evita perder ao trocar só config).
  for (const estudo of ag.comparativosEstudos ?? []) {
    if (estudo?.propostas && Object.keys(estudo.propostas).length) n += 1
  }
  return n
}

/** Evita que applyCotacaoFromApi apague comunicar/aguardando quando a API devolve JSON incompleto. */
export function preferRicherKickOffWhenApplyingApi(
  apiKickOff: KickOffEstrategia,
  localKickOff: KickOffEstrategia | null | undefined
): KickOffEstrategia {
  if (!localKickOff) return apiKickOff
  const preferWorkflow = kickOffWorkflowScore(localKickOff) > kickOffWorkflowScore(apiKickOff)
  const result: KickOffEstrategia = preferWorkflow
    ? {
        ...apiKickOff,
        ...(localKickOff.comunicarMercado ? { comunicarMercado: localKickOff.comunicarMercado } : {}),
        ...(localKickOff.aguardandoOperadora
          ? { aguardandoOperadora: localKickOff.aguardandoOperadora }
          : {}),
      }
    : { ...apiKickOff }

  const localCd = localKickOff.consolidandoDados
  const apiCd = apiKickOff.consolidandoDados
  const localCdScore = consolidandoContentScore(localCd)
  const apiCdScore = consolidandoContentScore(apiCd)
  // API antiga omitia consolidandoDados no PUT — nunca descartar o local mais rico/recente.
  if (localCd && (localCdScore > apiCdScore || (localCdScore > 0 && localCdScore === apiCdScore) || !apiCd)) {
    result.consolidandoDados = localCd
  }

  const localVp = localKickOff.validacaoProposta
  const apiVp = apiKickOff.validacaoProposta
  if (localVp) {
    const score = (vp: typeof localVp) => {
      const itens = vp?.itens ?? []
      const avaliados = itens.filter((i) => i.status === 'ok' || i.status === 'ajuste').length
      return (
        (String(vp?.analistaValidadorId ?? '').trim() ? 3 : 0) +
        avaliados * 2 +
        itens.length +
        (vp?.historico?.length ?? 0)
      )
    }
    if (!apiVp || score(localVp) >= score(apiVp)) {
      result.validacaoProposta = localVp
    }
  }

  const localAg = localKickOff.aguardandoOperadora
  const apiAg = result.aguardandoOperadora ?? apiKickOff.aguardandoOperadora
  const localPropScore = propostasContentScore(localAg)
  const apiPropScore = propostasContentScore(apiAg)
  if (
    localAg?.propostas &&
    (localPropScore > apiPropScore || (localPropScore > 0 && localPropScore === apiPropScore) || !apiAg?.propostas)
  ) {
    result.aguardandoOperadora = {
      ...(apiAg ?? localAg),
      ...localAg,
      propostas: localAg.propostas,
      ...(localAg.comparativosEstudos?.length
        ? {
            comparativosEstudos: localAg.comparativosEstudos,
            comparativoAtivoId: localAg.comparativoAtivoId,
          }
        : {}),
    }
  }

  return result
}

/** Monta payload completo de kickOffEstrategia preservando blocos já gravados. */
export function buildKickOffEstrategiaPatch(
  current: KickOffEstrategia | null | undefined,
  patch: Partial<KickOffEstrategia>,
  fallbackMercado: string[] = []
): KickOffEstrategia {
  const base: KickOffEstrategia = current ?? {
    secoes: [],
    mercadoAnalisado: fallbackMercado,
    notas: '',
  }
  return {
    ...base,
    ...patch,
    secoes: patch.secoes ?? base.secoes,
    mercadoAnalisado:
      patch.mercadoAnalisado && patch.mercadoAnalisado.length > 0
        ? patch.mercadoAnalisado
        : base.mercadoAnalisado,
    notas: patch.notas ?? base.notas,
    resumoEdicoes: patch.resumoEdicoes ?? base.resumoEdicoes,
    comunicarMercado: patch.comunicarMercado ?? base.comunicarMercado,
    aguardandoOperadora: patch.aguardandoOperadora ?? base.aguardandoOperadora,
    consolidandoDados: patch.consolidandoDados ?? base.consolidandoDados,
    validacaoProposta: patch.validacaoProposta ?? base.validacaoProposta,
    cronograma: patch.cronograma ?? base.cronograma,
  }
}

/**
 * PUT /kick-off devolve só `{ id, updatedAt }`. Sem isso o toFormState zera
 * planos/itens da abertura e o contrato atual some ~2–5s depois do autosave.
 */
export function cotacaoPayloadTemCorpoFormulario(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const d = data as Record<string, unknown>
  return d.planosCobertura !== undefined || d.itensMapeamento !== undefined
}

export function mergeApiCotacaoIntoForm(
  prev: CotacaoFormState,
  next: CotacaoFormState,
  raw: unknown
): CotacaoFormState {
  let kickOff = preferRicherKickOffWhenApplyingApi(next.kickOffEstrategia, prev.kickOffEstrategia)
  kickOff = preferLocalComparativoConfigInKickOff(kickOff, prev.kickOffEstrategia) ?? kickOff
  if (!cotacaoPayloadTemCorpoFormulario(raw)) {
    return { ...prev, kickOffEstrategia: kickOff }
  }
  return { ...next, kickOffEstrategia: kickOff }
}
