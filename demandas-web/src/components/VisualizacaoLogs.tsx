import React, { useState } from 'react'
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Box,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material'
import { 
  Visibility, 
  People, 
  TrendingUp, 
  Schedule,
  ExpandMore,
  ExpandLess,
  Info,
  Person,
  CalendarToday,
  Computer
} from '@mui/icons-material'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useAuthStore } from '../store/authStore'

interface VisualizacaoLogsProps {
  comunicadoId: string
}

export function VisualizacaoLogs({ comunicadoId }: VisualizacaoLogsProps) {
  const [expanded, setExpanded] = useState(false)
  const comunicadoStore = useComunicadoStore()
  const { user } = useAuthStore()
  
  console.log('🔍 VisualizacaoLogs: Renderizando...')
  console.log('🔍 VisualizacaoLogs: ComunicadoId:', comunicadoId)
  console.log('🔍 VisualizacaoLogs: User:', user)
  console.log('🔍 VisualizacaoLogs: User role:', user?.role)
  
  // As permissões são controladas pelo painel de usuário, não por código
  const hasPermission = true

  console.log('🔍 VisualizacaoLogs: Has permission:', hasPermission)

  if (!hasPermission) {
    return null
  }
  
  const comunicado = comunicadoStore.items.find(c => c.id === comunicadoId)
  console.log('🔍 VisualizacaoLogs: Comunicado encontrado:', comunicado)
  
  if (!comunicado) {
    console.log('🔍 VisualizacaoLogs: Comunicado não encontrado, retornando null')
    return null
  }
  
  const estatisticas = comunicadoStore.getEstatisticasVisualizacao(comunicadoId)
  const visualizacoes = comunicado.visualizacoes || []
  
  console.log('🔍 VisualizacaoLogs: Estatísticas:', estatisticas)
  console.log('🔍 VisualizacaoLogs: Visualizações:', visualizacoes)
  
  // Retornar componente simplificado para teste
  return (
    <Paper className="p-6">
      <Typography variant="h6" className="font-semibold mb-4">
        Logs de Visualização (Teste)
      </Typography>
      <Typography variant="body2" className="text-gray-600">
        Comunicado ID: {comunicadoId}
      </Typography>
      <Typography variant="body2" className="text-gray-600">
        Total de visualizações: {estatisticas.totalVisualizacoes}
      </Typography>
      <Typography variant="body2" className="text-gray-600">
        Usuário logado: {user?.name} ({user?.role})
      </Typography>
    </Paper>
  )
}
