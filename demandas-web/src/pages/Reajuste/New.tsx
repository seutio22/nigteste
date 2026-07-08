import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { Autocomplete, Box, Button, Card, CardContent, Container, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPerfLogger } from '../../utils/perf'
import { AsyncClienteAutocomplete, type ClienteOption } from '../../components/AsyncClienteAutocomplete'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { ManutencaoContratosVinculosSection } from '../../components/ManutencaoContratosVinculosSection'
import {
  emptyContratoVinculoRow,
  filterContratosDoCliente,
  rowsToVinculos,
  type ContratoVinculoRow,
} from '../../utils/manutencaoContratos'
import { buildReajusteLegacyFieldsFromVinculos } from '../../utils/reajusteContratos'
import { cardSx, formField, SectionTitle } from './reajusteFormLayout'

const schema = z.object({
  mes: z.coerce.number().min(1).max(12),
  ano: z.coerce.number().min(2000),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  qualidade: z.string().optional(),
  qualidadeInformacao: z.string().optional(),
  planos: z.string().optional(),
  responsavelConta: z.string().optional(),
  filial: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  responsavelAnalista: z.string().min(1, 'Obrigatório'),
  cliente: z.string().optional(),
  dataAtualizacao: z.string().optional(),
  itensPendentes: z.coerce.number().min(0).optional(),
  itensConcluidos: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ReajusteNewPage() {
  const navigate = useNavigate()
  const md = useMasterDataStore()
  const store = useReajusteStore()
  const { user } = useAuthStore()
  const { control, handleSubmit, formState: { errors, isValid }, setValue, watch, reset } = useForm<FormValues>({ 
    resolver: zodResolver(schema), 
    mode: 'onChange',
    defaultValues: {
      mes: undefined,
      ano: undefined,
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: '',
      status: 'Em andamento',
      qualidade: '',
      qualidadeInformacao: '',
      planos: '',
      responsavelConta: '',
      filial: '',
      ticket: '',
      solicitante: '',
      responsavelAnalista: '',
      cliente: '',
      dataAtualizacao: new Date().toISOString().split('T')[0],
      itensPendentes: undefined,
      itensConcluidos: undefined,
      observacoes: ''
    }
  })
  const perfRef = useRef(createPerfLogger('Reajuste/Novo'))
  const perfReadyRef = useRef(false)

  // Lógica para filtrar contratos por cliente (igual à página de cadastro)
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null)
  const [contratosVinculosRows, setContratosVinculosRows] = useState<ContratoVinculoRow[]>([
    emptyContratoVinculoRow(),
  ])

  const contratosDoCliente = useMemo(
    () =>
      filterContratosDoCliente(
        md.contratos,
        selectedClienteId,
        selectedCliente?.grupoEconomico || md.clientes.find((c) => c.id === selectedClienteId)?.grupoEconomico
      ),
    [md.contratos, md.clientes, selectedClienteId, selectedCliente?.grupoEconomico]
  )

  const vinculosValidos = useMemo(() => {
    const vinculos = rowsToVinculos(contratosVinculosRows)
    return vinculos.length > 0 && vinculos.every((v) => v.operadoraId)
  }, [contratosVinculosRows])

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    if (perfReadyRef.current) return
    if (md.analistas.length && md.operadoras.length) {
      perfReadyRef.current = true
      perfRef.current.log('data-ready', {
        analistas: md.analistas.length,
        operadoras: md.operadoras.length
      })
    }
  }, [md.analistas.length, md.operadoras.length])

  // Sincronizar dados mestres quando o componente monta
  useEffect(() => {
    md.syncFromApi()
  }, [md])

  // Limpar formulário quando o componente monta
  useEffect(() => {
    reset({
      mes: undefined,
      ano: undefined,
      dataInicio: '',
      dataFim: '',
      status: '',
      qualidade: '',
      qualidadeInformacao: '',
      planos: '',
      responsavelConta: '',
      filial: '',
      ticket: '',
      solicitante: '',
      responsavelAnalista: '',
      cliente: '',
      dataAtualizacao: new Date().toISOString().split('T')[0],
      itensPendentes: undefined,
      itensConcluidos: undefined,
      observacoes: ''
    })
  }, [reset])

  // Preencher automaticamente o analista baseado no usuário logado (DEPOIS do reset)
  useEffect(() => {
    if (user && user.name && md.analistas.length > 0) {
      // Encontrar analista correspondente
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user.name.toLowerCase() ||
        analista.nome.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(analista.nome.toLowerCase())
      )
      
      if (analistaCorrespondente) {
        setValue('responsavelAnalista', analistaCorrespondente.id)
      } else {
        const primeiroAnalista = md.analistas[0]
        setValue('responsavelAnalista', primeiroAnalista?.id || '')
      }
    }
  }, [user?.id, user?.name, md.analistas.length, setValue])

  // Função para verificar se o ticket já existe no banco
  const checkTicketExists = async (ticket: string): Promise<boolean> => {
    try {
      console.log('🔍 VALIDAÇÃO TICKET REAJUSTE: Verificando se ticket existe:', ticket)
      
      // Buscar no banco de dados via API
      const baseUrl = 'https://nigteste-production.up.railway.app'
      const response = await fetch(`${baseUrl}/reajustes?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const exists = Array.isArray(data) ? data.length > 0 : data !== null
        
        console.log('🔍 VALIDAÇÃO TICKET REAJUSTE: Resultado da busca:', {
          ticket,
          responseStatus: response.status,
          dataLength: Array.isArray(data) ? data.length : 'not array',
          exists
        })
        
        return exists
      } else {
        console.warn('⚠️ VALIDAÇÃO TICKET REAJUSTE: Erro na API:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ VALIDAÇÃO TICKET REAJUSTE: Erro ao verificar ticket:', error)
      return false
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      // VALIDAÇÃO DE TICKET DUPLICADO
      if (data.ticket && data.ticket.trim() !== '') {
        console.log('🔍 VALIDAÇÃO TICKET REAJUSTE: Verificando ticket fornecido pelo usuário...')
        const ticketExists = await checkTicketExists(data.ticket.trim())
        
        if (ticketExists) {
          console.error('❌ VALIDAÇÃO TICKET REAJUSTE: Ticket já existe no banco de dados!')
          alert(`ERRO: O ticket "${data.ticket.trim()}" já existe no banco de dados. Por favor, escolha outro número de ticket.`)
          return
        } else {
          console.log('✅ VALIDAÇÃO TICKET REAJUSTE: Ticket único, pode prosseguir')
        }
      }
      
      if (!vinculosValidos) {
        alert('Informe ao menos um contrato com operadora em cada linha.')
        return
      }

      const legacy = buildReajusteLegacyFieldsFromVinculos(contratosVinculosRows, data.cliente, md)
      if (!legacy.operadora) {
        alert('Informe a operadora no vínculo de contrato.')
        return
      }
      
      const analista = md.analistas.find((a) => a.id === data.responsavelAnalista)

      await store.add({
        ...data,
        mes: String(data.mes),
        ano: String(data.ano),
        status: data.status || 'Em andamento',
        operadora: legacy.operadora,
        cliente: legacy.cliente,
        contrato: legacy.contrato,
        produto: legacy.produto,
        contratosVinculos: legacy.contratosVinculos,
        responsavelAnalista: analista?.nome || data.responsavelAnalista || '',
        ticket: data.ticket && data.ticket.trim() !== '' ? data.ticket.trim() : null
      })
      
      setContratosVinculosRows([emptyContratoVinculoRow()])
      // Limpar formulário após envio
      reset({
        mes: undefined,
        ano: undefined,
        dataInicio: '',
        dataFim: '',
        status: '',
        operadora: '',
        qualidade: '',
        qualidadeInformacao: '',
        planos: '',
        responsavelConta: '',
        filial: '',
        ticket: '',
        solicitante: '',
        responsavelAnalista: '',
        cliente: '',
        contrato: '',
        produto: '',
        dataAtualizacao: new Date().toISOString().split('T')[0],
        itensPendentes: undefined,
        itensConcluidos: undefined,
        observacoes: ''
      })
      
      navigate('/reajuste')
    } catch (error) {
      console.error('Erro ao criar reajuste:', error)
      alert('Erro ao criar reajuste. Tente novamente.')
    }
  }

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 0, px: 0, bgcolor: 'transparent', width: '100%' }}>
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
                Novo lançamento (Reajuste)
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.92, fontWeight: 400, maxWidth: 560 }}>
                Ordem sugerida: identificação → cliente/contrato → responsabilidade → qualidade e métricas.
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
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="mes" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Mês *"
                      {...formField}
                      error={!!errors.mes}
                      helperText={errors.mes?.message || 'Campo obrigatório'}
                      value={field.value || ''}
                      required
                    >
                      <MenuItem value="" disabled><em>Selecione o mês</em></MenuItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m, i) => (
                        <MenuItem key={m} value={m}>
                          {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][i]}
                        </MenuItem>
                      ))}
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="ano" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Ano *"
                      {...formField}
                      error={!!errors.ano}
                      helperText={errors.ano?.message || 'Campo obrigatório'}
                      placeholder="Ex: 2024"
                      value={field.value || ''}
                      required
                    />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="status" control={control} render={({ field }) => (
                    <TextField {...field} select label="Status *" required {...formField} error={!!errors.status} helperText={errors.status?.message || 'Campo obrigatório'}>
                      <MenuItem value="Pendente">Pendente</MenuItem>
                      <MenuItem value="Em Andamento">Em Andamento</MenuItem>
                      <MenuItem value="Transf. Analista">Transf. Analista</MenuItem>
                      <MenuItem value="Concluído Parcialmente">Concluído Parcialmente</MenuItem>
                      <MenuItem value="Concluído">Concluído</MenuItem>
                      <MenuItem value="Cancelado">Cancelado</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="ticket" control={control} render={({ field }) => (
                    <TextField {...field} label="Ticket" {...formField} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="dataInicio" control={control} render={({ field }) => (
                    <TextField {...field} type="date" label="Data de início" {...formField} InputLabelProps={{ shrink: true }} value={field.value || ''} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="dataFim" control={control} render={({ field }) => (
                    <TextField {...field} type="date" label="Data final" {...formField} InputLabelProps={{ shrink: true }} value={field.value || ''} />
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
                        setContratosVinculosRows([emptyContratoVinculoRow()])
                      }}
                      label="Cliente"
                      helperText="Digite para buscar um cliente"
                      onSelectOption={setSelectedCliente}
                      textFieldProps={formField}
                    />
                  )} />
                </Grid>
                <Grid item xs={12}>
                  <ManutencaoContratosVinculosSection
                    rows={contratosVinculosRows}
                    onChange={setContratosVinculosRows}
                    contratos={contratosDoCliente}
                    operadoras={md.operadoras}
                    produtos={md.produtos}
                    clienteSelected={!!selectedClienteId}
                    textFieldProps={formField}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Responsabilidade</SectionTitle>
              <Grid container spacing={2.25}>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="responsavelAnalista" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Analista responsável *"
                      {...formField}
                      error={!!errors.responsavelAnalista}
                      helperText={errors.responsavelAnalista?.message || `Analista vinculado ao usuário: ${user?.name || 'Carregando...'}`}
                      required
                      InputProps={{ readOnly: true }}
                      sx={{ '& .MuiInputBase-input': { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } }}
                    >
                      {md.analistas.length > 0 ? (
                        md.analistas.map((analista) => (
                          <MenuItem key={analista.id} value={analista.id}>{analista.nome}</MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>Carregando analistas...</MenuItem>
                      )}
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="responsavelConta" control={control} render={({ field }) => (
                    <TextField {...field} label="Responsável da conta" {...formField} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="solicitante" control={control} render={({ field }) => (
                    <Autocomplete
                      options={md.solicitantes}
                      getOptionLabel={(option) => option?.nome || ''}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      value={md.solicitantes.find((s) => s.id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Solicitante"
                          {...formField}
                          error={!!errors.solicitante}
                          helperText={errors.solicitante?.message || 'Digite para buscar um solicitante'}
                          placeholder="Digite para buscar..."
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Typography variant="body1" fontWeight="medium">{option.nome}</Typography>
                        </Box>
                      )}
                      noOptionsText="Nenhum solicitante encontrado"
                      loading={md.solicitantes.length === 0}
                      loadingText="Carregando solicitantes..."
                      filterOptions={(options, { inputValue }) =>
                        options.filter((option) => option.nome.toLowerCase().includes(inputValue.toLowerCase()))
                      }
                    />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="filial" control={control} render={({ field }) => (
                    <TextField {...field} label="Filial" {...formField} />
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={cardSx}>
            <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
              <SectionTitle>Qualidade e métricas</SectionTitle>
              <Grid container spacing={2.25}>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="qualidade" control={control} render={({ field }) => (
                    <TextField {...field} select label="Qualidade (prazo)" {...formField}>
                      <MenuItem value="ANTIGO">ANTIGO</MenuItem>
                      <MenuItem value="FORA DO PRAZO">FORA DO PRAZO</MenuItem>
                      <MenuItem value="NO PRAZO">NO PRAZO</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="qualidadeInformacao" control={control} render={({ field }) => (
                    <TextField {...field} select label="Qualidade da informação" {...formField}>
                      <MenuItem value="ERRO NOS DADOS">ERRO NOS DADOS</MenuItem>
                      <MenuItem value="FALTA DE DADOS">FALTA DE DADOS</MenuItem>
                      <MenuItem value="OK">OK</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="planos" control={control} render={({ field }) => (
                    <TextField {...field} select label="Planos" {...formField}>
                      <MenuItem value="PENDENTE ATUALIZAÇÃO">PENDENTE ATUALIZAÇÃO</MenuItem>
                      <MenuItem value="OK">OK</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="dataAtualizacao" control={control} render={({ field }) => (
                    <TextField {...field} type="date" label="Data de atualização" {...formField} InputLabelProps={{ shrink: true }} value={field.value || ''} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="itensPendentes" control={control} render={({ field }) => (
                    <TextField {...field} type="number" label="Itens pendentes" {...formField} inputProps={{ min: 0 }} value={field.value || ''} />
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Controller name="itensConcluidos" control={control} render={({ field }) => (
                    <TextField {...field} type="number" label="Itens concluídos" {...formField} inputProps={{ min: 0 }} value={field.value || ''} />
                  )} />
                </Grid>
                <Grid item xs={12}>
                  <Controller name="observacoes" control={control} render={({ field }) => (
                    <TextField
                      {...field}
                      label="Observações"
                      {...formField}
                      multiline
                      rows={4}
                      placeholder="Digite observações sobre este reajuste..."
                      value={field.value || ''}
                    />
                  )} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box display="flex" gap={2} flexWrap="wrap">
            <PrimaryActionButton type="button" disabled={!isValid || !vinculosValidos} onClick={handleSubmit(onSubmit)}>
              Salvar
            </PrimaryActionButton>
            <Button variant="outlined" onClick={() => navigate('/reajuste')}>Cancelar</Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  )
}
