import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Autocomplete, Box, Button, Card, CardContent, Container, Paper, Stack, TextField, Typography, MenuItem, Grid, Divider } from '@mui/material'
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
import { qualidadeFromQtdRetornos } from '../../utils/qualidadeRetornos'

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
  sistemasIds: z.array(z.string()).optional(),
  sistemasTotais: z.record(z.coerce.number().min(0, 'Deve ser um número positivo')).optional(),
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
      sistemasIds: [],
      sistemasTotais: {},
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
  const watchedQtdRetornos = useWatch({ control, name: 'qtdRetornos' })
  const watchedSistemasIds = useWatch({ control, name: 'sistemasIds' }) ?? []
  const watchedSistemasTotais = useWatch({ control, name: 'sistemasTotais' }) ?? {}

  const qualidadeSomenteLeituraLabel = useMemo(() => {
    const code = qualidadeFromQtdRetornos(watchedQtdRetornos)
    if (code === undefined) return '—'
    return listas.qualidade.find((q) => q.value === code)?.label ?? `Código ${code}`
  }, [watchedQtdRetornos])

  const selectedSistemas = useMemo(() => {
    const ids = Array.isArray(watchedSistemasIds) ? watchedSistemasIds : []
    const byId = new Map(md.sistemas.map((s) => [s.id, s]))
    return ids.map((id) => byId.get(id)).filter(Boolean) as typeof md.sistemas
  }, [md.sistemas, watchedSistemasIds])

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    const next = qualidadeFromQtdRetornos(watchedQtdRetornos)
    if (next !== undefined) setValue('qualidade', next, { shouldValidate: true, shouldDirty: true })
  }, [setValue, watchedQtdRetornos])

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
        sistemasIds: Array.isArray(data.sistemasIds) ? data.sistemasIds.filter(Boolean) : [],
        sistemasTotais: (data.sistemasTotais && typeof data.sistemasTotais === 'object') ? data.sistemasTotais : {}
      }
      
      const sistemaPrincipalId = sanitizedData.sistemasIds[0] || null
      const totalSum = sanitizedData.sistemasIds.reduce((acc, sistemaId) => {
        const v = (sanitizedData.sistemasTotais as any)?.[sistemaId]
        const n = typeof v === 'number' && Number.isFinite(v) ? v : 0
        return acc + n
      }, 0)

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
        total: totalSum || null,
        sistemasIds: sanitizedData.sistemasIds.length ? sanitizedData.sistemasIds : null,
        sistemasTotais: Object.keys(sanitizedData.sistemasTotais as any).length ? sanitizedData.sistemasTotais : null,
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
      if (sistemaPrincipalId) storePayload.sistemaId = sistemaPrincipalId
      
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

  /** Campos do formulário: altura confortável; espaçamento vem do Grid (margin none). */
  const formField = { size: 'medium' as const, margin: 'none' as const, fullWidth: true }

  /** Campos longos: área ampla para colar contexto e notas. */
  const longTextFieldSx = {
    '& .MuiInputBase-root': { alignItems: 'flex-start', py: 1.25, minHeight: 48 },
    '& textarea': {
      overflow: 'auto',
      lineHeight: 1.55,
      fontSize: '0.9375rem',
    },
  } as const

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
      <Box sx={{ width: 4, height: 24, borderRadius: 999, bgcolor: 'primary.main', boxShadow: '0 0 0 3px rgba(0,159,223,0.12)' }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', fontSize: '1rem' }}>
        {children}
      </Typography>
    </Box>
  )

  const SubsectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body2" sx={{ display: 'block', mb: 1.25, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.01em', fontSize: '0.8125rem' }}>
      {children}
    </Typography>
  )

  const cardSx = {
    mb: 2.5,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    bgcolor: '#fff',
    boxShadow: '0 2px 16px -6px rgba(15, 23, 42, 0.1)',
    overflow: 'hidden',
  } as const

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        py: 0,
        px: { xs: 0, sm: 0 },
        bgcolor: 'transparent',
        width: '100%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: 0, sm: 3 },
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'rgba(15, 23, 42, 0.06)',
          boxShadow: '0 12px 40px -16px rgba(15, 23, 42, 0.18)',
          width: '100%',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2.25,
            background: 'linear-gradient(125deg, #009FDF 0%, #0077b3 55%, #005a87 100%)',
            color: 'common.white',
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'inherit', lineHeight: 1.2 }}>
                Nova manutenção
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.92, fontWeight: 400, maxWidth: 560 }}>
                Ordem sugerida: identificação → cliente/contrato → sistemas → métricas → descrição e observações. Obrigatórios: tipo de serviço e tipo de manutenção.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            p: { xs: 2.25, sm: 3 },
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.default' : '#f4f7fb'),
          }}
        >
          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Identificação</SectionTitle>
              <Grid container spacing={2.25}>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="analista" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Analista responsável"
                      {...formField}
                      error={!!errors.analista}
                      helperText={errors.analista?.message || `Vinculado: ${user?.name || '…'}`}
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiInputBase-input': { backgroundColor: 'action.hover', cursor: 'not-allowed' },
                      }}
                    >
                      {md.analistas.length > 0 ? (
                        md.analistas.map(analista => (
                          <MenuItem key={analista.id} value={analista.id}>{analista.nome}</MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>Carregando analistas...</MenuItem>
                      )}
                    </TextField>
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="tipoServico" control={control} render={({ field }) => (
                    <TextField {...field} select required label="Tipo de serviço" {...formField} error={!!errors.tipoServico} helperText={errors.tipoServico?.message}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {md.tiposCadastro.map(ts => <MenuItem key={ts.id} value={ts.id}>{ts.nome}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="tipo" control={control} render={({ field }) => (
                    <TextField {...field} select required label="Tipo de manutenção" {...formField} error={!!errors.tipo} helperText={errors.tipo?.message}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {md.padrao.filter((p: any) => p?.ativo !== false).map((p: any) => (
                        <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                      ))}
                    </TextField>
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="status" control={control} render={({ field }) => (
                    <TextField {...field} select required label="Status" {...formField} error={!!errors.status} helperText={errors.status?.message}>
                      {listas.status.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="dataInicio" control={control} render={({ field }) => (
                    <TextField {...field} type="date" label="Data de início" {...formField} InputLabelProps={{ shrink: true }} error={!!errors.dataInicio} helperText={errors.dataInicio?.message} />
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="dataFinal" control={control} render={({ field }) => (
                    <TextField {...field} type="date" label="Data final" {...formField} InputLabelProps={{ shrink: true }} error={!!errors.dataFinal} helperText={errors.dataFinal?.message} />
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="ticket" control={control} render={({ field }) => (
                    <TextField {...field} label="Nº Ticket" {...formField} error={!!errors.ticket} helperText={errors.ticket?.message} />
                  )} />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Controller
                    name="solicitante"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={md.solicitantes}
                        getOptionLabel={(option) => option?.nome || ''}
                        isOptionEqualToValue={(option, value) => String(option?.id) === String(value?.id)}
                        value={md.solicitantes.find(s => String(s.id) === String(field.value ?? '')) || null}
                        onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                        loading={md.isSyncing}
                        loadingText="Carregando solicitantes…"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            name={field.name}
                            label="Solicitante"
                            {...formField}
                            error={!!errors.solicitante}
                            helperText={errors.solicitante?.message || 'Digite para filtrar pelo nome'}
                            placeholder="Buscar pelo nome…"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="area" control={control} render={({ field }) => (
                    <TextField {...field} select label="Área solicitante" {...formField} error={!!errors.area} helperText={errors.area?.message}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {md.areas.map(ar => <MenuItem key={ar.id} value={ar.id}>{ar.nome}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Cliente e contrato</SectionTitle>
              <Grid container spacing={2.25}>
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
                      options={md.operadoras}
                      getOptionLabel={(option) => option.nome || ''}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      value={md.operadoras.find(o => o.id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Operadora"
                          {...formField}
                          error={!!errors.operadora}
                          helperText={errors.operadora?.message || 'Digite para buscar uma operadora'}
                          placeholder="Digite para buscar..."
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Typography variant="body1" fontWeight="medium">{option.nome}</Typography>
                        </Box>
                      )}
                      noOptionsText="Nenhuma operadora encontrada"
                      loading={md.operadoras.length === 0}
                      loadingText="Carregando operadoras..."
                    />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="produto" control={control} render={({ field }) => (
                    <TextField {...field} select label="Produto" {...formField} error={!!errors.produto} helperText={errors.produto?.message}>
                      <MenuItem value="">Selecione...</MenuItem>
                      {md.produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Operação</SectionTitle>
              <Grid container spacing={2.25}>
                <Grid item xs={12} md={7}>
                  <Controller
                    name="sistemasIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={md.sistemas}
                        getOptionLabel={(opt) => opt?.nome || ''}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        value={selectedSistemas}
                        onChange={(_, newValue) => {
                          const ids = (newValue ?? []).map((s) => s.id)
                          field.onChange(ids)
                          const nextTotais: Record<string, number> = {}
                          for (const id of ids) {
                            const cur = (watchedSistemasTotais as any)?.[id]
                            nextTotais[id] = typeof cur === 'number' && Number.isFinite(cur) ? cur : 0
                          }
                          setValue('sistemasTotais', nextTotais, { shouldDirty: true })
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Sistemas"
                            {...formField}
                            placeholder="Selecione um ou mais sistemas"
                            error={!!errors.sistemasIds}
                            helperText={(errors as any)?.sistemasIds?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {watchedSistemasIds.length > 0 && (
                <Box sx={{ mt: 2.25 }}>
                  <Divider sx={{ my: 1 }} />
                  <SubsectionLabel>Totais por sistema</SubsectionLabel>
                  <Grid container spacing={2.25}>
                    {selectedSistemas.map((s) => (
                      <Grid item xs={12} sm={6} md={4} key={s.id}>
                        <Controller
                          name={`sistemasTotais.${s.id}` as any}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              inputProps={{ min: 0 }}
                              label={`Total - ${s.nome}`}
                              {...formField}
                              error={!!(errors as any)?.sistemasTotais?.[s.id]}
                              helperText={(errors as any)?.sistemasTotais?.[s.id]?.message}
                              onChange={(e) => {
                                const raw = e.target.value
                                const n = raw === '' ? 0 : Number(raw)
                                field.onChange(Number.isFinite(n) ? n : 0)
                              }}
                            />
                          )}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Métricas</SectionTitle>
              <Grid container spacing={2.25}>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="qtdRetornos" control={control} render={({ field }) => (
                    <TextField {...field} type="number" label="Qtde de retornos" {...formField} error={!!errors.qtdRetornos} helperText={errors.qtdRetornos?.message} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="qualidade" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      label="Qualidade"
                      {...formField}
                      value={qualidadeSomenteLeituraLabel}
                      InputProps={{ readOnly: true }}
                      helperText="Definida automaticamente pela quantidade de retornos"
                      sx={{
                        '& .MuiInputBase-input': { backgroundColor: 'action.hover', cursor: 'not-allowed' },
                      }}
                    />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller name="total" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Total (soma)"
                      {...formField}
                      value={watchedSistemasIds.reduce((acc, sistemaId) => {
                        const v = (watchedSistemasTotais as any)?.[sistemaId]
                        const n = typeof v === 'number' && Number.isFinite(v) ? v : 0
                        return acc + n
                      }, 0)}
                      InputProps={{ readOnly: true }}
                      helperText="Soma dos totais informados por sistema"
                      sx={{
                        '& .MuiInputBase-input': { backgroundColor: 'action.hover', cursor: 'not-allowed' },
                      }}
                    />
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Descrição e observações</SectionTitle>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 720 }}>
                Campos amplos para detalhar o contexto, passos, evidências e notas internas.
              </Typography>
              <Grid container spacing={2.25}>
                <Grid item xs={12}>
                  <SubsectionLabel>Descrição</SubsectionLabel>
                  <Controller name="descricao" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder="Descreva detalhadamente a manutenção…"
                      multiline
                      minRows={10}
                      {...formField}
                      sx={longTextFieldSx}
                      error={!!errors.descricao}
                      helperText={errors.descricao?.message || 'Campo amplo para incluir requisitos, histórico e detalhes.'}
                    />
                  )} />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }} />
                  <SubsectionLabel>Observações</SubsectionLabel>
                  <Controller name="observacoes" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder="Notas adicionais, contatos, restrições…"
                      multiline
                      minRows={6}
                      {...formField}
                      sx={longTextFieldSx}
                      error={!!errors.observacoes}
                      helperText={errors.observacoes?.message || 'Opcional — SLA, contatos, exceções ou complementos.'}
                    />
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end', mt: 2.5 }}>
            <PrimaryActionButton type="button" disabled={!isValid} onClick={handleSubmit(onSubmit)}>
              Salvar
            </PrimaryActionButton>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  )
}
