import { createContext, useContext, type ReactNode } from 'react'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementCronogramaInstancia, PlacementCronogramaLinha } from './placementCronograma'

export type PlacementCronogramaPageContextValue = {
  id: string
  form: CotacaoFormState
  cronograma: PlacementCronogramaInstancia
  setCronograma: React.Dispatch<React.SetStateAction<PlacementCronogramaInstancia>>
  saving: boolean
  saveMsg: string | null
  setSaveMsg: (msg: string | null) => void
  validationMsg: string | null
  setValidationMsg: (msg: string | null) => void
  handleSave: () => Promise<void>
  patchLinha: (atividadeId: string, patch: Partial<PlacementCronogramaLinha>) => void
  isLoadingAtividades: boolean
  atividadesMerged: import('../../store/placementStore').PlacementCronogramaAtividade[]
}

const PlacementCronogramaPageContext = createContext<PlacementCronogramaPageContextValue | null>(null)

export function PlacementCronogramaPageProvider({
  value,
  children,
}: {
  value: PlacementCronogramaPageContextValue
  children: ReactNode
}) {
  return (
    <PlacementCronogramaPageContext.Provider value={value}>{children}</PlacementCronogramaPageContext.Provider>
  )
}

export function usePlacementCronogramaPage(): PlacementCronogramaPageContextValue {
  const ctx = useContext(PlacementCronogramaPageContext)
  if (!ctx) {
    throw new Error('usePlacementCronogramaPage deve ser usado dentro de PlacementCronogramaLayout')
  }
  return ctx
}
