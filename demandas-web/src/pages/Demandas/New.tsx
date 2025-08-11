import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { useEffect } from 'react'
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useMasterDataStore } from '@/store/masterDataStore'
import { useDemandStore } from '@/store/demandStore'

const schema = z.object({
  // Somente obrigatórios conforme solicitação: cliente, contrato, operadora, produto, status, tipoServico
  status: z.string().min(1, 'Obrigatório'),
  cliente: z.string().min(1, 'Obrigatório'),
  contrato: z.string().min(1, 'Obrigatório'),
  operadora: z.string().min(1, 'Obrigatório'),
  produto: z.string().min(1, 'Obrigatório'),
  tipoServico: z.string().min(1, 'Obrigatório'),

  // Demais campos opcionais no momento
  analista: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFinal: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  area: z.string().optional(),
  tipo: z.string().optional(),
  descricao: z.string().optional(),
  sistema: z.string().optional(),
  qtdRetornos: z.coerce.number().min(0).optional(),
  qualidade: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const listas = {
  status: ['Aberta', 'Em andamento', 'Aguardando validação', 'Com erros', 'Em reajuste', 'Concluída', 'Cancelada'],
  qualidade: ['Baixa', 'Média', 'Alta'],
}

export default function DemandNewPage() {
  const navigate = useNavigate()
  const { control, handleSubmit, formState: { errors, isValid }, setValue } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })
  const md = useMasterDataStore()
  const demandStore = useDemandStore()
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  const contratosDoGrupo = md.contratos.filter(c => c.grupoEconomico === (grupoDoCliente ?? ''))
  const selectedTipoServicoId = useWatch({ control, name: 'tipoServico' })
  const selectedTipoId = useWatch({ control, name: 'tipo' })
  const tiposDemandaFiltrados = selectedTipoServicoId
    ? md.tiposDemanda.filter(td => td.tipoServicoId === selectedTipoServicoId)
    : md.tiposDemanda

  useEffect(() => {
    // Ao mudar o Tipo de serviço, limpar o Tipo de demanda para evitar inconsistência
    setValue('tipo', undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTipoServicoId])

  function onSubmit(data: FormValues) {
    const payload = {
      status: data.status,
      ticket: data.ticket,
      analista: data.analista,
      solicitante: data.solicitante,
      area: data.area,
      tipo: data.tipo,
      descricao: data.descricao,
      tipoServico: data.tipoServico,
      cliente: data.cliente,
      contrato: data.contrato,
      operadora: data.operadora,
      produto: data.produto,
      sistema: data.sistema,
      dataInicio: data.dataInicio,
      dataFinal: data.dataFinal,
      qtdRetornos: data.qtdRetornos,
      qualidade: data.qualidade,
      observacoes: data.observacoes,
    }
    const created = demandStore.add(payload)
    navigate(`/cadastro/${created.id}`)
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Nova Demanda</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Campos marcados com * são obrigatórios.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="analista" control={control} render={({ field }) => (
              <TextField {...field} select label="Analista responsável" fullWidth error={!!errors.analista} helperText={errors.analista?.message}>
                {md.analistas.map(a => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipoServico" control={control} render={({ field }) => (
              <TextField {...field} select required label="Tipo de serviço" fullWidth error={!!errors.tipoServico} helperText={errors.tipoServico?.message}>
                {md.tiposServico.map(sv => <MenuItem key={sv.id} value={sv.id}>{sv.nome}</MenuItem>)}
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
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} select required label="Status" fullWidth error={!!errors.status} helperText={errors.status?.message}>
                {listas.status.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Nº Ticket" fullWidth error={!!errors.ticket} helperText={errors.ticket?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="solicitante" control={control} render={({ field }) => (
              <TextField {...field} label="Solicitante" fullWidth error={!!errors.solicitante} helperText={errors.solicitante?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="area" control={control} render={({ field }) => (
              <TextField {...field} select label="Área solicitante" fullWidth error={!!errors.area} helperText={errors.area?.message}>
                {md.areas.map(ar => <MenuItem key={ar.id} value={ar.id}>{ar.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          {selectedTipoServicoId && (
            <Grid item xs={12} sm={6} md={4}>
              <Controller name="tipo" control={control} render={({ field }) => (
                <TextField {...field} select label="Tipo de demanda" fullWidth error={!!errors.tipo} helperText={errors.tipo?.message ?? (tiposDemandaFiltrados.length === 0 ? 'Nenhum tipo para o serviço selecionado' : undefined)}>
                  {tiposDemandaFiltrados.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
          )}
          <Grid item xs={12}>
            <Controller name="descricao" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição da demanda" fullWidth multiline minRows={3} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="cliente" control={control} render={({ field }) => (
              <TextField {...field} select required label="Cliente" fullWidth error={!!errors.cliente} helperText={errors.cliente?.message}>
                {md.clientes.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="contrato" control={control} render={({ field }) => (
              <TextField {...field} select required label="Contrato" fullWidth error={!!errors.contrato} helperText={errors.contrato?.message}>
                {contratosDoGrupo.map(ct => <MenuItem key={ct.id} value={ct.id}>{ct.codigo}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <TextField {...field} select required label="Operadora" fullWidth error={!!errors.operadora} helperText={errors.operadora?.message}>
                {md.operadoras.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select required label="Produto" fullWidth error={!!errors.produto} helperText={errors.produto?.message}>
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
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qtdRetornos" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Qtde de retornos" fullWidth error={!!errors.qtdRetornos} helperText={errors.qtdRetornos?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qualidade" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade" fullWidth error={!!errors.qualidade} helperText={errors.qualidade?.message}>
                {listas.qualidade.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12}>
            <Controller name="observacoes" control={control} render={({ field }) => (
              <TextField {...field} label="Observações" fullWidth multiline minRows={2} error={!!errors.observacoes} helperText={errors.observacoes?.message} />
            )} />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={!isValid}>Salvar</Button>
          <Button variant="outlined" onClick={() => history.back()}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}


