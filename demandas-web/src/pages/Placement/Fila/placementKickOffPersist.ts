import type { KickOffEstrategia } from './placementKickOffEstrategia'

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
