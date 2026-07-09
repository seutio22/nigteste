import type { CotacaoFormState } from './CotacaoFormFields'
import { ComparativoEstudoDashboard } from './ComparativoEstudoDashboard'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
  onNavigateToLancamento?: () => void
  onOpenSlides?: () => void
}

/** Página dedicada ao comparativo — leitura ampla, fora do fluxo de slides. */
export function PlacementComparativoPropostasPage(props: Props) {
  return <ComparativoEstudoDashboard {...props} variant="fullscreen" />
}
