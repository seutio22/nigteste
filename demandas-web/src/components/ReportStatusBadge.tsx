import { Chip, ChipProps } from '@mui/material'

interface ReportStatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
}

export function ReportStatusBadge({ status, size = 'medium' }: ReportStatusBadgeProps) {
  const getStatusConfig = (status: string): { label: string; color: ChipProps['color'] } => {
    switch (status) {
      case 'pendente':
        return { label: 'Pendente', color: 'warning' }
      case 'em_andamento':
        return { label: 'Em Andamento', color: 'info' }
      case 'concluido':
        return { label: 'Concluído', color: 'success' }
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
