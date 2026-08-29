export type SlaImpacto = 'alta' | 'media' | 'baixa'

export type SlaImpactoChipColor = 'error' | 'warning' | 'success'

export const SLA_IMPACTO_LEGEND: {
  value: SlaImpacto
  label: string
  shortLabel: string
  color: SlaImpactoChipColor
}[] = [
  { value: 'alta', label: 'Alta prioridade', shortLabel: 'Alta', color: 'error' },
  { value: 'media', label: 'Média prioridade', shortLabel: 'Média', color: 'warning' },
  { value: 'baixa', label: 'Baixa prioridade', shortLabel: 'Baixa', color: 'success' },
]

const BY_VALUE = Object.fromEntries(SLA_IMPACTO_LEGEND.map((x) => [x.value, x])) as Record<
  SlaImpacto,
  (typeof SLA_IMPACTO_LEGEND)[number]
>

export function isSlaImpacto(value: string | null | undefined): value is SlaImpacto {
  return value === 'alta' || value === 'media' || value === 'baixa'
}

export function getSlaImpactoMeta(value: string | null | undefined) {
  if (isSlaImpacto(value)) return BY_VALUE[value]
  return null
}

export function getSlaImpactoLabel(value: string | null | undefined): string {
  return getSlaImpactoMeta(value)?.label ?? '—'
}

export function getSlaImpactoShortLabel(value: string | null | undefined): string {
  return getSlaImpactoMeta(value)?.shortLabel ?? '—'
}

export function getSlaImpactoColor(value: string | null | undefined): SlaImpactoChipColor | 'default' {
  return getSlaImpactoMeta(value)?.color ?? 'default'
}
