/**
 * 🧪 COMPONENTE DE TESTE DE SEGURANÇA
 * 
 * Componente para testar se a limpeza do logout está funcionando corretamente.
 * Deve ser removido em produção.
 */

import React, { useState } from 'react'
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material'
import { Security, Delete, CheckCircle, Warning } from '@mui/icons-material'
import { checkSystemDataInStorage, clearAllSystemData } from '../utils/logoutCleanup'

export function SecurityTest() {
  const [systemKeys, setSystemKeys] = useState<string[]>([])
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkStorage = () => {
    const keys = checkSystemDataInStorage()
    setSystemKeys(keys)
    setLastCheck(new Date())
    console.log('🔍 Dados do sistema no localStorage:', keys)
  }

  const testCleanup = () => {
    console.log('🧪 Testando limpeza completa...')
    clearAllSystemData()
    checkStorage()
    console.log('✅ Teste de limpeza concluído')
  }

  const getStatusColor = (count: number) => {
    if (count === 0) return 'success'
    if (count < 5) return 'warning'
    return 'error'
  }

  const getStatusIcon = (count: number) => {
    if (count === 0) return <CheckCircle />
    if (count < 5) return <Warning />
    return <Security />
  }

  return (
    <Card sx={{ maxWidth: 800, margin: '20px auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Security color="primary" />
          <Typography variant="h6">Teste de Segurança - Logout</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Este componente testa se a limpeza do logout está funcionando corretamente.
          <strong> Deve ser removido em produção!</strong>
        </Alert>

        <Box display="flex" gap={2} mb={3}>
          <Button 
            variant="contained" 
            startIcon={<Security />}
            onClick={checkStorage}
          >
            Verificar localStorage
          </Button>
          
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<Delete />}
            onClick={testCleanup}
          >
            Testar Limpeza
          </Button>
        </Box>

        {lastCheck && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Última verificação: {lastCheck.toLocaleString()}
            </Typography>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {getStatusIcon(systemKeys.length)}
          <Typography variant="h6">
            Dados do Sistema no localStorage: 
            <Chip 
              label={systemKeys.length} 
              color={getStatusColor(systemKeys.length)}
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>

        {systemKeys.length === 0 ? (
          <Alert severity="success">
            ✅ Perfeito! Nenhum dado do sistema encontrado no localStorage.
            O logout está funcionando corretamente.
          </Alert>
        ) : (
          <Alert severity="warning">
            ⚠️ Encontrados {systemKeys.length} itens do sistema no localStorage.
            Isso pode indicar um problema de segurança.
          </Alert>
        )}

        {systemKeys.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Chaves encontradas:
            </Typography>
            <List dense>
              {systemKeys.map((key, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={key}
                    secondary="Dados sensíveis que deveriam ter sido removidos"
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Como testar:
          </Typography>
          <Typography variant="body2" component="div">
            1. Faça login no sistema<br/>
            2. Navegue por algumas páginas<br/>
            3. Clique em "Verificar localStorage"<br/>
            4. Faça logout<br/>
            5. Clique em "Verificar localStorage" novamente<br/>
            6. Deve mostrar 0 itens
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
