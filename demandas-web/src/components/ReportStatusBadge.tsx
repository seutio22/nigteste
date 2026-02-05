import { Chip, ChipProps } from '@mui/material'

interface ReportStatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
}

export function ReportStatusBadge({ status, size = 'medium' }: ReportStatusBadgeProps) {
  const getStatusConfig = (status: string): { label: string; color: ChipProps['color'] } => {
    const s = status?.trim() || ''
    // Valores padrão (conforme Cadastro) – exibir como estão
    const padroes: Record<string, ChipProps['color']> = {
      'Pendente': 'warning',
      'Em andamento': 'info',
      'Transf. Analista': 'info',
      'Concluída': 'success',
      'Entregue': 'success',
      'Cancelada': 'error'
    }
    if (padroes[s]) return { label: s, color: padroes[s] }
    // Fallback para variações antigas
    const lower = s.toLowerCase()
    if (lower === 'concluido' || lower === 'concluído' || lower === 'concluida' || lower === 'concluída') return { label: 'Concluída', color: 'success' }
    if (lower === 'pendente') return { label: 'Pendente', color: 'warning' }
    if (lower === 'em_andamento' || lower === 'em andamento' || lower === 'emandamento') return { label: 'Em andamento', color: 'info' }
    if (lower === 'transf_analista' || lower === 'transf. analista') return { label: 'Transf. Analista', color: 'info' }
    if (lower === 'entregue') return { label: 'Entregue', color: 'success' }
    if (lower === 'cancelado' || lower === 'cancelada') return { label: 'Cancelada', color: 'error' }
    return { label: s || '—', color: 'default' }
  }

  const config = getStatusConfig(status)

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="outlined"
    />
  )
}
