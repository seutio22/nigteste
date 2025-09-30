import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Divider
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '../../store/reportStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { ArrowBack, Save, Cancel } from '@mui/icons-material'

export default function AnalyticsNewPage() {
  const navigate = useNavigate()
  const { add } = useReportStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    ticket: '',
    total: '',
    tipo: 'mensal' as const,
    status: 'PENDENTE' as const,
    analista: '',
    area: '',
    cliente: '',
    contrato: '',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFinalizacao: '',
    dataEntrega: new Date().toISOString().split('T')[0],
    prioridade: 'media' as const,
    solicitante: '',
    solicitacao: '',
    tipoSolicitacao: '',
    tipoServico: '',
    observacoes: ''
  })

  // Sincronizar dados mestres quando a página carregar
  useEffect(() => {
    if (md.syncFromApi) {
      console.log('🔄 AnalyticsNewPage: Sincronizando dados mestres...')
      md.syncFromApi()
    }
  }, [])

  // Debug: verificar se os dados estão sendo carregados
  useEffect(() => {
    console.log('🔍 AnalyticsNewPage: Dados mestres carregados:')
    console.log('  - Relatórios:', md.relatorios.length, md.relatorios)
    console.log('  - Solicitantes:', md.solicitantes.length, md.solicitantes)
    console.log('  - Modelos:', md.modelos.length, md.modelos)
  }, [md.relatorios, md.solicitantes, md.modelos])

  // Preencher analista automaticamente baseado no usuário logado
  useEffect(() => {
    console.log('🔄 AnalyticsNewPage: Buscando analista correspondente ao usuário logado')
    console.log('🔄 AnalyticsNewPage: Usuário logado:', user?.name, 'ID:', user?.id)
    
    if (user && user.name && md.analistas.length > 0) {
      // Encontrar analista correspondente
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user.name.toLowerCase() ||
        analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(analista.nome.toLowerCase())
      )
      
      if (analistaCorrespondente) {
        console.log('✅ AnalyticsNewPage: Analista encontrado:', analistaCorrespondente.nome, 'ID:', analistaCorrespondente.id)
        // Só atualizar se o valor for diferente
        if (form.analista !== analistaCorrespondente.id) {
          setForm(prev => ({ ...prev, analista: analistaCorrespondente.id }))
        }
      } else {
        console.log('⚠️ AnalyticsNewPage: Nenhum analista correspondente encontrado, usando primeiro analista')
        const primeiroAnalista = md.analistas[0]
        if (primeiroAnalista && form.analista !== primeiroAnalista.id) {
          setForm(prev => ({ ...prev, analista: primeiroAnalista.id }))
        }
      }
    } else if (md.analistas.length === 0 && form.analista) {
      // Se não há analistas carregados, limpar o valor
      console.log('⚠️ AnalyticsNewPage: Analistas não carregados, limpando valor')
      setForm(prev => ({ ...prev, analista: '' }))
    } else {
      console.log('⚠️ AnalyticsNewPage: Usuário não logado ou analistas não carregados')
    }
  }, [user, md.analistas])

  // Filtrar contratos por cliente selecionado (igual à página cadastro)
  const selectedClienteId = form.cliente
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  const contratosDoCliente = md.contratos.filter((c: any) => 
    c.clienteId === selectedClienteId || 
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente)
  )

  // Limpar contrato quando cliente for alterado
  useEffect(() => {
    if (selectedClienteId !== form.contrato) {
      setForm(prev => ({ ...prev, contrato: '' }))
    }
  }, [selectedClienteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.titulo || !form.analista || !form.dataInicio || !form.dataEntrega) {
      alert('Preencha os campos obrigatórios')
      return
    }

    try {
      const newReport = await add({
        titulo: form.titulo,
        descricao: form.descricao,
        ticket: form.ticket,
        total: form.total,
        tipo: form.tipo,
        status: form.status,
        analista: form.analista,
        area: form.area,
        cliente: form.cliente,
        contrato: form.contrato,
        dataInicio: form.dataInicio,
        dataFinalizacao: form.dataFinalizacao,
        dataEntrega: form.dataEntrega,
        prioridade: form.prioridade,
        solicitante: form.solicitante,
        solicitacao: form.solicitacao,
        tipoSolicitacao: form.tipoSolicitacao,
        tipoServico: form.tipoServico,
        observacoes: form.observacoes
      })

      // Adicionar evento de criação na timeline
      const { addTimelineEvent } = useReportStore.getState()
      addTimelineEvent({
        reportId: newReport.id,
        type: 'created',
        message: `Relatório "${newReport.titulo}" foi criado`,
        user: 'Sistema'
      })

      navigate('/analytics')
    } catch (error) {
      console.error('Erro ao criar relatório:', error)
      alert('Erro ao criar relatório')
    }
  }


  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/analytics')}
            variant="outlined"
          >
            Voltar
          </Button>
          <Typography variant="h5">Novo Relatório</Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Informações Básicas */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Informações Básicas
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Título do Relatório *"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Descrição"
                  value={form.descricao}
                  onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                  multiline
                  rows={3}
                />
                
                <TextField
                  fullWidth
                  label="Ticket"
                  value={form.ticket}
                  onChange={(e) => setForm(prev => ({ ...prev, ticket: e.target.value }))}
                  placeholder="Número do ticket"
                />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Periodicidade *</InputLabel>
                      <Select
                        value={form.tipo}
                        label="Periodicidade *"
                        onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                        required
                      >
                        <MenuItem value="diaria">Diária</MenuItem>
                        <MenuItem value="mensal">Mensal</MenuItem>
                        <MenuItem value="trimestral">Trimestral</MenuItem>
                        <MenuItem value="semestral">Semestral</MenuItem>
                        <MenuItem value="anual">Anual</MenuItem>
                        <MenuItem value="personalizado">Personalizado</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Prioridade *</InputLabel>
                      <Select
                        value={form.prioridade}
                        label="Prioridade *"
                        onChange={(e) => setForm(prev => ({ ...prev, prioridade: e.target.value as any }))}
                        required
                      >
                        <MenuItem value="baixa">Baixa</MenuItem>
                        <MenuItem value="media">Média</MenuItem>
                        <MenuItem value="alta">Alta</MenuItem>
                        <MenuItem value="urgente">Urgente</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                {/* Campo Status */}
                <FormControl fullWidth>
                  <InputLabel>Status *</InputLabel>
                  <Select
                    value={form.status}
                    label="Status *"
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                    required
                  >
                    <MenuItem value="CONCLUIDO">CONCLUIDO</MenuItem>
                    <MenuItem value="EM ANDAMENTO">EM ANDAMENTO</MenuItem>
                    <MenuItem value="ESPERA DE TERCEIROS">ESPERA DE TERCEIROS</MenuItem>
                    <MenuItem value="PENDENTE">PENDENTE</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            
            {/* Responsabilidade e Cliente */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Responsabilidade e Cliente
              </Typography>
              
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Analista Responsável *</InputLabel>
                  <Select
                    value={form.analista}
                    label="Analista Responsável *"
                    onChange={(e) => setForm(prev => ({ ...prev, analista: e.target.value }))}
                    required
                    disabled
                    sx={{
                      '& .MuiInputBase-input': {
                        backgroundColor: '#f5f5f5',
                        cursor: 'not-allowed'
                      }
                    }}
                  >
                    {md.analistas.length > 0 ? (
                      md.analistas.map(analista => (
                        <MenuItem key={analista.id} value={analista.id}>
                          {analista.nome}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>Carregando analistas...</MenuItem>
                    )}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Analista vinculado ao usuário: {user?.name || 'Carregando...'}
                  </Typography>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Área</InputLabel>
                  <Select
                    value={form.area}
                    label="Área"
                    onChange={(e) => setForm(prev => ({ ...prev, area: e.target.value }))}
                  >
                    {md.areas.map(area => (
                      <MenuItem key={area.id} value={area.id}>
                        {area.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={form.cliente}
                    label="Cliente"
                    onChange={(e) => setForm(prev => ({ ...prev, cliente: e.target.value }))}
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {md.clientes.map(cliente => (
                      <MenuItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Contrato</InputLabel>
                  <Select
                    value={form.contrato}
                    label="Contrato"
                    onChange={(e) => setForm(prev => ({ ...prev, contrato: e.target.value }))}
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {contratosDoCliente.length > 0 ? (
                      contratosDoCliente.map(ct => (
                        <MenuItem key={ct.id} value={ct.id}>
                          {(ct as any).codigo || (ct as any).numero}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        {selectedClienteId ? 'Nenhum contrato encontrado para este cliente' : 'Selecione um cliente primeiro'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            
            {/* Datas */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Cronograma
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Início *"
                  value={form.dataInicio}
                  onChange={(e) => setForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Finalização"
                  value={form.dataFinalizacao}
                  onChange={(e) => setForm(prev => ({ ...prev, dataFinalizacao: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Entrega *"
                  value={form.dataEntrega}
                  onChange={(e) => setForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Stack>
            </Grid>
            
            {/* Solicitação */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Solicitação
              </Typography>
              
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Solicitante</InputLabel>
                  <Select
                    value={form.solicitante}
                    label="Solicitante"
                    onChange={(e) => setForm(prev => ({ ...prev, solicitante: e.target.value }))}
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {md.solicitantes.map(solicitante => (
                      <MenuItem key={solicitante.id} value={solicitante.id}>
                        {solicitante.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Tipo de Solicitação</InputLabel>
                  <Select
                    value={form.tipoSolicitacao}
                    label="Tipo de Solicitação"
                    onChange={(e) => setForm(prev => ({ ...prev, tipoSolicitacao: e.target.value }))}
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {md.relatorios.map(relatorio => (
                      <MenuItem key={relatorio.id} value={relatorio.id}>
                        {relatorio.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Solicitação</InputLabel>
                  <Select
                    value={form.solicitacao}
                    onChange={(e) => setForm(prev => ({ ...prev, solicitacao: e.target.value }))}
                    label="Solicitação"
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {md.modelos.map(modelo => (
                      <MenuItem key={modelo.id} value={modelo.id}>
                        {modelo.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            
            {/* Total */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total (Quantitativo)"
                type="number"
                value={form.total}
                onChange={(e) => setForm(prev => ({ ...prev, total: e.target.value }))}
                placeholder="Quantidade total"
              />
            </Grid>
            
            {/* Observações */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Observações
              </Typography>
              
              <TextField
                fullWidth
                label="Observações Adicionais"
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => navigate('/analytics')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
            >
              Criar Relatório
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
