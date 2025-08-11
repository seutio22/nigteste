import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useMasterDataStore } from '@/store/masterDataStore'
import { useValidationStore } from '@/store/validationStore'

const schema = z.object({
  analista: z.string().min(1, 'Obrigatório'),
  dataInicio: z.string().min(1, 'Obrigatório'),
  dataFinal: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  periodicidade: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  area: z.string().min(1, 'Obrigatório'),
  demanda: z.string().optional(),
  tipo: z.string().min(1, 'Obrigatório'),
  descricao: z.string().min(1, 'Obrigatório'),
  total: z.coerce.number({ required_error: 'Obrigatório' }).min(0, 'Obrigatório'),
})

type FormValues = z.infer<typeof schema>

export default function ValidationNewPage() {
  const navigate = useNavigate()
  const md = useMasterDataStore()
  const store = useValidationStore()
  const { control, handleSubmit, formState: { errors, isValid } } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  function onSubmit(data: FormValues) {
    store.add({ ...data, total: data.total ?? 0 })
    navigate('/validacao')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Novo Lançamento (Validação)</Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="analista" control={control} render={({ field }) => (
              <TextField {...field} select label="Analista" fullWidth error={!!errors.analista} helperText={errors.analista?.message}>
                {md.analistas.map(a => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
              </TextField>
            )} />
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
                {['Aberta','Em andamento','Aguardando validação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="periodicidade" control={control} render={({ field }) => (
              <TextField {...field} label="Periodicidade" placeholder="Ex.: Mensal, Semanal" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Nº Ticket" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="solicitante" control={control} render={({ field }) => (
              <TextField {...field} label="Solicitante" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="area" control={control} render={({ field }) => (
              <TextField {...field} select required label="Área solicitante" fullWidth error={!!errors.area} helperText={errors.area?.message}>
                {md.areas.map(ar => <MenuItem key={ar.id} value={ar.id}>{ar.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="demanda" control={control} render={({ field }) => (
              <TextField {...field} label="Demanda" placeholder="ID ou descrição" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="tipo" control={control} render={({ field }) => (
              <TextField {...field} select required label="Tipo de demanda" fullWidth error={!!errors.tipo} helperText={errors.tipo?.message}>
                {md.tiposDemanda.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12}>
            <Controller name="descricao" control={control} render={({ field }) => (
              <TextField {...field} required label="Descrição de demanda" fullWidth multiline minRows={2} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="total" control={control} render={({ field }) => (
              <TextField {...field} required type="number" label="Total" fullWidth error={!!(errors as any).total} helperText={(errors as any).total?.message} />
            )} />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={!isValid}>Salvar</Button>
          <Button variant="outlined" onClick={() => navigate('/validacao')}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}


