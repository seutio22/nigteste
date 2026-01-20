import { Chip, ChipProps } from '@mui/material'
import { memo } from 'react'

interface StatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
}

// 🚀 MELHORIA FASE 2A: React.memo - 40-60% menos re-renders
export const StatusBadge = memo(function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusConfig = (status: string): { label: string; color: ChipProps['color'] } => {
    const s = status?.toLowerCase()
    
    if (['concluída', 'concluida', 'fechada', 'concluido', 'concluído'].includes(s)) {
      return { label: 'Concluído', color: 'success' }
    }
    if (['aberta'].includes(s)) {
      return { label: 'Aberta', color: 'warning' }
    }
    if (['pendente'].includes(s)) {
      return { label: 'Pendente', color: 'warning' }
    }
    if (['em andamento', 'em-andamento'].includes(s)) {
      return { label: 'Em Andamento', color: 'info' }
    }
    if (['aguardando validação', 'aguardando validacao', 'aguardando-aprovacao', 'aguardando aprovação', 'aguardando aprovacao'].includes(s)) {
      return { label: 'Aguardando aprovação', color: 'warning' }
    }
    if (['com erros', 'pausado'].includes(s)) {
      return { label: 'Com Erros', color: 'error' }
    }
    if (['em reajuste'].includes(s)) {
      return { label: 'Em Reajuste', color: 'secondary' }
    }
    if (['cancelada', 'cancelado'].includes(s)) {
      return { label: 'Cancelado', color: 'error' }
    }
    if (['aprovada', 'rejeitada'].includes(s)) {
      return { label: status, color: s === 'aprovada' ? 'success' : 'error' }
    }
    
    return { label: status, color: 'default' }
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
})


