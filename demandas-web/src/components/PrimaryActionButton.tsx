import React from 'react'
import { Button, ButtonProps } from '@mui/material'

/**
 * Botão de ação primária: mesmo padrão visual do Importador Inteligente.
 * Usar para: Nova Demanda, Nova Manutenção, Novo Atendimento, Nova Validação,
 * Novo Reajuste, Novo Relatório, Importador Inteligente, etc.
 */
export const PrimaryActionButton: React.FC<ButtonProps> = ({
  children,
  startIcon,
  sx,
  ...rest
}) => (
  <Button
    variant="contained"
    size="medium"
    startIcon={startIcon}
    {...rest}
    sx={{
      borderRadius: '14px',
      padding: '10px 20px',
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.9rem',
      height: '44px',
      background: 'linear-gradient(135deg, #050032 0%, #002561 100%)',
      color: '#fff',
      '&:hover': {
        background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px 0 rgba(5, 0, 50, 0.3)',
      },
      ...sx,
    }}
  >
    {children}
  </Button>
)
