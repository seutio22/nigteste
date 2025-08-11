import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useMasterDataStore } from '@/store/masterDataStore'
import { useReajusteStore } from '@/store/reajusteStore'

const schema = z.object({
  mes: z.coerce.number().min(1).max(12),
  ano: z.coerce.number().min(2000),
  filial: z.string().optional(),
  operadora: z.string().min(1, 'Obrigatório'),
  responsavelAnalista: z.string().min(1, 'Obrigatório'),
  cliente: z.string().optional(),
  contrato: z.string().optional(),
  produto: z.string().optional(),
  total: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

export default function ReajusteNewPage() {
  const navigate = useNavigate()
  const md = useMasterDataStore()
  const store = useReajusteStore()
  const { control, handleSubmit, formState: { errors, isValid } } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  function onSubmit(data: FormValues) {
    store.add({
      ...data,
      mes: String(data.mes),
      ano: String(data.ano),
    })
    navigate('/reajuste')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Novo Lançamento (Reajuste)</Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="mes" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Mês" fullWidth error={!!errors.mes} helperText={errors.mes?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="ano" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Ano" fullWidth error={!!errors.ano} helperText={errors.ano?.message} />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="filial" control={control} render={({ field }) => (
              <TextField {...field} label="Filial" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <TextField {...field} select label="Operadora" required fullWidth error={!!errors.operadora} helperText={errors.operadora?.message}>
                {md.operadoras.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="responsavelAnalista" control={control} render={({ field }) => (
              <TextField {...field} select label="Responsável (Analista)" required fullWidth error={!!errors.responsavelAnalista} helperText={errors.responsavelAnalista?.message}>
                {md.analistas.map(a => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="cliente" control={control} render={({ field }) => (
              <TextField {...field} select label="Cliente" fullWidth>
                {md.clientes.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="contrato" control={control} render={({ field }) => (
              <TextField {...field} select label="Contrato" fullWidth>
                {md.contratos.map(c => <MenuItem key={c.id} value={c.id}>{c.codigo}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select label="Produto" fullWidth>
                {md.produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="total" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Total" fullWidth />
            )} />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={!isValid}>Salvar</Button>
          <Button variant="outlined" onClick={() => navigate('/reajuste')}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}


