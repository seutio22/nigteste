import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import { getApi } from '../lib/apiConfig'

interface CleanupModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface CleanupResult {
  message: string
  duplicatasRemovidas?: number
  duplicatasComDependencias?: number
  detalhes?: {
    removidas: Array<{
      id: string
      nome: string
      grupoEconomico: string
    }>
    comDependencias: Array<{
      id: string
      nome: string
      grupoEconomico: string
      dependencias: {
        contratos: number
        demandas: number
        atendimentos: number
        projetos: number
        total: number
      }
    }>
  }
}

export const CleanupModal: React.FC<CleanupModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      console.log('🧹 Iniciando limpeza de grupos econômicos duplicados...')
      const api = getApi()
      const cleanupResult = await api.limparDuplicatasClientes()
      
      console.log('✅ Resultado da limpeza:', cleanupResult)
      setResult(cleanupResult)
      
      if (onSuccess) {
        onSuccess()
      }
      
    } catch (err) {
      console.error('❌ Erro na limpeza:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🧹 Limpeza de Grupos Econômicos Duplicados
      </DialogTitle>
      
      <DialogContent>
        {!result && !error && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Atenção:</strong> Esta operação irá remover clientes com grupos econômicos duplicados, 
                mantendo apenas o cliente mais antigo de cada grupo. Clientes com dependências (contratos, 
                demandas, etc.) não serão removidos.
              </Typography>
            </Alert>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              A limpeza irá:
            </Typography>
            
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <li>Identificar clientes com grupos econômicos duplicados</li>
              <li>Verificar dependências antes de remover</li>
              <li>Manter o cliente mais antigo de cada grupo</li>
              <li>Fornecer relatório detalhado da operação</li>
            </Box>
            
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Seguro:</strong> Apenas duplicatas sem dependências serão removidas automaticamente.
              </Typography>
            </Alert>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body1">
              Executando limpeza de duplicatas...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Erro:</strong> {error}
            </Typography>
          </Alert>
        )}

        {result && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Limpeza concluída!</strong> {result.message}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip 
                label={`${result.duplicatasRemovidas || 0} removidas`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`${result.duplicatasComDependencias || 0} com dependências`} 
                color="warning" 
                variant="outlined"
              />
            </Box>

            {result.detalhes && result.detalhes.removidas.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  ✅ Clientes Removidos ({result.detalhes.removidas.length}):
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                  {result.detalhes.removidas.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item.nome} (Grupo: {item.grupoEconomico})
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {result.detalhes && result.detalhes.comDependencias.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  ⚠️ Clientes com Dependências ({result.detalhes.comDependencias.length}):
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                  {result.detalhes.comDependencias.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item.nome} (Grupo: {item.grupoEconomico}) - {item.dependencias.total} dependência(s)
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose}
          size="medium"
          className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
            }
          }}
        >
          {result || error ? 'Fechar' : 'Cancelar'}
        </Button>
        
        {!result && !error && !loading && (
          <Button 
            variant="contained" 
            onClick={handleCleanup}
            size="medium"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
            sx={{
              borderRadius: '14px',
              padding: '10px 20px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              height: '44px',
              minWidth: '140px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 4px 14px 0 rgba(220, 38, 38, 0.25)',
              '&:hover': {
                boxShadow: '0 8px 25px 0 rgba(220, 38, 38, 0.35)',
                transform: 'translateY(-2px)',
                background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'
              }
            }}
          >
            Executar Limpeza
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
