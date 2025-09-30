import { Chip, ChipProps } from '@mui/material'

interface PriorityBadgeProps {
  priority: string
  size?: 'small' | 'medium'
}

export function PriorityBadge({ priority, size = 'small' }: PriorityBadgeProps) {
  const getPriorityConfig = (priority: string): { label: string; color: ChipProps['color'] } => {
    switch (priority) {
      case 'baixa':
        return { label: 'Baixa', color: 'success' }
      case 'media':
        return { label: 'Média', color: 'warning' }
      case 'alta':
        return { label: 'Alta', color: 'error' }
      case 'urgente':
        return { label: 'Urgente', color: 'error' }
      default:
        return { label: priority, color: 'default' }
    }
  }

  const config = getPriorityConfig(priority)

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="filled"
    />
  )
}
