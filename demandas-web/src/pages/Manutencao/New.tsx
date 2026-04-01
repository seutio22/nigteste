import React, { useState, useEffect, useRef } from 'react'
import { Autocomplete, Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, FormControl, InputLabel, Select, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { createPerfLogger } from '../../utils/perf'
import { AsyncClienteAutocomplete, type ClienteOption } from '../../components/AsyncClienteAutocomplete'
import { AsyncContratoAutocomplete } from '../../components/AsyncContratoAutocomplete'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'

const schema = z.object({
  // Campos obrigatórios - igual à página de cadastro
  status: z.string().min(1, 'Obrigatório'),
  tipoServico: z.string().min(1, 'Tipo de serviço é obrigatório'),
  tipo: z.string().min(1, 'Tipo de manutenção é obrigatório'),

  // Demais campos opcionais
  descricao: z.string().optional(),
  analista: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFinal: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  area: z.string().optional(),
  cliente: z.string().optional(),
  contrato: z.string().optional(),
  operadora: z.string().optional(),
  produto: z.string().optional(),
  sistema: z.string().optional(),
  qtdRetornos: z.coerce.number().min(0).optional(),
  qualidade: z.string().optional(),
  total: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const listas = {
  status: ['Aberta', 'Em andamento', 'Transf. Analista', 'Aguardando validação', 'Com erros', 'Concluída', 'Cancelada'],
  qualidade: [
    { value: '0', label: '0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO' },
    { value: '1', label: '1 - MEDIANO - NO MÁX 2 RETORNOS' },
    { value: '2', label: '2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS' },
    { value: '3', label: '3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO' }
  ],
}

export default function ManutencaoNewPage() {
  const navigate = useNavigate()
  const { control, handleSubmit, formState: { errors, isValid }, setValue } = useForm<FormValues>({ 
    resolver: zodResolver(schema), 
    mode: 'onChange',
    defaultValues: {
      // Campos obrigatórios
      status: 'Aberta',
      tipoServico: '',
      tipo: '',
      
      // Campos opcionais - iniciar com string vazia para evitar undefined
      descricao: '',
      analista: '',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFinal: '',
      ticket: '',
      solicitante: '',
      area: '',
      cliente: '',
      contrato: '',
      operadora: '',
      produto: '',
      sistema: '',
      qtdRetornos: 0,
      qualidade: '',
      total: 0,
      observacoes: '',
    }
  })
  const perfRef = useRef(createPerfLogger('Manutencao/Novo'))
  const perfReadyRef = useRef(false)
  const md = useMasterDataStore()
  const manutencaoStore = useManutencaoStore()
  const { user } = useAuthStore()
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null)
  
  const selectedTipoServicoId = useWatch({ control, name: 'tipoServico' })
  const selectedTipoId = useWatch({ control, name: 'tipo' })

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    if (perfReadyRef.current) return
    if (md.analistas.length && md.tiposServico.length && md.sistemas.length) {
      perfReadyRef.current = true
      perfRef.current.log('data-ready', {
        analistas: md.analistas.length,
        tiposServico: md.tiposServico.length,
        sistemas: md.sistemas.length
      })
    }
  }, [md.analistas.length, md.tiposServico.length, md.sistemas.length])
  


  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET MANUTENÇÃO: Verificando se ticket existe:', ticket)
      
      // Buscar no banco de dados via API
      const baseUrl = 'https://nigteste-production.up.railway.app'
      const response = await fetch(`${baseUrl}/manutencoes?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const exists = Array.isArray(data) ? data.length > 0 : data !== null
        
        console.log('🔍 VALIDAÇÃO TICKET MANUTENÇÃO: Resultado da busca:', {
          ticket,
          responseStatus: response.status,
          dataLength: Array.isArray(data) ? data.length : 'not array',
          exists
        })
        
        return exists
      } else {
        console.warn('⚠️ VALIDAÇÃO TICKET MANUTENÇÃO: Erro na API:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET MANUTENÇÃO: Erro ao verificar ticket:', error)
      return false
    }
  }

  // Carregar dados mestres e preencher analista uma única vez
  useEffect(() => {
    const loadDataAndSetAnalista = async () => {
      // Carregar dados mestres se necessário
      if (md.analistas.length === 0 || md.tiposCadastro.length === 0 || md.padrao.length === 0) {
        await md.syncFromApi?.()
      }
      
      // Preencher analista após carregar dados
      if (user && user.name && md.analistas.length > 0) {
        const analistaCorrespondente = md.analistas.find(analista => 
          analista.nome.toLowerCase() === user.name.toLowerCase() ||
          analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(analista.nome.toLowerCase())
        )
        
        if (analistaCorrespondente) {
          setValue('analista', analistaCorrespondente.id)
        } else if (md.analistas.length > 0) {
          setValue('analista', md.analistas[0].id)
        }
      }
    }
    
    loadDataAndSetAnalista()
  }, [user?.id, setValue]) // Apenas quando usuário muda


  async function onSubmit(data: FormValues) {
    try {
      // Verificar se os dados obrigatórios estão carregados
      if (md.tiposCadastro.length === 0 || md.padrao.length === 0) {
        alert('Dados não carregados! Clique em "Forçar Sincronização" para recarregar os dados.')
        return
      }
      
      // Gerar ticket automático se não fornecido
      const generateTicket = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const random = Math.random().toString(36).substr(2, 4).toUpperCase()
        return `MAN-${year}${month}${day}-${random}`
      }

      // Verificar se o usuário forneceu um ticket válido
      const userProvidedTicket = data.ticket && data.ticket.trim() !== ''
      let finalTicket = userProvidedTicket ? data.ticket.trim() : generateTicket()
      
      console.log('🎫 TICKET DEBUG MANUTENÇÃO:', {
        userInput: data.ticket,
        userProvidedTicket,
        finalTicket,
        isAutoGenerated: !userProvidedTicket
      })

      // VALIDAÇÃO DE TICKET DUPLICADO
      if (userProvidedTicket) {
        console.log('🔍 VALIDAÇÃO TICKET MANUTENÇÃO: Verificando ticket fornecido pelo usuário...')
        const ticketExists = await checkTicketExists(finalTicket)
        
        if (ticketExists) {
          console.error('❌ VALIDAÇÃO TICKET MANUTENÇÃO: Ticket já existe no banco de dados!')
          alert(`ERRO: O ticket "${finalTicket}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
          return
        } else {
          console.log('✅ VALIDAÇÃO TICKET MANUTENÇÃO: Ticket único, pode prosseguir')
        }
      } else {
        console.log('🔍 VALIDAÇÃO TICKET MANUTENÇÃO: Ticket gerado automaticamente, verificando unicidade...')
        
        // Para tickets gerados automaticamente, verificar se já existe
        let attempts = 0
        let uniqueTicket = finalTicket
        
        while (await checkTicketExists(uniqueTicket) && attempts < 10) {
          attempts++
          console.log(`🔄 VALIDAÇÃO TICKET MANUTENÇÃO: Tentativa ${attempts} - Ticket "${uniqueTicket}" já existe, gerando novo...`)
          uniqueTicket = generateTicket()
        }
        
        if (attempts >= 10) {
          console.error('❌ VALIDAÇÃO TICKET MANUTENÇÃO: Não foi possível gerar um ticket único após 10 tentativas!')
          alert('ERRO: Não foi possível gerar um ticket único. Tente novamente.')
          return
        }
        
        console.log(`✅ VALIDAÇÃO TICKET MANUTENÇÃO: Ticket único gerado após ${attempts} tentativas: "${uniqueTicket}"`)
        // Atualizar o finalTicket com o ticket único
        finalTicket = uniqueTicket
      }

      // Encontrar analista correspondente ao usuário logado
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
        analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
        (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
      )
      
      // Função helper para converter string vazia em null e sanitizar dados
      const emptyToNull = (value: string | undefined) => {
        if (!value || typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed !== '' ? trimmed : null
      }
      
      // Sanitização dos dados do formulário
      const sanitizedData = {
        ...data,
        tipoServico: emptyToNull(data.tipoServico),
        tipo: emptyToNull(data.tipo),
        cliente: emptyToNull(data.cliente),
        contrato: emptyToNull(data.contrato),
        area: emptyToNull(data.area),
        operadora: emptyToNull(data.operadora),
        produto: emptyToNull(data.produto),
        sistema: emptyToNull(data.sistema)
      }
      
      // Payload para o store - apenas campos obrigatórios e válidos
      const storePayload: any = {
        status: data.status,
        ticket: finalTicket,
        analistaId: analistaCorrespondente?.id || null,
        solicitante: emptyToNull(data.solicitante),
        descricao: data.descricao || null,
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : null,
        dataFinal: data.dataFinal ? new Date(data.dataFinal).toISOString() : null,
        qtdRetornos: data.qtdRetornos || null,
        qualidade: emptyToNull(data.qualidade),
        total: data.total || null,
        observacoes: emptyToNull(data.observacoes),
      }

      // Adicionar apenas IDs válidos (não vazios)
      if (sanitizedData.area) storePayload.areaId = sanitizedData.area
      if (sanitizedData.tipo) storePayload.tipoId = sanitizedData.tipo
      if (sanitizedData.tipoServico) storePayload.tipoServicoId = sanitizedData.tipoServico
      if (sanitizedData.cliente) storePayload.clienteId = sanitizedData.cliente
      if (sanitizedData.contrato) storePayload.contratoId = sanitizedData.contrato
      if (sanitizedData.operadora) storePayload.operadoraId = sanitizedData.operadora
      if (sanitizedData.produto) storePayload.produtoId = sanitizedData.produto
      if (sanitizedData.sistema) storePayload.sistemaId = sanitizedData.sistema
      
      try {
        // Criar manutenção através do store (já adiciona ao store local - sem sync para resposta imediata)
        await manutencaoStore.add(storePayload)
        navigate('/manutencao')
        
      } catch (error) {
        alert('Erro ao criar manutenção. Verifique o console para mais detalhes.')
      }
    } catch (error) {
      alert('Erro ao criar manutenção. Verifique o console para mais detalhes.')
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Nova Manutenção</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Campos marcados com * são obrigatórios: Status, Tipo de serviço e Tipo de manutenção. Demais campos são opcionais.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Primeiro Tópico: Informações Básicas da Manutenção */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}>
              1. Informações Básicas da Manutenção
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="analista" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Analista responsável" 
                fullWidth 
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
                {md.analistas.length > 0 ? (
                  md.analistas.map(analista => (
                    <MenuItem key={analista.id} value={analista.id}>
                      {analista.nome}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Carregando analistas...</MenuItem>
                )}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipoServico" control={control} render={({ field }) => (
              <TextField {...field} select required label="Tipo de serviço *" fullWidth error={!!errors.tipoServico} helperText={errors.tipoServico?.message}>
                {md.tiposCadastro.map(ts => <MenuItem key={ts.id} value={ts.id}>{ts.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipo" control={control} render={({ field }) => (
              <TextField {...field} select label="Tipo de manutenção *" fullWidth error={!!errors.tipo} helperText={errors.tipo?.message}>
                {md.padrao.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} select required label="Status *" fullWidth error={!!errors.status} helperText={errors.status?.message}>
                {listas.status.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="dataInicio" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Data de início" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.dataInicio} helperText={errors.dataInicio?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="dataFinal" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Data de finalização" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.dataFinal} helperText={errors.dataFinal?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Nº Ticket" fullWidth error={!!errors.ticket} helperText={errors.ticket?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="solicitante"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={md.solicitantes}
                  getOptionLabel={(option) => option?.nome || ''}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  value={md.solicitantes.find(s => s.id === field.value) || null}
                  onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Solicitante"
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
                  loading={md.solicitantes.length === 0}
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
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="area" control={control} render={({ field }) => (
              <TextField {...field} select label="Área solicitante" fullWidth error={!!errors.area} helperText={errors.area?.message}>
                {md.areas.map(ar => <MenuItem key={ar.id} value={ar.id}>{ar.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12}>
            <Controller name="descricao" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição da manutenção" fullWidth multiline minRows={3} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>

          {/* Segundo Tópico: Informações do Cliente e Contrato */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              2. Informações do Cliente e Contrato
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="cliente" control={control} render={({ field }) => (
              <AsyncClienteAutocomplete
                valueId={field.value}
                onChangeId={(nextId) => {
                  field.onChange(nextId)
                  setValue('contrato', '')
                }}
                label="Cliente"
                error={!!errors.cliente}
                helperText={errors.cliente?.message || 'Digite para buscar um cliente'}
                onSelectOption={setSelectedCliente}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="contrato" control={control} render={({ field }) => (
              <AsyncContratoAutocomplete
                valueId={field.value}
                onChangeId={field.onChange}
                label="Contrato"
                error={!!errors.contrato}
                helperText={errors.contrato?.message}
                disabled={!selectedClienteId}
                clienteId={selectedClienteId}
                grupoEconomico={selectedCliente?.grupoEconomico || null}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <Autocomplete
                {...field}
                options={md.operadoras}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                value={md.operadoras.find(o => o.id === field.value) || null}
                onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Operadora"
                    fullWidth
                    error={!!errors.operadora}
                    helperText={errors.operadora?.message || 'Digite para buscar uma operadora'}
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
                loading={md.operadoras.length === 0}
                loadingText="Carregando operadoras..."
                filterOptions={(options, { inputValue }) => {
                  const filtered = options.filter(option =>
                    option.nome.toLowerCase().includes(inputValue.toLowerCase())
                  )
                  return filtered
                }}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select label="Produto" fullWidth error={!!errors.produto} helperText={errors.produto?.message}>
                <MenuItem value="">Selecione...</MenuItem>
                {md.produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="sistema" control={control} render={({ field }) => (
              <TextField {...field} select label="Sistema principal" fullWidth error={!!errors.sistema} helperText={errors.sistema?.message}>
                {md.sistemas.map(s => <MenuItem key={s.id} value={s.id}>{s.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>

          {/* Terceiro Tópico: Análise e Métricas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              3. Análise e Métricas
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qtdRetornos" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Qtde de retornos" fullWidth error={!!errors.qtdRetornos} helperText={errors.qtdRetornos?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qualidade" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade" fullWidth error={!!errors.qualidade} helperText={errors.qualidade?.message}>
                {listas.qualidade.map((q) => <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="total" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Total" fullWidth error={!!errors.total} helperText={errors.total?.message} />
            )} />
          </Grid>
          <Grid item xs={12}>
            <Controller name="observacoes" control={control} render={({ field }) => (
              <TextField {...field} label="Observações" fullWidth multiline minRows={2} error={!!errors.observacoes} helperText={errors.observacoes?.message} />
            )} />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={2}>
          <PrimaryActionButton type="button" disabled={!isValid} onClick={handleSubmit(onSubmit)}>Salvar</PrimaryActionButton>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}
