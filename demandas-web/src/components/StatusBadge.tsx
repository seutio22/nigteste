import { Chip } from '@mui/material'

export function StatusBadge({ status }: { status: string }) {
  const color = mapColor(status)
  return <Chip label={`Status: ${status}`} color={color} size="small" />
}

function mapColor(status: string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | undefined {
  const s = status?.toLowerCase()
  if (['concluída', 'concluida', 'fechada'].includes(s)) return 'success'
  if (['aberta'].includes(s)) return 'info'
  if (['em andamento'].includes(s)) return 'primary'
  if (['aguardando validação', 'aguardando validacao'].includes(s)) return 'warning'
  if (['com erros'].includes(s)) return 'error'
  if (['em reajuste'].includes(s)) return 'secondary'
  if (['cancelada'].includes(s)) return 'default'
  return 'default'
}


