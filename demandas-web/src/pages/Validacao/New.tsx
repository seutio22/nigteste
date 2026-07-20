import React, { useState, useEffect, useRef } from 'react'
import { Autocomplete, Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useValidationStore } from '../../store/validationStore'
import { useAuthStore } from '../../store/authStore'
import { createPerfLogger } from '../../utils/perf'
import { AsyncClienteAutocomplete, type ClienteOption } from '../../components/AsyncClienteAutocomplete'
import { ContratoLocalAutocomplete } from '../../components/ContratoLocalAutocomplete'
import { filterContratosDoCliente } from '../../utils/manutencaoContratos'
import { validateContratoParaCliente } from '../../utils/validationRelations'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { VALIDACAO_CHAMADO_STATUS_OPTIONS } from './validacaoStatusOptions'
import { EstruturaMultiSelectPanel } from './EstruturaMultiSelectPanel'
import {
  ESTRUTURA_EDGE_OPTIONS,
  ESTRUTURA_MOVE_OPTIONS,
  calcTotalFromEstrutura,
  countEstruturaSelections,
} from './validacaoEstruturaOptions'
import { ValidacaoFormCard, ValidacaoFormShell } from './validacaoFormUi'
import { ItensConcluidosPanel } from './ItensConcluidosPanel'
import {
  type ItensConcluidosDetalhe,
  sumItensConcluidosDetalhe,
} from './validacaoItensConcluidos'

const schema = z.object({
  analista: z.string().min(1, 'Obrigatório'),
  dataInicio: z.string().min(1, 'Obrigatório'),
  dataFinal: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  demanda: z.string().optional(),
  tipo: z.string().min(1, 'Obrigatório'),
  descricao: z.string().optional(), // Alterado para não obrigatório
  total: z.coerce.number().min(0).optional(),
  // Novos campos
  cliente: z.string().optional(),
  contrato: z.string().optional(),
  operadora: z.string().optional(),
  produto: z.string().optional(),
  vigencia: z.string().optional(),
  qtdRetornos: z.coerce.number().min(0).optional(),
  qualidade: z.string().optional(),
  // Campos para estruturas EDGE, MOVE e formalização
  estruturaEdge: z.array(z.string()).optional(),
  estruturaMove: z.array(z.string()).optional(),
  formalizacao: z.string().optional(),
  // Novos campos para itens
  itensPendentes: z.coerce.number().min(0).optional(),
  itensConcluidosDetalhe: z
    .object({
      contrato: z.coerce.number().min(0).optional(),
      subs: z.coerce.number().min(0).optional(),
    })
    .optional(),
})

type FormValues = z.infer<typeof schema>

