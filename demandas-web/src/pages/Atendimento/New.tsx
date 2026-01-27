import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Autocomplete, Button, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Paper, Typography, Box } from '@mui/material'
import { ArrowBack, Save } from '@mui/icons-material'
import { useAtendimentoStore, type AtendimentoEntry } from '../../store/atendimentoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { createPerfLogger } from '../../utils/perf'
import { AsyncClienteAutocomplete, type ClienteOption } from '../../components/AsyncClienteAutocomplete'
import { AsyncContratoAutocomplete } from '../../components/AsyncContratoAutocomplete'


// Schema de validação com Zod
const atendimentoSchema = z.object({
  // Campos obrigatórios conforme AtendimentoEntry
  ticket: z.string().min(1, 'Ticket é obrigatório'),
  analista: z.string().min(1, 'Analista é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  tipoServico: z.string().min(1, 'Tipo de Serviço é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  solicitante: z.string().min(1, 'Solicitante é obrigatório'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  // Campos opcionais
  cliente: z.string().optional(),
  operadora: z.string().optional(),
  area: z.string().optional(),
  contrato: z.string().optional(),
  produto: z.string().optional(),
  sistema: z.string().optional(),
  dataFinal: z.string().optional(),
  periodicidade: z.string().optional(),
  qtdRetornos: z.number().optional(),
  qualidade: z.string().optional(),
  observacoes: z.string().optional()
})

type AtendimentoFormData = z.infer<typeof atendimentoSchema>

export default function AtendimentoNewPage() {
  const navigate = useNavigate()
  const atendimentoStore = useAtendimentoStore()
  const masterDataStore = useMasterDataStore()
  const { user } = useAuthStore()

  const { control, handleSubmit, watch, formState: { errors }, setValue } = useForm<AtendimentoFormData>({
    resolver: zodResolver(atendimentoSchema),
    defaultValues: {
      ticket: 'TICKET-' + Date.now(),
      cliente: '',
      contrato: '',
      operadora: '',
      produto: '',
      sistema: '',
      area: '',
      analista: '',
      tipoServico: '',
      tipo: '',
      descricao: '',
      solicitante: '',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFinal: '',
      periodicidade: '',
      qtdRetornos: 0,
      qualidade: '',
      observacoes: ''
    }
  })
  const perfRef = useRef(createPerfLogger('Atendimento/Novo'))
  const perfReadyRef = useRef(false)

  // Observar o valor do campo tipoServico para filtrar tipos de demanda
  const tipoServicoValue = useWatch({ control, name: 'tipoServico' })
  
  // Cliente selecionado para filtro de contratos
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null)

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    if (perfReadyRef.current) return
    if (masterDataStore.analistas.length && masterDataStore.tiposServico.length && masterDataStore.sistemas.length) {
      perfReadyRef.current = true
      perfRef.current.log('data-ready', {
        analistas: masterDataStore.analistas.length,
        tiposServico: masterDataStore.tiposServico.length,
        sistemas: masterDataStore.sistemas.length
      })
    }
  }, [masterDataStore.analistas.length, masterDataStore.tiposServico.length, masterDataStore.sistemas.length])
  
  // Limpar contrato quando cliente mudar
  useEffect(() => {
    if (selectedClienteId) {
      console.log('🔄 ATENDIMENTO - Cliente mudou, limpando contrato selecionado')
      setValue('contrato', '')
    }
  }, [selectedClienteId, setValue])
  
  // Log de erros de validação
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('❌ AtendimentoNewPage: Erros de validação encontrados:', errors)
    }
  }, [errors])

  useEffect(() => {
    console.log('🔧 AtendimentoNewPage: Sincronização desabilitada - causando problemas de memória')
    // TODO: Implementar sistema mais leve no futuro
    // if (masterDataStore.syncFromApi) {
    //   masterDataStore.syncFromApi()
    // }
  }, [])

  // Preencher automaticamente o analista correspondente ao usuário logado
  useEffect(() => {
    if (user && user.name && masterDataStore.analistas.length > 0) {
      // Encontrar analista correspondente
      const analistaCorrespondente = masterDataStore.analistas.find(analista => 
        analista.nome.toLowerCase() === user.name.toLowerCase() ||
        analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(analista.nome.toLowerCase())
      )
      
      if (analistaCorrespondente) {
        setValue('analista', analistaCorrespondente.id)
      } else {
        // Se não encontrar correspondência, usar o primeiro analista
        const primeiroAnalista = masterDataStore.analistas[0]
        setValue('analista', primeiroAnalista?.id || '')
      }
    }
  }, [user, masterDataStore.analistas, setValue])

  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET ATENDIMENTO: Verificando se ticket existe:', ticket)
      
      // Buscar no banco de dados via API - usando a mesma abordagem das outras páginas
      const baseUrl = 'https://nigteste-production.up.railway.app'
      const response = await fetch(`${baseUrl}/atendimentos?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const exists = Array.isArray(data) ? data.length > 0 : data !== null
        
        console.log('🔍 VALIDAÇÃO TICKET ATENDIMENTO: Resultado da busca:', {
          ticket,
          responseStatus: response.status,
          dataLength: Array.isArray(data) ? data.length : 'not array',
          exists,
          endpoint: '/atendimentos'
        })
        
        return exists
      } else {
        console.warn('⚠️ VALIDAÇÃO TICKET ATENDIMENTO: Erro na API:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET ATENDIMENTO: Erro ao verificar ticket:', error)
      return false
    }
  }

  const onSubmit = async (data: AtendimentoFormData) => {
    try {
      // VALIDAÇÃO DE TICKET DUPLICADO
      if (data.ticket && data.ticket.trim() !== '') {
        console.log('🔍 VALIDAÇÃO TICKET ATENDIMENTO: Verificando ticket fornecido pelo usuário...')
        const ticketExists = await checkTicketExists(data.ticket.trim())
        
        if (ticketExists) {
          console.error('❌ VALIDAÇÃO TICKET ATENDIMENTO: Ticket já existe no banco de dados!')
          alert(`ERRO: O ticket "${data.ticket.trim()}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
          return
        } else {
          console.log('✅ VALIDAÇÃO TICKET ATENDIMENTO: Ticket único, pode prosseguir')
        }
      }
      
      // Usar o store para criar o atendimento (simplificado como na página de demandas)
      const createdAtendimento = await atendimentoStore.add(data as Omit<AtendimentoEntry, 'id' | 'createdAt' | 'updatedAt'>, user)
      
      // Redirecionar imediatamente como na página de demandas
      navigate('/atendimento')
    } catch (error) {
      console.error('❌ AtendimentoNewPage: Erro ao criar atendimento:', error)
      alert('Erro ao criar atendimento: ' + error.message)
    }
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/atendimento')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowBack className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Atendimento</h1>
          <p className="text-gray-600 mt-2">Crie um novo atendimento no sistema</p>
        </div>
      </div>


      {/* Formulário */}
      <Paper className="p-6">
        <form onSubmit={(e) => {
          console.log('🔍 AtendimentoNewPage: Form submit event disparado')
          handleSubmit(onSubmit)(e)
        }} className="space-y-6">
          <Grid container spacing={3}>
            {/* Primeiro Tópico: Informações Básicas do Atendimento */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}>
                1. Informações Básicas do Atendimento
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="ticket"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Ticket"
                    error={!!errors.ticket}
                    helperText={errors.ticket?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="solicitante"
                control={control}
                rules={{ required: 'Solicitante é obrigatório' }}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={masterDataStore.solicitantes}
                    getOptionLabel={(option) => option?.nome || ''}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    value={masterDataStore.solicitantes.find(s => s.id === field.value) || null}
                    onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Solicitante *"
                        fullWidth
                        error={!!errors.solicitante}
                        helperText={errors.solicitante?.message || 'Digite para buscar um solicitante'}
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
                    loading={masterDataStore.solicitantes.length === 0}
                    loadingText="Carregando solicitantes..."
                    filterOptions={(options, { inputValue }) => {
                      const term = inputValue.toLowerCase()
                      return options.filter(option =>
                        option.nome.toLowerCase().includes(term)
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="analista"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Analista *"
                    error={!!errors.analista}
                    helperText={errors.analista?.message || `Analista vinculado ao usuário: ${user?.name || 'Carregando...'}`}
                    InputProps={{
                      readOnly: true
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        backgroundColor: '#f5f5f5',
                        cursor: 'not-allowed'
                      }
                    }}
                  >
                    {masterDataStore.analistas.length > 0 ? (
                      masterDataStore.analistas.map(analista => (
                        <MenuItem key={analista.id} value={analista.id}>
                          {analista.nome}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>Carregando analistas...</MenuItem>
                    )}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="tipoServico"
                control={control}
                rules={{ required: 'Tipo de Serviço é obrigatório' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.tipoServico}>
                    <InputLabel>Tipo de Serviço *</InputLabel>
                    <Select {...field} label="Tipo de Serviço *">
                      <MenuItem value="">Selecione...</MenuItem>
                      <MenuItem value="duvida">Dúvida</MenuItem>
                      <MenuItem value="solicitacao">Solicitação</MenuItem>
                      <MenuItem value="incidente">Incidente</MenuItem>
                    </Select>
                    {errors.tipoServico && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.tipoServico.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.tipo}>
                    <InputLabel>Canal de Atendimento *</InputLabel>
                    <Select {...field} label="Canal de Atendimento *">
                      <MenuItem value="">Selecione...</MenuItem>
                      <MenuItem value="teams">Teams</MenuItem>
                      <MenuItem value="email">E-mail</MenuItem>
                      <MenuItem value="ligacao">Ligação</MenuItem>
                      <MenuItem value="mensagem">Mensagem</MenuItem>
                    </Select>
                    {errors.tipo && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.tipo.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="dataInicio"
                control={control}
                rules={{ required: 'Data de Início é obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Data de Início *"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.dataInicio}
                    helperText={errors.dataInicio?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="dataFinal"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Data Final"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Segundo Tópico: Informações do Cliente e Contrato */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
                2. Informações do Cliente e Contrato
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="cliente"
                control={control}
                render={({ field }) => (
                  <AsyncClienteAutocomplete
                    valueId={field.value}
                    onChangeId={(nextId) => {
                      field.onChange(nextId)
                      setValue('contrato', '')
                    }}
                    label="Cliente"
                    helperText="Digite para buscar um cliente"
                    onSelectOption={setSelectedCliente}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="contrato"
                control={control}
                render={({ field }) => (
                  <AsyncContratoAutocomplete
                    valueId={field.value}
                    onChangeId={field.onChange}
                    label="Contrato"
                    disabled={!selectedClienteId}
                    clienteId={selectedClienteId}
                    grupoEconomico={selectedCliente?.grupoEconomico || null}
                  />
                )}
              />
            </Grid>

            {/* Operadora e Produto */}
            <Grid item xs={12} md={6}>
              <Controller
                name="operadora"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={masterDataStore.operadoras}
                    getOptionLabel={(option) => option.nome || ''}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    value={masterDataStore.operadoras.find(o => o.id === field.value) || null}
                    onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Operadora"
                        fullWidth
                        helperText="Digite para buscar uma operadora"
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
                    noOptionsText="Nenhuma operadora encontrada"
                    loading={masterDataStore.operadoras.length === 0}
                    loadingText="Carregando operadoras..."
                    filterOptions={(options, { inputValue }) => {
                      const filtered = options.filter(option =>
                        option.nome.toLowerCase().includes(inputValue.toLowerCase())
                      )
                      return filtered
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="produto"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Produto</InputLabel>
                    <Select {...field} label="Produto">
                      {masterDataStore.produtos.map(produto => (
                        <MenuItem key={produto.id} value={produto.id}>
                          {produto.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Sistema e Área */}
            <Grid item xs={12} md={6}>
              <Controller
                name="sistema"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Sistema</InputLabel>
                    <Select {...field} label="Sistema">
                      {masterDataStore.sistemas.map(sistema => (
                        <MenuItem key={sistema.id} value={sistema.id}>
                          {sistema.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="area"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Área</InputLabel>
                    <Select {...field} label="Área">
                      {masterDataStore.areas.map(area => (
                        <MenuItem key={area.id} value={area.id}>
                          {area.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Terceiro Tópico: Análise e Descrição */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
                3. Análise e Descrição
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="qualidade"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Qualidade</InputLabel>
                    <Select {...field} label="Qualidade">
                      <MenuItem value="Baixa">Baixa</MenuItem>
                      <MenuItem value="Média">Média</MenuItem>
                      <MenuItem value="Alta">Alta</MenuItem>
                      <MenuItem value="Crítica">Crítica</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="qtdRetornos"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Quantidade de Retornos"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="descricao"
                control={control}
                rules={{ required: 'Descrição é obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label="Descrição *"
                    error={!!errors.descricao}
                    helperText={errors.descricao?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="observacoes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Botões */}
          <Box className="flex justify-end gap-3 pt-6">
            <Button
              variant="outlined"
              onClick={() => navigate('/atendimento')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
            >
              Criar Atendimento
            </Button>
          </Box>
        </form>
      </Paper>
    </div>
  )
}
