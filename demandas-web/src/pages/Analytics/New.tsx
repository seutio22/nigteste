import React, { useState, useEffect } from 'react'
import {
  Autocomplete,
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
    status: 'pendente' as const,
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
    console.log('🔄 AnalyticsNewPage: Analistas disponíveis:', md.analistas.length)
    console.log('🔄 AnalyticsNewPage: Lista de analistas:', md.analistas.map(a => `${a.nome} (${a.id})`).join(', '))
    console.log('🔄 AnalyticsNewPage: Analista atual no formulário:', form.analista)
    
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
          console.log('⚙️ AnalyticsNewPage: Atualizando form.analista de', form.analista, 'para', analistaCorrespondente.id)
          setForm(prev => ({ ...prev, analista: analistaCorrespondente.id }))
        } else {
          console.log('✅ AnalyticsNewPage: Analista já está correto no formulário')
        }
      } else {
        console.log('⚠️ AnalyticsNewPage: Nenhum analista correspondente encontrado para usuário:', user.name)
        console.log('⚠️ AnalyticsNewPage: Usando primeiro analista disponível')
        const primeiroAnalista = md.analistas[0]
        if (primeiroAnalista && form.analista !== primeiroAnalista.id) {
          console.log('⚙️ AnalyticsNewPage: Definindo primeiro analista:', primeiroAnalista.nome, 'ID:', primeiroAnalista.id)
          setForm(prev => ({ ...prev, analista: primeiroAnalista.id }))
        }
      }
    } else if (md.analistas.length === 0) {
      // Se não há analistas carregados, aguardar
      console.log('⚠️ AnalyticsNewPage: Analistas ainda não foram carregados')
    } else if (!user || !user.name) {
      console.log('⚠️ AnalyticsNewPage: Usuário não está logado ou nome não disponível')
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

  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Verificando se ticket existe:', ticket)
      
      // Buscar no banco de dados via API (Analytics usa endpoint /analytics que mapeia para report)
      const baseUrl = 'https://nigteste-production.up.railway.app'
      const response = await fetch(`${baseUrl}/analytics?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Resultado completo da busca:', data)
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Tipo do resultado:', typeof data)
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: É array?', Array.isArray(data))
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Tamanho do array:', Array.isArray(data) ? data.length : 'N/A')
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Chaves do objeto:', data && typeof data === 'object' ? Object.keys(data) : 'N/A')
        
        const exists = Array.isArray(data) ? data.length > 0 : data !== null
        
        console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Resultado da busca:', {
          ticket,
          responseStatus: response.status,
          dataLength: Array.isArray(data) ? data.length : 'not array',
          exists
        })
        
        return exists
      } else {
        console.warn('⚠️ VALIDAÇÃO TICKET ANALYTICS: Erro na API:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET ANALYTICS: Erro ao verificar ticket:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 AnalyticsNewPage: Iniciando submit do formulário')
    console.log('🚀 AnalyticsNewPage: Dados do formulário:', JSON.stringify(form, null, 2))
    console.log('🚀 AnalyticsNewPage: Campo analista:', form.analista)
    console.log('🚀 AnalyticsNewPage: Usuário logado:', user?.name, user?.id)
    
    if (!form.titulo || !form.analista || !form.dataInicio || !form.dataEntrega) {
      console.error('❌ AnalyticsNewPage: Validação falhou!')
      console.error('  - Título:', form.titulo || 'VAZIO')
      console.error('  - Analista:', form.analista || 'VAZIO ⚠️')
      console.error('  - Data Início:', form.dataInicio || 'VAZIO')
      console.error('  - Data Entrega Programada:', form.dataEntrega || 'VAZIO')
      alert('Preencha os campos obrigatórios. ATENÇÃO: O campo "Analista" está vazio!')
      return
    }

    // VALIDAÇÃO DE TICKET DUPLICADO
    if (form.ticket && form.ticket.trim() !== '') {
      console.log('🔍 VALIDAÇÃO TICKET ANALYTICS: Verificando ticket fornecido pelo usuário...')
      const ticketExists = await checkTicketExists(form.ticket.trim())
      
      if (ticketExists) {
        console.error('❌ VALIDAÇÃO TICKET ANALYTICS: Ticket já existe no banco de dados!')
        alert(`ERRO: O ticket "${form.ticket.trim()}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
        return
      } else {
        console.log('✅ VALIDAÇÃO TICKET ANALYTICS: Ticket único, pode prosseguir')
      }
    }

    // Validação de datas: Data de Entrega não pode ser inferior à Data de Início
    console.log('🔍 Validando Data de Entrega Programada:', form.dataEntrega, 'vs Data de Início:', form.dataInicio)
    if (form.dataEntrega && form.dataInicio) {
      const dataEntrega = new Date(form.dataEntrega + 'T00:00:00')
      const dataInicio = new Date(form.dataInicio + 'T00:00:00')
      console.log('🔍 Data de Entrega convertida:', dataEntrega)
      console.log('🔍 Data de Início convertida:', dataInicio)
      console.log('🔍 Comparação:', dataEntrega < dataInicio)
      
      if (dataEntrega < dataInicio) {
        console.error('❌ AnalyticsNewPage: Data de Entrega não pode ser inferior à Data de Início')
        alert('⚠️ Data de Entrega não pode ser inferior à Data de Início!\n\n' +
              `Data de Início: ${form.dataInicio}\n` +
              `Data de Entrega Programada: ${form.dataEntrega}`)
        return
      }
    }

    // Validação de datas: Data de Finalização não pode ser inferior à Data de Início
    console.log('🔍 Validando Data de Finalização:', form.dataFinalizacao, 'vs Data de Início:', form.dataInicio)
    if (form.dataFinalizacao && form.dataInicio) {
      const dataFinalizacao = new Date(form.dataFinalizacao + 'T00:00:00')
      const dataInicio = new Date(form.dataInicio + 'T00:00:00')
      console.log('🔍 Data de Finalização convertida:', dataFinalizacao)
      console.log('🔍 Data de Início convertida:', dataInicio)
      console.log('🔍 Comparação:', dataFinalizacao < dataInicio)
      
      if (dataFinalizacao < dataInicio) {
        console.error('❌ AnalyticsNewPage: Data de Finalização não pode ser inferior à Data de Início')
        alert('⚠️ Data de Finalização não pode ser inferior à Data de Início!\n\n' +
              `Data de Início: ${form.dataInicio}\n` +
              `Data de Finalização: ${form.dataFinalizacao}`)
        return
      }
    }

    try {
      console.log('✅ AnalyticsNewPage: Validação OK, enviando para API...')
      console.log('✅ AnalyticsNewPage: Analista ID:', form.analista)
      
      // Converter IDs para NOMES (o banco espera String, não ID)
      const analistaNome = md.analistas.find(a => a.id === form.analista)?.nome || form.analista || 'N/A'
      const areaNome = md.areas.find(a => a.id === form.area)?.nome || form.area || ''
      const clienteNome = md.clientes.find(c => c.id === form.cliente)?.nome || form.cliente || ''
      const contratoNome = md.contratos.find(c => c.id === form.contrato)?.codigo || form.contrato || ''
      
      console.log('✅ AnalyticsNewPage: Dados convertidos:', {
        analista: analistaNome,
        area: areaNome,
        cliente: clienteNome,
        contrato: contratoNome
      })
      
      const newReport = await add({
        titulo: form.titulo,
        descricao: form.descricao,
        // Converter ticket vazio para null para evitar problemas no banco
        ticket: form.ticket && form.ticket.trim() !== '' ? form.ticket.trim() : null,
        total: form.total,
        tipo: form.tipo,
        status: form.status,
        analista: analistaNome, // NOME
        area: areaNome, // NOME
        cliente: clienteNome, // NOME
        contrato: contratoNome, // NOME
        dataInicio: form.dataInicio,
        dataFinalizacao: form.dataFinalizacao,
        dataEntrega: form.dataEntrega,
        prioridade: form.prioridade,
        solicitante: form.solicitante,
        solicitacao: form.solicitacao,
        tipoSolicitacao: form.tipoSolicitacao,
        observacoes: form.observacoes
      })
      
      console.log('✅ AnalyticsNewPage: Relatório criado com sucesso:', newReport.id)
      console.log('✅ AnalyticsNewPage: Analista salvo:', newReport.analista)

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
                        <MenuItem value="semanal">Semanal</MenuItem>
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
                    <MenuItem value="TRANSF. ANALISTA">TRANSF. ANALISTA</MenuItem>
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
                
                <Autocomplete
                  options={md.clientes}
                  getOptionLabel={(option) => option.nome || ''}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  value={md.clientes.find(c => c.id === form.cliente) || null}
                  onChange={(_, newValue) => setForm(prev => ({ ...prev, cliente: newValue?.id || '' }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente"
                      fullWidth
                      placeholder="Digite para buscar..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {option.nome}
                        </Typography>
                        {option.grupoEconomico && (
                          <Typography variant="caption" color="text.secondary">
                            Grupo: {option.grupoEconomico}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  noOptionsText="Nenhum cliente encontrado"
                  loading={md.clientes.length === 0}
                  loadingText="Carregando clientes..."
                  filterOptions={(options, { inputValue }) => {
                    const filtered = options.filter(option =>
                      option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                      (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(inputValue.toLowerCase()))
                    )
                    return filtered
                  }}
                />
                
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
                  error={form.dataFinalizacao && form.dataInicio && new Date(form.dataFinalizacao + 'T00:00:00') < new Date(form.dataInicio + 'T00:00:00')}
                  helperText={
                    form.dataFinalizacao && form.dataInicio && new Date(form.dataFinalizacao + 'T00:00:00') < new Date(form.dataInicio + 'T00:00:00')
                      ? '⚠️ Data de Finalização não pode ser inferior à Data de Início'
                      : 'Data de Finalização não pode ser inferior à Data de Início'
                  }
                />
                
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Entrega Programada *"
                  value={form.dataEntrega}
                  onChange={(e) => setForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  error={form.dataEntrega && form.dataInicio && new Date(form.dataEntrega + 'T00:00:00') < new Date(form.dataInicio + 'T00:00:00')}
                  helperText={
                    form.dataEntrega && form.dataInicio && new Date(form.dataEntrega + 'T00:00:00') < new Date(form.dataInicio + 'T00:00:00')
                      ? '⚠️ Data de Entrega Programada não pode ser inferior à Data de Início'
                      : 'Data de Entrega Programada não pode ser inferior à Data de Início'
                  }
                />
              </Stack>
            </Grid>
            
            {/* Solicitação */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Solicitação
              </Typography>
              
              <Stack spacing={2}>
                <Autocomplete
                  options={md.solicitantes}
                  value={md.solicitantes.find(s => s.id === form.solicitante) || null}
                  onChange={(_, newValue) =>
                    setForm(prev => ({ ...prev, solicitante: newValue?.id || '' }))
                  }
                  getOptionLabel={(option) => option?.nome || ''}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Solicitante"
                      placeholder="Digite para buscar..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Typography variant="body1" fontWeight="medium">
                        {option.nome}
                      </Typography>
                    </Box>
                  )}
                  noOptionsText="Nenhum solicitante encontrado"
                  loading={md.solicitantes.length === 0}
                  loadingText="Carregando solicitantes..."
                  filterOptions={(options, { inputValue }) => {
                    const term = inputValue.toLowerCase()
                    return options.filter(option =>
                      option.nome.toLowerCase().includes(term)
                    )
                  }}
                />
                
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
