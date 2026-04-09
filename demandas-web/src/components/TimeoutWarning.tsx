import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material'
import { Warning, Timer } from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'

interface TimeoutWarningProps {
  open: boolean
  onExtend: () => void
  onLogout: () => void
  timeRemaining: number // em segundos
}

export function TimeoutWarning({ open, onExtend, onLogout, timeRemaining }: TimeoutWarningProps) {
  const [countdown, setCountdown] = useState(timeRemaining)
  const { user } = useAuthStore()

  useEffect(() => {
    if (!open) return

    setCountdown(timeRemaining)
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogout() // Logout automático quando countdown chegar a 0
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, timeRemaining, onLogout])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = (countdown / timeRemaining) * 100

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" />
          <Typography variant="h6">
            Sessão Expirando
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Sua sessão expirará em breve devido à inatividade.
        </Alert>
        
        <Box mb={2}>
          <Typography variant="body1" gutterBottom>
            Olá, <strong>{user?.name}</strong>!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Você será desconectado automaticamente em:
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Timer color="warning" />
          <Typography variant="h4" color="warning.main" fontWeight="bold">
            {formatTime(countdown)}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          color="warning"
          sx={{ height: 8, borderRadius: 4 }}
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Clique em "Continuar" para estender sua sessão ou "Sair" para fazer logout.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onLogout} 
          variant="outlined" 
          color="error"
        >
          Sair
        </Button>
        <Button 
          onClick={onExtend} 
          variant="contained" 
          color="primary"
          autoFocus
        >
          Continuar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
