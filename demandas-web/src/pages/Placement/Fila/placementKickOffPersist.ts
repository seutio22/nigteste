import type { KickOffEstrategia } from './placementKickOffEstrategia'

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
  const localCfg = localKickOff?.aguardandoOperadora?.comparativoConfig
  if (!localCfg) return apiKickOff
  return {
    ...apiKickOff,
    aguardandoOperadora: {
      ...apiKickOff.aguardandoOperadora,
      comparativoConfig: {
        ...apiKickOff.aguardandoOperadora.comparativoConfig,
        ...localCfg,
        colunasOcultas: localCfg.colunasOcultas ?? apiKickOff.aguardandoOperadora.comparativoConfig?.colunasOcultas,
        linhasOcultas: localCfg.linhasOcultas ?? apiKickOff.aguardandoOperadora.comparativoConfig?.linhasOcultas,
      },
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

/** Evita que applyCotacaoFromApi apague comunicar/aguardando quando a API devolve JSON incompleto. */
export function preferRicherKickOffWhenApplyingApi(
  apiKickOff: KickOffEstrategia,
  localKickOff: KickOffEstrategia | null | undefined
): KickOffEstrategia {
  if (!localKickOff) return apiKickOff
  if (kickOffWorkflowScore(localKickOff) <= kickOffWorkflowScore(apiKickOff)) return apiKickOff
  return {
    ...apiKickOff,
    ...(localKickOff.comunicarMercado ? { comunicarMercado: localKickOff.comunicarMercado } : {}),
    ...(localKickOff.aguardandoOperadora ? { aguardandoOperadora: localKickOff.aguardandoOperadora } : {}),
  }
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
  }
}
