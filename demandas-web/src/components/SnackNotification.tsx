import React from 'react'
import { Typography } from '@mui/material'
import type { SnackMessage } from '../types/dadosTypes'

interface SnackNotificationProps {
  snack: SnackMessage | null
}

export const SnackNotification: React.FC<SnackNotificationProps> = ({ snack }) => {
  if (!snack?.open) return null

  const getBackgroundColor = (severity: SnackMessage['severity']) => {
    switch (severity) {
      case 'success': return '#1b5e20'
      case 'error': return '#b71c1c'
      case 'warning': return '#f57c00'
      case 'info': return '#1565c0'
      default: return '#1565c0'
    }
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 16, 
        left: 16, 
        background: getBackgroundColor(snack.severity), 
        color: '#fff', 
        padding: '8px 12px', 
        borderRadius: 6,
        zIndex: 9999,
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <Typography variant="body2">{snack.message}</Typography>
    </div>
  )
}
