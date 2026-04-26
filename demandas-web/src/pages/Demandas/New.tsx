

import React, { useEffect, useRef, useMemo } from 'react'
import { Autocomplete, Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, FormControl, InputLabel, Select, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { createPerfLogger } from '../../utils/perf'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'

const metricSchema = z.object({
  qtdUsuarios: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  qtdClientesVinculados: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
})

const schema = z.object({
  // Campos obrigatórios
  status: z.string().min(1, 'Obrigatório'),
  tipoServico: z.string().min(1, 'Tipo de serviço é obrigatório'),
  tipo: z.string().min(1, 'Tipo de demanda é obrigatório'),

  // Demais campos opcionais
  descricao: z.string().optional(), // Removido obrigatoriedade
  analista: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFinal: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  area: z.string().optional(),
  /** IDs dos sistemas (multi-seleção) */
  sistemaIds: z.array(z.string()).default([]),
  analiseQuantitativa: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  qtdRetornos: z.coerce.number().min(0).optional(),
  qualidade: z.string().optional(),
  /** Novo: métricas por sistema (key = sistemaId) */
  sistemasMetrics: z.record(metricSchema).default({}),
  /** Legado (EDGE/MOVE). Mantido para não perder histórico. */
  qtdClientesVinculados: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  usuariosEmpresa: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const listas = {
  status: ['Em andamento', 'Transf. Analista', 'Aguardando aprovação', 'Com erros', 'Concluído Parcialmente', 'Concluída', 'Cancelada'],
  qualidade: [
    { value: '0', label: '0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO' },
    { value: '1', label: '1 - MEDIANO - NO MÁX 2 RETORNOS' },
    { value: '2', label: '2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS' },
    { value: '3', label: '3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO' }
  ],
}

export default function DemandNewPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const store = useDemandStore()
  const { control, handleSubmit, formState: { errors, isValid }, setValue, getValues } = useForm<FormValues>({ 
    resolver: zodResolver(schema), 
    mode: 'onChange',
    defaultValues: {
      // Campos obrigatórios
      status: 'Em andamento',
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
      sistemaIds: [],
      analiseQuantitativa: 0,
      qtdRetornos: 0,
      qualidade: '',
      sistemasMetrics: {},
      qtdClientesVinculados: 0,
      usuariosEmpresa: 0,
      observacoes: '',
    }
  })
  const perfRef = useRef(createPerfLogger('Cadastro/Novo'))
  const perfReadyRef = useRef(false)
  const md = useMasterDataStore()
  const demandStore = useDemandStore()
  const selectedTipoId = useWatch({ control, name: 'tipo' })
  const selectedSistemaIds = useWatch({ control, name: 'sistemaIds' })
  const currentMetrics = useWatch({ control, name: 'sistemasMetrics' })

  const sistemasSelecionados = useMemo(() => {
    const ids = new Set((selectedSistemaIds || []).filter(Boolean))
    return md.sistemas.filter((s) => ids.has(s.id))
  }, [md.sistemas, selectedSistemaIds])

  // EDGE/MOVE (legado): ainda existem campos antigos; não pedir no fluxo novo.
  const hasEDGE = useMemo(() => {
    return sistemasSelecionados.some((s) => (s.nome || '').toLowerCase().includes('edge'))
  }, [sistemasSelecionados])

  const hasMOVE = useMemo(() => {
    return sistemasSelecionados.some((s) => (s.nome || '').toLowerCase().includes('move'))
  }, [sistemasSelecionados])

  // Garantir que existe um objeto de métricas para cada sistema selecionado
  useEffect(() => {
    const ids = (selectedSistemaIds || []).filter(Boolean)
    const base = { ...(currentMetrics || {}) }
    let changed = false
    for (const sid of ids) {
      if (!base[sid]) {
        base[sid] = {}
        changed = true
      }
    }
    // também remover métricas de sistemas desmarcados para evitar lixo
    for (const sid of Object.keys(base)) {
      if (!ids.includes(sid)) {
        delete base[sid]
        changed = true
      }
    }
    if (changed) setValue('sistemasMetrics', base, { shouldDirty: true, shouldValidate: false })
  }, [selectedSistemaIds, currentMetrics, setValue])

  const tiposDemandaAtivos = useMemo(
    () => md.tiposDemanda.filter((t) => t.ativo !== false),
    [md.tiposDemanda]
  )

  useEffect(() => {
    if (!selectedTipoId) return
    const aindaNaLista = tiposDemandaAtivos.some((t) => t.id === selectedTipoId)
    if (!aindaNaLista) setValue('tipo', '')
  }, [selectedTipoId, tiposDemandaAtivos, setValue])

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    if (perfReadyRef.current) return
    if (md.analistas.length && tiposDemandaAtivos.length && md.tiposServico.length) {
      perfReadyRef.current = true
      perfRef.current.log('data-ready', {
        analistas: md.analistas.length,
        tiposDemanda: md.tiposDemanda.length,
        tiposServico: md.tiposServico.length
      })
    }
  }, [md.analistas.length, tiposDemandaAtivos.length, md.tiposServico.length])

  // Sincronização desabilitada temporariamente para evitar travamento
  useEffect(() => {
    console.log('🔧 DemandNewPage: Sincronização automática desabilitada temporariamente')
    // TODO: Reabilitar após otimização completa
    // if (md.syncFromApi) {
    //   console.log('🔍 DemandNewPage: Sincronizando dados mestres...')
    //   md.syncFromApi()
    // }
  }, [])

  // LÓGICA ATUALIZADA: Preencher com o analista correspondente ao usuário logado
  useEffect(() => {
    console.log('🔄 DemandNewPage: Buscando analista correspondente ao usuário logado')
    console.log('🔄 DemandNewPage: Usuário logado:', user?.name, 'ID:', user?.id)
    
    if (user && user.name && md.analistas.length > 0) {
      // Encontrar analista correspondente
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user.name.toLowerCase() ||
        analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(analista.nome.toLowerCase())
      )
      
      if (analistaCorrespondente) {
        console.log('✅ DemandNewPage: Analista encontrado:', analistaCorrespondente.nome, 'ID:', analistaCorrespondente.id)
        setValue('analista', analistaCorrespondente.id)
      } else {
        console.log('⚠️ DemandNewPage: Nenhum analista correspondente encontrado, usando primeiro analista')
        const primeiroAnalista = md.analistas[0]
        setValue('analista', primeiroAnalista?.id || '')
      }
    } else {
      console.log('⚠️ DemandNewPage: Usuário não logado ou analistas não carregados')
    }
  }, [user, md.analistas, setValue])

  // Debug: Log dos dados mestres
  useEffect(() => {
    console.log('🔍 DemandNewPage: Dados mestres carregados:', {
      tiposServico: md.tiposServico.length,
      tiposDemanda: md.tiposDemanda.length,
      clientes: md.clientes.length,
      contratos: md.contratos.length,
      operadoras: md.operadoras.length,
      produtos: md.produtos.length,
      sistemas: md.sistemas.length,
      analistas: md.analistas.length,
      areas: md.areas.length
    })
    
    // Log detalhado dos tipos de demanda
    if (md.tiposDemanda.length > 0) {
      console.log('🔍 DemandNewPage: Tipos de demanda disponíveis:', md.tiposDemanda.map(ts => ({ id: ts.id, nome: ts.nome })))
    } else {
      console.log('⚠️ DemandNewPage: Nenhum tipo de demanda carregado!')
    }
    
    // Log detalhado dos clientes
    if (md.clientes.length > 0) {
      console.log('🔍 DemandNewPage: Clientes disponíveis:', md.clientes.map(c => ({ id: c.id, nome: c.nome })))
    } else {
      console.log('⚠️ DemandNewPage: Nenhum cliente carregado!')
    }
  }, [md.tiposServico, md.tiposDemanda])

  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET: Verificando se ticket existe:', ticket)
      
      // Buscar no banco de dados via API - APENAS na página de demandas
      const baseUrl = 'https://nigteste-production.up.railway.app'
      const response = await fetch(`${baseUrl}/demandas?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const exists = Array.isArray(data) ? data.length > 0 : data !== null
        
        console.log('🔍 VALIDAÇÃO TICKET: Resultado da busca:', {
          ticket,
          responseStatus: response.status,
          dataLength: Array.isArray(data) ? data.length : 'not array',
          exists,
          endpoint: '/demandas',
          note: 'Verificando APENAS na página de demandas'
        })
        
        return exists
      } else {
        console.warn('⚠️ VALIDAÇÃO TICKET: Erro na API:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET: Erro ao verificar ticket:', error)
      return false
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      // Verificar se os dados obrigatórios estão carregados
      if (md.tiposServico.length === 0 || tiposDemandaAtivos.length === 0) {
        console.error('❌ DADOS NÃO CARREGADOS: Tipos de Serviço ou nenhum tipo de demanda ativo para cadastro.')
        alert('Não há tipos de demanda ativos para cadastro ou os dados não foram carregados. Em Dados → Tipos, marque pelo menos um tipo como ativo ou sincronize os dados.')
        return
      }
      
      // Gerar ticket automático se não fornecido
      const generateTicket = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const random = Math.random().toString(36).substr(2, 4).toUpperCase()
        return `CAD-${year}${month}${day}-${random}`
      }

      // Verificar se o usuário forneceu um ticket válido
      const userProvidedTicket = data.ticket && data.ticket.trim() !== ''
      let finalTicket = userProvidedTicket ? data.ticket.trim() : generateTicket()
      
      console.log('🎫 TICKET DEBUG:', {
        userInput: data.ticket,
        userProvidedTicket,
        finalTicket,
        isAutoGenerated: !userProvidedTicket
      })

      // VALIDAÇÃO DE TICKET DUPLICADO
      if (userProvidedTicket) {
        console.log('🔍 VALIDAÇÃO TICKET: Verificando ticket fornecido pelo usuário...')
        const ticketExists = await checkTicketExists(finalTicket)
        
        if (ticketExists) {
          console.error('❌ VALIDAÇÃO TICKET: Ticket já existe no banco de dados!')
          alert(`ERRO: O ticket "${finalTicket}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
          return
        } else {
          console.log('✅ VALIDAÇÃO TICKET: Ticket único, pode prosseguir')
        }
      } else {
        console.log('🔍 VALIDAÇÃO TICKET: Ticket gerado automaticamente, verificando unicidade...')
        
        // Para tickets gerados automaticamente, verificar se já existe
        let attempts = 0
        let uniqueTicket = finalTicket
        
        while (await checkTicketExists(uniqueTicket) && attempts < 10) {
          attempts++
          console.log(`🔄 VALIDAÇÃO TICKET: Tentativa ${attempts} - Ticket "${uniqueTicket}" já existe, gerando novo...`)
          uniqueTicket = generateTicket()
        }
        
        if (attempts >= 10) {
          console.error('❌ VALIDAÇÃO TICKET: Não foi possível gerar um ticket único após 10 tentativas!')
          alert('ERRO: Não foi possível gerar um ticket único. Tente novamente.')
          return
        }
        
        console.log(`✅ VALIDAÇÃO TICKET: Ticket único gerado após ${attempts} tentativas: "${uniqueTicket}"`)
        // Atualizar o finalTicket com o ticket único
        finalTicket = uniqueTicket
      }

      // Encontrar analista correspondente ao usuário logado
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
        analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
        (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
      )
      
      const emptyToNull = (value: string | undefined) => {
        if (!value || typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed !== '' ? trimmed : null
      }

      const sistemaIds = [...new Set((data.sistemaIds || []).filter((id) => typeof id === 'string' && id.trim() !== ''))]

      const sanitizedData = {
        ...data,
        tipoServico: emptyToNull(data.tipoServico),
        tipo: emptyToNull(data.tipo),
        area: emptyToNull(data.area),
      }

      // Função para validar se um ID existe na respectiva lista
      const validateId = (id: string | null, list: any[], entityName: string) => {
        if (!id) {
          console.log(`✅ ${entityName}: Campo vazio, enviando null`)
          return null
        }
        
        console.log(`🔍 ${entityName}: Validando ID "${id}" contra lista de ${list.length} itens`)
        console.log(`🔍 ${entityName}: Lista disponível:`, list.map(item => ({ id: item.id, nome: item.nome })))
        
        // Verificar se a lista está vazia
        if (!list || list.length === 0) {
          console.error(`❌ ${entityName}: Lista está vazia! Não é possível validar o ID "${id}"`)
          throw new Error(`Lista de ${entityName} está vazia. Verifique se os dados foram carregados corretamente.`)
        }
        
        const exists = list.some(item => item.id === id)
        if (!exists) {
          console.error(`❌ ${entityName} ID "${id}" NÃO ENCONTRADO na lista!`)
          console.error(`❌ ${entityName}: IDs disponíveis:`, list.map(item => item.id))
          throw new Error(`ID "${id}" não encontrado na lista de ${entityName}. Verifique se os dados foram carregados corretamente.`)
        }
        
        console.log(`✅ ${entityName}: ID "${id}" encontrado na lista`)
        return id
      }

      for (const sid of sistemaIds) {
        validateId(sid, md.sistemas, 'Sistema')
      }

      const solicitanteNome = md.solicitantes.find(s => s.id === data.solicitante)?.nome || emptyToNull(data.solicitante)
      const qualidadeValor = data.qualidade ?? ''
      const analiseQuantitativaValor = data.analiseQuantitativa ?? ''
      // Campos legados continuam existindo na base; no fluxo novo não preenchemos aqui.
      const qtdClientesVinculadosValor = ''
      const usuariosEmpresaValor = ''

      // Novo: métricas por sistema
      const sistemasMetrics = data.sistemasMetrics || {}

      const sistemaIdPrimeiro = sistemaIds.length ? validateId(sistemaIds[0], md.sistemas, 'Sistema') : null

      const backendPayload: Record<string, unknown> = {
        status: data.status,
        ticket: finalTicket,
        analistaId: validateId(analistaCorrespondente?.id || null, md.analistas, 'Analista'),
        userId: user?.id || null,
        solicitante: solicitanteNome,
        areaId: validateId(sanitizedData.area, md.areas, 'Área'),
        tipoId: validateId(sanitizedData.tipo, tiposDemandaAtivos, 'TipoDemanda'),
        descricao: data.descricao || null,
        tipoServicoId: validateId(sanitizedData.tipoServico, md.tiposServico, 'TipoServiço'),
        clienteId: null,
        contratoId: null,
        operadoraId: null,
        produtoId: null,
        sistemaId: sistemaIdPrimeiro,
        ...(sistemaIds.length ? { sistemasIds: sistemaIds } : {}),
        ...(Object.keys(sistemasMetrics).length ? { sistemasMetrics } : {}),
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : null,
        dataFinal: data.dataFinal ? new Date(data.dataFinal).toISOString() : null,
        qtdUsuarios: analiseQuantitativaValor !== '' && analiseQuantitativaValor !== null ? String(analiseQuantitativaValor) : null,
        qtdRetornos: data.qtdRetornos !== undefined && data.qtdRetornos !== null ? Number(data.qtdRetornos) : null,
        qualidade: qualidadeValor !== '' ? qualidadeValor : null,
        // EDGE/MOVE: só enviar quando o(s) sistema(s) correspondente(s) estiver(em) selecionado(s)
        qtdClientesVinculados: qtdClientesVinculadosValor !== '' && qtdClientesVinculadosValor !== null ? Number(qtdClientesVinculadosValor) : null,
        usuariosEmpresa: usuariosEmpresaValor !== '' && usuariosEmpresaValor !== null ? Number(usuariosEmpresaValor) : null,
        observacoes: emptyToNull(data.observacoes),
      }

      const rejectedFields: string[] = []
      if (data.analista && !backendPayload.analistaId) rejectedFields.push('Analista')
      if (sanitizedData.area && !backendPayload.areaId) rejectedFields.push('Área')
      if (sanitizedData.tipo && !backendPayload.tipoId) rejectedFields.push('TipoDemanda')
      if (sanitizedData.tipoServico && !backendPayload.tipoServicoId) rejectedFields.push('TipoCadastro')
      if (sistemaIds.length && !backendPayload.sistemaId) rejectedFields.push('Sistema')

      if (rejectedFields.length > 0) {
        alert(`ERRO: Os seguintes campos têm IDs inválidos: ${rejectedFields.join(', ')}. Verifique se os dados foram carregados corretamente.`)
        return
      }

      const finalPayload = backendPayload

      const sistemaNomes = sistemaIds
        .map((id) => md.sistemas.find((s) => s.id === id)?.nome)
        .filter(Boolean)
        .join(', ')

      const storePayload = {
        status: data.status,
        ticket: finalTicket,
        analista: analistaCorrespondente?.nome || null,
        analistaId: analistaCorrespondente?.id || null,
        solicitante: solicitanteNome,
        area: md.areas.find((a) => a.id === sanitizedData.area)?.nome || null,
        areaId: sanitizedData.area,
        tipo: md.tiposDemanda.find((t) => t.id === sanitizedData.tipo)?.nome || null,
        tipoId: sanitizedData.tipo,
        descricao: data.descricao || null,
        tipoServico: md.tiposServico.find((ts) => ts.id === sanitizedData.tipoServico)?.nome || null,
        tipoServicoId: sanitizedData.tipoServico,
        cliente: '',
        clienteId: undefined,
        contrato: '',
        contratoId: undefined,
        operadora: '',
        operadoraId: undefined,
        produto: '',
        produtoId: undefined,
        sistema: sistemaNomes || '',
        sistemaId: sistemaIdPrimeiro || undefined,
        sistemasIds: sistemaIds.length ? sistemaIds : undefined,
        sistemasMetrics: Object.keys(sistemasMetrics).length ? sistemasMetrics : undefined,
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : null,
        dataFinal: data.dataFinal ? new Date(data.dataFinal).toISOString() : null,
        qtdUsuarios: analiseQuantitativaValor !== '' && analiseQuantitativaValor !== null ? String(analiseQuantitativaValor) : null,
        qtdRetornos: data.qtdRetornos !== undefined && data.qtdRetornos !== null ? Number(data.qtdRetornos) : null,
        qualidade: qualidadeValor !== '' ? qualidadeValor : null,
        qtdClientesVinculados: qtdClientesVinculadosValor !== '' && qtdClientesVinculadosValor !== null ? Number(qtdClientesVinculadosValor) : null,
        usuariosEmpresa: usuariosEmpresaValor !== '' && usuariosEmpresaValor !== null ? Number(usuariosEmpresaValor) : null,
        observacoes: emptyToNull(data.observacoes),
      }

      // Usar o store para criar a demanda (que fará o mapeamento correto)
      const createdDemand = await store.add(storePayload)
      
      console.log('✅ DemandNewPage: Demanda criada com sucesso:', createdDemand)
      navigate('/cadastro')
    } catch (error) {
      console.error('Erro ao criar demanda:', error)
      alert('Erro ao criar demanda. Verifique o console para mais detalhes.')
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Novo Cadastro</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Campos marcados com * são obrigatórios: Status, Tipo de serviço e Tipo de demanda.
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Primeiro Tópico: Informações Básicas da Demanda */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}>
              1. Informações Básicas da Demanda
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
              <TextField {...field} select label="Tipo de serviço" fullWidth required error={!!errors.tipoServico} helperText={errors.tipoServico?.message}>
                <MenuItem value="">Selecione...</MenuItem>
                {md.tiposServico.map(ts => <MenuItem key={ts.id} value={ts.id}>{ts.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipo" control={control} render={({ field }) => (
              <TextField {...field} select label="Tipo de demanda" fullWidth required error={!!errors.tipo} helperText={errors.tipo?.message}>
                <MenuItem value="">Selecione...</MenuItem>
                {tiposDemandaAtivos.map(td => <MenuItem key={td.id} value={td.id}>{td.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} select required label="Status" fullWidth error={!!errors.status} helperText={errors.status?.message}>
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
                  value={md.solicitantes.find((s) => s.id === field.value) || null}
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
                    return options.filter((option) =>
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
              <TextField {...field} label="Descrição da demanda" fullWidth multiline minRows={3} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>

          {/* Segundo tópico: sistemas (multi-seleção) */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              2. Sistemas
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="sistemaIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={md.sistemas}
                  getOptionLabel={(o) => o.nome}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={md.sistemas.filter((s) => (field.value || []).includes(s.id))}
                  onChange={(_, v) => field.onChange(v.map((x) => x.id))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sistemas"
                      placeholder="Selecione um ou mais"
                      fullWidth
                      error={!!errors.sistemaIds}
                      helperText={
                        (errors.sistemaIds as { message?: string } | undefined)?.message ||
                        'Selecione um ou mais sistemas relacionados à demanda.'
                      }
                    />
                  )}
                />
              )}
            />
          </Grid>

          {/* Terceiro Tópico: Métricas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              3. Métricas
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="analiseQuantitativa" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Qtd de usuários" 
                fullWidth 
                placeholder="Digite um número"
                inputProps={{ min: 0, step: 'any' }}
                error={!!errors.analiseQuantitativa} 
                helperText={errors.analiseQuantitativa?.message || 'Informe a quantidade de usuários.'}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qtdRetornos" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Qtde de retornos" fullWidth error={!!errors.qtdRetornos} helperText={errors.qtdRetornos?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qualidade" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade" fullWidth error={!!errors.qualidade} helperText={errors.qualidade?.message}>
                <MenuItem value="">Selecione...</MenuItem>
                {listas.qualidade.map((q) => (
                  <MenuItem key={q.value} value={q.value} sx={{ whiteSpace: 'normal', lineHeight: 1.2 }}>
                    {q.label}
                  </MenuItem>
                ))}
              </TextField>
            )} />
          </Grid>
          {/* Novo fluxo: para cada sistema selecionado, pedir 2 métricas */}
          {sistemasSelecionados.map((s) => (
            <React.Fragment key={s.id}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
                  Métricas — {s.nome}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  name={`sistemasMetrics.${s.id}.qtdUsuarios` as any}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Qtd de usuários"
                      fullWidth
                      placeholder="Digite um número"
                      inputProps={{ min: 0, step: 1 }}
                      helperText="Quantidade de usuários para este sistema."
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  name={`sistemasMetrics.${s.id}.qtdClientesVinculados` as any}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Qtd de clientes vinculados"
                      fullWidth
                      placeholder="Digite um número"
                      inputProps={{ min: 0, step: 1 }}
                      helperText="Quantidade de clientes vinculados para este sistema."
                    />
                  )}
                />
              </Grid>
            </React.Fragment>
          ))}
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