export default function ValidationNewPage() {
  console.log('🔍 ValidationNewPage: Componente carregado')
  
  const navigate = useNavigate()
  const md = useMasterDataStore()
  const store = useValidationStore()
  const { user } = useAuthStore()
  const perfRef = useRef(createPerfLogger('Validacao/Novo'))
  const perfReadyRef = useRef(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null)
  
  console.log('🔍 ValidationNewPage: Hooks carregados:', {
    user: user?.name,
    analistas: md.analistas.length,
    store: !!store
  })
  
  // Forçar re-render do formulário com valores padrão corretos
  const formKey = React.useMemo(() => Date.now(), [])
  
  const { control, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<FormValues>({ 
    resolver: zodResolver(schema), 
    mode: 'onChange',
    defaultValues: {
      analista: '',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFinal: '',
      status: '',
      ticket: '',
      solicitante: '',
      demanda: '',
      tipo: '',
      descricao: '',
      total: 0,
      cliente: '',
      contrato: '',
      operadora: '',
      produto: '',
      vigencia: '',
      qtdRetornos: 0,
      qualidade: '',
      formalizacao: '',
      estruturaEdge: [],
      estruturaMove: [],
      itensPendentes: 0,
      itensConcluidosDetalhe: { contrato: undefined, subs: undefined },
    }
  })

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

  // Watch para dependências entre campos
  const clienteSelecionado = watch('cliente')
  const operadoraSelecionada = watch('operadora')
  const estruturaEdge = watch('estruturaEdge')
  const estruturaMove = watch('estruturaMove')

  const produtosFiltrados = operadoraSelecionada
    ? md.produtos.filter((p) => p.operadoraId === operadoraSelecionada || !p.operadoraId)
    : md.produtos

  const contratosDoCliente = React.useMemo(
    () =>
      filterContratosDoCliente(
        md.contratos,
        clienteSelecionado || undefined,
        selectedCliente?.grupoEconomico || null
      ),
    [md.contratos, clienteSelecionado, selectedCliente?.grupoEconomico]
  )

  React.useEffect(() => {
    if (md.contratos.length === 0 && md.syncFromApi) {
      void md.syncFromApi()
    }
  }, [md.contratos.length, md.syncFromApi])

  // LÓGICA ATUALIZADA: Preencher com o analista correspondente ao usuário logado
  React.useEffect(() => {
    console.log('🔍 ValidationNewPage: useEffect executado')
    console.log('🔍 ValidationNewPage: user:', user?.name, 'ID:', user?.id)
    console.log('🔍 ValidationNewPage: analistas disponíveis:', md.analistas.length)
    
    if (user && user.name && md.analistas.length > 0) {
      console.log('🔍 ValidationNewPage: Buscando analista correspondente...')
      
      // Encontrar analista correspondente
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user.name.toLowerCase() ||
        analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(analista.nome.toLowerCase())
      )
      
      if (analistaCorrespondente) {
        console.log('✅ ValidationNewPage: Analista encontrado:', analistaCorrespondente.nome, 'ID:', analistaCorrespondente.id)
        setValue('analista', analistaCorrespondente.id)
      } else {
        console.log('⚠️ ValidationNewPage: Analista não encontrado, usando primeiro disponível')
        // Se não encontrar, usar o primeiro analista disponível
        const primeiroAnalista = md.analistas[0]
        console.log('✅ ValidationNewPage: Usando primeiro analista:', primeiroAnalista.nome, 'ID:', primeiroAnalista.id)
        setValue('analista', primeiroAnalista?.id || '')
      }
    } else {
      console.log('❌ ValidationNewPage: Usuário não logado ou analistas não carregados')
    }
  }, [user, md.analistas, setValue])

  const totalCalculado =
    calcTotalFromEstrutura(estruturaEdge) + calcTotalFromEstrutura(estruturaMove)
  const edgeSelections = countEstruturaSelections(estruturaEdge, ESTRUTURA_EDGE_OPTIONS)
  const moveSelections = countEstruturaSelections(estruturaMove, ESTRUTURA_MOVE_OPTIONS)

  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET VALIDAÇÃO: Verificando se ticket existe:', ticket)
      
      // Usar a API do projeto para buscar validações por ticket
      const { api } = await import('../../lib/api.local')
      const validacoes = await api.getValidacoes(`?ticket=${encodeURIComponent(ticket)}`)
      
      // A API retorna um array, verificar se há resultados
      const exists = Array.isArray(validacoes) && validacoes.length > 0
      
      console.log('🔍 VALIDAÇÃO TICKET VALIDAÇÃO: Resultado da busca:', {
        ticket,
        encontradas: Array.isArray(validacoes) ? validacoes.length : 0,
        exists
      })
      
      return exists
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET VALIDAÇÃO: Erro ao verificar ticket:', error)
      // Em caso de erro, permitir prosseguir (não bloquear por problemas de rede)
      return false
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      console.log('🔍 ValidationNewPage: onSubmit executado')
      console.log('🔍 ValidationNewPage: Dados do formulário:', data)
      console.log('🔍 ValidationNewPage: Campo analista:', data.analista)
      console.log('🔍 ValidationNewPage: Tipo do campo analista:', typeof data.analista)
      console.log('🔍 ValidationNewPage: Estrutura EDGE:', data.estruturaEdge)
      console.log('🔍 ValidationNewPage: Estrutura MOVE:', data.estruturaMove)
      console.log('🔍 ValidationNewPage: Tipo estruturaEdge:', typeof data.estruturaEdge)
      console.log('🔍 ValidationNewPage: Tipo estruturaMove:', typeof data.estruturaMove)
      
      // Verificar se o analista foi selecionado
      if (!data.analista) {
        console.log('❌ ValidationNewPage: Campo analista está vazio!')
        alert('Por favor, selecione um analista responsável.')
        return
      }
      
      console.log('✅ ValidationNewPage: Campo analista preenchido:', data.analista)
      
      // DEBUG: Verificar o campo ticket
      console.log('🔍 VALIDAÇÃO TICKET DEBUG:', {
        ticketField: data.ticket,
        ticketType: typeof data.ticket,
        ticketTrimmed: data.ticket ? data.ticket.trim() : 'undefined',
        ticketEmpty: data.ticket ? data.ticket.trim() === '' : true,
        willValidate: data.ticket && data.ticket.trim() !== ''
      })
      
      // VALIDAÇÃO DE TICKET DUPLICADO
      if (data.ticket && data.ticket.trim() !== '') {
        console.log('🔍 VALIDAÇÃO TICKET VALIDAÇÃO: Verificando ticket fornecido pelo usuário...')
        const ticketExists = await checkTicketExists(data.ticket.trim())
        
        if (ticketExists) {
          console.error('❌ VALIDAÇÃO TICKET VALIDAÇÃO: Ticket já existe no banco de dados!')
          alert(`ERRO: O ticket "${data.ticket.trim()}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
          return
        } else {
          console.log('✅ VALIDAÇÃO TICKET VALIDAÇÃO: Ticket único, pode prosseguir')
        }
      } else {
        console.log('⚠️ VALIDAÇÃO TICKET VALIDAÇÃO: Campo ticket vazio ou não fornecido - pulando validação')
      }
      
      const contratoErr = validateContratoParaCliente(
        data.contrato,
        data.cliente,
        contratosDoCliente,
        md.contratos
      )
      if (contratoErr) {
        alert(contratoErr)
        return
      }

      const validationData = {
        ...data,
        clienteId: data.cliente || undefined,
        contratoId: data.contrato || undefined,
        operadoraId: data.operadora || undefined,
        produtoId: data.produto || undefined,
        ticket: data.ticket && data.ticket.trim() !== '' ? data.ticket.trim() : null,
        itensConcluidosDetalhe: data.itensConcluidosDetalhe,
        itensConcluidos: sumItensConcluidosDetalhe(data.itensConcluidosDetalhe),
        total: totalCalculado,
        updatedAt: new Date().toISOString(),
      }

      console.log('🔍 ValidationNewPage: Dados para validação:', validationData)

      await store.add(validationData)
      navigate('/validacao')
    } catch (error) {
      console.error('❌ Erro ao criar validação:', error)
      alert('Erro ao criar validação.')
    }
  }

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 0, px: 0, width: '100%' }}>
      <ValidacaoFormShell
        title="Nova validação"
        subtitle="Identificação, cliente, estruturas EDGE/MOVE com quantidades, qualidade e descrição do chamado."
      >
        <Box component="form" key={formKey} onSubmit={handleSubmit(onSubmit)}>
          <ValidacaoFormCard title="Identificação">
            <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6} md={4}>
            <Controller 
              name="analista" 
              control={control} 
              render={({ field }) => (
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
              )} 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="dataInicio" control={control} render={({ field }) => (
              <TextField {...field} type="date" required label="Data de início" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.dataInicio} helperText={errors.dataInicio?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="dataFinal" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Data de finalização" fullWidth InputLabelProps={{ shrink: true }} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} select required label="Status" fullWidth error={!!errors.status} helperText={errors.status?.message}>
                <MenuItem value="">
                  <em>Selecione o status</em>
                </MenuItem>
                {VALIDACAO_CHAMADO_STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Nº Ticket" fullWidth />
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
            </Grid>
          </ValidacaoFormCard>

          <ValidacaoFormCard title="Cliente e contrato">
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
              <ContratoLocalAutocomplete
                valueId={field.value}
                onChangeId={field.onChange}
                contratos={contratosDoCliente}
                disabled={!clienteSelecionado}
                error={!!errors.contrato}
                helperText={errors.contrato?.message}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <Autocomplete
                options={md.operadoras}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                value={md.operadoras.find((o) => o.id === field.value) || null}
                onChange={(_, newValue) => {
                  field.onChange(newValue?.id || '')
                  setValue('produto', '')
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Operadora"
                    fullWidth
                    error={!!errors.operadora}
                    helperText={errors.operadora?.message}
                    placeholder="Digite para buscar..."
                  />
                )}
                noOptionsText="Nenhuma operadora encontrada"
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select label="Produto" fullWidth error={!!errors.produto} helperText={errors.produto?.message}>
                <MenuItem value="">
                  <em>Selecione um produto</em>
                </MenuItem>
                {produtosFiltrados.map((produto) => (
                  <MenuItem key={produto.id} value={produto.id}>
                    {produto.nome}
                  </MenuItem>
                ))}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="vigencia" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Vigência" fullWidth InputLabelProps={{ shrink: true }} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipo" control={control} render={({ field }) => (
              <TextField {...field} select required label="Tipo de demanda" fullWidth error={!!errors.tipo} helperText={errors.tipo?.message}>
                <MenuItem value="">
                  <em>Selecione o tipo</em>
                </MenuItem>
                <MenuItem value="Total">Total</MenuItem>
                <MenuItem value="SUB">SUB</MenuItem>
              </TextField>
            )} />
          </Grid>
            </Grid>
          </ValidacaoFormCard>

          <ValidacaoFormCard title="Qualidade, estruturas e formalização">
            <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qtdRetornos" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Qtd de retornos" fullWidth inputProps={{ min: 0 }} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qualidade" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade" fullWidth>
                <MenuItem value="">
                  <em>Selecione a qualidade</em>
                </MenuItem>
                <MenuItem value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</MenuItem>
                <MenuItem value="1">1 - MEDIANO - NO MÁX 2 RETORNOS</MenuItem>
                <MenuItem value="2">2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS</MenuItem>
                <MenuItem value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO</MenuItem>
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="total" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                value={totalCalculado}
                type="number" 
                placeholder="Total"
                fullWidth 
                error={!!(errors as any).total} 
                helperText={`Calculado automaticamente: EDGE (${edgeSelections} itens, ${calcTotalFromEstrutura(estruturaEdge)} pts) + MOVE (${moveSelections} itens, ${calcTotalFromEstrutura(estruturaMove)} pts) = ${totalCalculado}`}
                InputProps={{
                  readOnly: true
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: '#f5f5f5',
                    cursor: 'not-allowed',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }
                }}
              />
            )} />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="estruturaEdge"
              control={control}
              render={({ field }) => (
                <EstruturaMultiSelectPanel
                  title="Estrutura EDGE"
                  options={ESTRUTURA_EDGE_OPTIONS}
                  value={field.value || []}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="estruturaMove"
              control={control}
              render={({ field }) => (
                <EstruturaMultiSelectPanel
                  title="Estrutura MOVE"
                  options={ESTRUTURA_MOVE_OPTIONS}
                  value={field.value || []}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="formalizacao" control={control} render={({ field }) => (
              <TextField {...field} select label="Formalização" fullWidth>
                <MenuItem value="">
                  <em>Selecione o status</em>
                </MenuItem>
                <MenuItem value="0">0 - FORMALIZAÇÃO COMPLETA</MenuItem>
                <MenuItem value="1">1 - FORMALIZAÇÃO PARCIAL</MenuItem>
                <MenuItem value="2">2 - SEM FORMALIZAÇÃO</MenuItem>
              </TextField>
            )} />
          </Grid>

          {/* Novos campos para itens pendentes e concluídos */}
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="itensPendentes" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Itens Pendentes" 
                fullWidth 
                inputProps={{ min: 0 }}
                placeholder="0"
                helperText="Quantidade de itens pendentes"
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <Controller
              name="itensConcluidosDetalhe"
              control={control}
              render={({ field }) => (
                <ItensConcluidosPanel
                  value={(field.value ?? {}) as ItensConcluidosDetalhe}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
            </Grid>
          </ValidacaoFormCard>

          <ValidacaoFormCard title="Informações adicionais">
            <Grid container spacing={2.25}>
          <Grid item xs={12}>
            <Controller name="descricao" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição do chamado" fullWidth multiline minRows={2} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>
            </Grid>
          </ValidacaoFormCard>

          <Box mt={1} display="flex" gap={2}>
            <PrimaryActionButton type="button" disabled={!isValid} onClick={handleSubmit(onSubmit)}>
              Salvar
            </PrimaryActionButton>
            <Button variant="outlined" onClick={() => navigate('/validacao')}>Cancelar</Button>
          </Box>
        </Box>
      </ValidacaoFormShell>
    </Container>
  )
}


