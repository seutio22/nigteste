import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { getApi } from '../lib/apiConfig'

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

export const DataCleanup: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, CleanupResult | null>>({})
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async (type: string, endpoint: string) => {
    setLoading(type)
    setError(null)
    
    try {
      console.log(`🧹 Iniciando limpeza: ${type}`)
      const api = getApi()
      const result = await api[endpoint]()
      
      console.log(`✅ Resultado da limpeza ${type}:`, result)
      
      setResults(prev => ({
        ...prev,
        [type]: result
      }))
      
    } catch (err) {
      console.error(`❌ Erro na limpeza ${type}:`, err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(null)
    }
  }

  const cleanupActions = [
    {
      id: 'duplicatas-clientes',
      title: 'Limpar Grupos Econômicos Duplicados',
      description: 'Remove clientes com grupos econômicos duplicados (mantém o mais antigo)',
      endpoint: 'limparDuplicatasClientes',
      color: 'primary' as const,
      warning: 'Esta ação remove clientes duplicados. Clientes com dependências (contratos, demandas, etc.) não serão removidos.'
    },
    {
      id: 'demandas-simples',
      title: 'Limpar Demandas Simples',
      description: 'Remove demandas vazias ou sem dados operacionais',
      endpoint: 'limparDemandasSimples',
      color: 'secondary' as const,
      warning: 'Esta ação remove demandas que não possuem dados relevantes.'
    },
    {
      id: 'contratos-orfaos',
      title: 'Limpar Contratos Órfãos',
      description: 'Remove contratos que referenciam clientes inexistentes',
      endpoint: 'limparContratosOrfaos',
      color: 'warning' as const,
      warning: 'Esta ação remove contratos que não possuem cliente válido associado.'
    }
  ]

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🧹 Limpeza de Dados
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Ferramentas para limpar e organizar dados duplicados ou inconsistentes no sistema.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Erro:</strong> {error}
          </Typography>
        </Alert>
      )}

      {cleanupActions.map((action) => (
        <Card key={action.id} sx={{ mb: 3 }}>
          <CardHeader>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {action.title}
              {results[action.id] && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Concluído"
                  color="success"
                  size="small"
                />
              )}
            </Typography>
          </CardHeader>
          
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {action.description}
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon />
                <Typography variant="body2">
                  {action.warning}
                </Typography>
              </Box>
            </Alert>

            <Button
              variant="contained"
              color={action.color}
              onClick={() => handleCleanup(action.id, action.endpoint)}
              disabled={loading === action.id}
              startIcon={loading === action.id ? <CircularProgress size={20} /> : null}
              sx={{ mb: 2 }}
            >
              {loading === action.id ? 'Executando...' : 'Executar Limpeza'}
            </Button>

            {results[action.id] && (
              <Box>
                <Divider sx={{ my: 2 }} />
                
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Resultado:</strong> {results[action.id]!.message}
                  </Typography>
                </Alert>

                {action.id === 'duplicatas-clientes' && results[action.id]!.detalhes && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Ver Detalhes ({results[action.id]!.duplicatasRemovidas} removidas, {results[action.id]!.duplicatasComDependencias} com dependências)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                          ✅ Removidas ({results[action.id]!.detalhes!.removidas.length}):
                        </Typography>
                        {results[action.id]!.detalhes!.removidas.map((item, index) => (
                          <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                            • {item.nome} (Grupo: {item.grupoEconomico})
                          </Typography>
                        ))}
                      </Box>

                      {results[action.id]!.detalhes!.comDependencias.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="warning.main" gutterBottom>
                            ⚠️ Com Dependências ({results[action.id]!.detalhes!.comDependencias.length}):
                          </Typography>
                          {results[action.id]!.detalhes!.comDependencias.map((item, index) => (
                            <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                              • {item.nome} (Grupo: {item.grupoEconomico}) - {item.dependencias.total} dependência(s)
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Informações Importantes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • As operações de limpeza são executadas de forma segura, verificando dependências antes de remover dados<br/>
            • Dados com dependências (contratos, demandas, etc.) não serão removidos automaticamente<br/>
            • Recomenda-se executar essas operações durante períodos de baixa atividade<br/>
            • Sempre faça backup dos dados antes de executar operações de limpeza em massa
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
