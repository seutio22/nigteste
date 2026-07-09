import type { CotacaoFormState } from './CotacaoFormFields'
import { buildKickOffEstrategiaPatch } from './placementKickOffPersist'
import type { AguardandoOperadoraState } from './placementAguardandoOperadora'
import type { ComunicarMercadoState } from './placementComunicarMercado'

type KickOffPatch = {
  comunicarMercado?: ComunicarMercadoState
  aguardandoOperadora?: AguardandoOperadoraState
}

/** Aplica patch parcial no kickOff sem espalhar `{ ...form, kickOffEstrategia }` manualmente. */
export function patchKickOffInForm(
  form: CotacaoFormState,
  patch: KickOffPatch,
  fornecedores: string[]
): CotacaoFormState {
  return {
    ...form,
    kickOffEstrategia: buildKickOffEstrategiaPatch(form.kickOffEstrategia, patch, fornecedores),
  }
}
