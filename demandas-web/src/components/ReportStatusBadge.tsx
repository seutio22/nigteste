import { Chip, ChipProps } from '@mui/material'

interface ReportStatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
}

export function ReportStatusBadge({ status, size = 'medium' }: ReportStatusBadgeProps) {
  const getStatusConfig = (status: string): { label: string; color: ChipProps['color'] } => {
    // Normalizar status para lowercase para comparação
    const normalizedStatus = status?.toLowerCase().trim() || ''
    
    // Verificar variações de "concluido" (com e sem acento, maiúsculas/minúsculas)
    if (normalizedStatus === 'concluido' || normalizedStatus === 'concluído' || normalizedStatus === 'concluida' || normalizedStatus === 'concluída') {
      return { label: 'Concluído', color: 'success' }
    }
    
    switch (normalizedStatus) {
      case 'pendente':
        return { label: 'Pendente', color: 'warning' }
      case 'em_andamento':
      case 'emandamento':
      case 'em andamento':
        return { label: 'Em Andamento', color: 'info' }
      case 'transf. analista':
      case 'transf_analista':
      case 'transfanalista':
        return { label: 'Transf. Analista', color: 'info' }
      case 'entregue':
        return { label: 'Entregue', color: 'success' }
      case 'cancelado':
        return { label: 'Cancelado', color: 'error' }
      default:
        return { label: status, color: 'default' }
    }
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
