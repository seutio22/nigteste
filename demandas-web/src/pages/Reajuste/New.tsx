import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { Autocomplete, Box, Button, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useAuthStore } from '../../store/authStore'
import { useEffect } from 'react'

const schema = z.object({
  mes: z.coerce.number().min(1).max(12),
  ano: z.coerce.number().min(2000),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  operadora: z.string().min(1, 'Obrigatório'),
  qualidade: z.string().optional(),
  qualidadeInformacao: z.string().optional(),
  planos: z.string().optional(),
  responsavelConta: z.string().optional(),
  filial: z.string().optional(),
  ticket: z.string().optional(),
  solicitante: z.string().optional(),
  responsavelAnalista: z.string().min(1, 'Obrigatório'),
  cliente: z.string().optional(),
  contrato: z.string().optional(),
  produto: z.string().optional(),
  dataAtualizacao: z.string().optional(),
  itensPendentes: z.coerce.number().min(0).optional(),
  itensConcluidos: z.coerce.number().min(0).optional(),
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
      itensConcluidos: undefined
    }
  })

  // Lógica para filtrar contratos por cliente (igual à página de cadastro)
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  
  // Filtrar contratos por clienteId (relação direta) OU por grupoEconomico (relação indireta)
  const contratosDoCliente = md.contratos.filter((c: any) => 
    c.clienteId === selectedClienteId || // Relação direta por clienteId
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente) // Relação indireta por grupo
  )

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
      itensConcluidos: undefined
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

  // Limpar contrato quando cliente for alterado
  useEffect(() => {
    setValue('contrato', '')
  }, [selectedClienteId, setValue])

  function onSubmit(data: FormValues) {
    store.add({
      ...data,
      mes: String(data.mes),
      ano: String(data.ano),
      status: data.status || 'Em andamento',
      operadora: data.operadora || '',
      responsavelAnalista: data.responsavelAnalista || '',
      updatedAt: new Date().toISOString()
    })
    
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
      itensConcluidos: undefined
    })
    
    navigate('/reajuste')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Novo Lançamento (Reajuste)</Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Informações Básicas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
              Informações Básicas
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="mes" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Mês *" 
                fullWidth 
                error={!!errors.mes} 
                helperText={errors.mes?.message || 'Campo obrigatório'}
                value={field.value || ''}
                required
              >
                <MenuItem value="" disabled>
                  <em>Selecione o mês</em>
                </MenuItem>
                <MenuItem value={1}>Janeiro</MenuItem>
                <MenuItem value={2}>Fevereiro</MenuItem>
                <MenuItem value={3}>Março</MenuItem>
                <MenuItem value={4}>Abril</MenuItem>
                <MenuItem value={5}>Maio</MenuItem>
                <MenuItem value={6}>Junho</MenuItem>
                <MenuItem value={7}>Julho</MenuItem>
                <MenuItem value={8}>Agosto</MenuItem>
                <MenuItem value={9}>Setembro</MenuItem>
                <MenuItem value={10}>Outubro</MenuItem>
                <MenuItem value={11}>Novembro</MenuItem>
                <MenuItem value={12}>Dezembro</MenuItem>
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="ano" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Ano *" 
                fullWidth 
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
              <TextField {...field} select label="Status *" required fullWidth error={!!errors.status} helperText={errors.status?.message || 'Campo obrigatório'}>
                <MenuItem value="Pendente">Pendente</MenuItem>
                <MenuItem value="Em Andamento">Em Andamento</MenuItem>
                <MenuItem value="Concluído">Concluído</MenuItem>
                <MenuItem value="Cancelado">Cancelado</MenuItem>
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Ticket" fullWidth />
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="dataInicio" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="date" 
                label="Data de Início" 
                fullWidth 
                InputLabelProps={{ shrink: true }}
                value={field.value || ''}
              />
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="dataFim" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="date" 
                label="Data de Finalização" 
                fullWidth 
                InputLabelProps={{ shrink: true }}
                value={field.value || ''}
              />
            )} />
          </Grid>
          
          {/* Informações do Cliente e Operadora */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
              Informações do Cliente e Operadora
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <TextField {...field} select label="Operadora *" required fullWidth error={!!errors.operadora} helperText={errors.operadora?.message || 'Campo obrigatório'}>
                {md.operadoras.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="cliente" control={control} render={({ field }) => (
              <Autocomplete
                {...field}
                options={md.clientes}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                value={md.clientes.find(c => c.id === field.value) || null}
                onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente"
                    fullWidth
                    placeholder="Digite para buscar..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
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
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="contrato" control={control} render={({ field }) => (
              <TextField {...field} select label="Contrato" fullWidth error={!!errors.contrato} helperText={errors.contrato?.message}>
                {contratosDoCliente.length > 0 ? (
                  contratosDoCliente.map(ct => <MenuItem key={ct.id} value={ct.id}>{(ct as any).codigo || (ct as any).numero}</MenuItem>)
                ) : (
                  <MenuItem disabled>
                    {selectedClienteId ? 'Nenhum contrato encontrado para este cliente' : 'Selecione um cliente primeiro'}
                  </MenuItem>
                )}
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
          
          {/* Informações de Responsabilidade */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
              Informações de Responsabilidade
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="responsavelAnalista" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Analista responsável *" 
                fullWidth 
                error={!!errors.responsavelAnalista} 
                helperText={errors.responsavelAnalista?.message || `Analista vinculado ao usuário: ${user?.name || 'Carregando...'}`}
                required
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
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="responsavelConta" control={control} render={({ field }) => (
              <TextField {...field} label="Responsável da Conta" fullWidth />
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="solicitante" control={control} render={({ field }) => (
              <TextField {...field} select label="Solicitante" fullWidth>
                <MenuItem value="">Selecione...</MenuItem>
                {md.solicitantes.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nome}
                  </MenuItem>
                ))}
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="filial" control={control} render={({ field }) => (
              <TextField {...field} label="Filial" fullWidth />
            )} />
          </Grid>
          
          {/* Informações de Qualidade e Planos */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
              Informações de Qualidade e Planos
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="qualidade" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade (prazo)" fullWidth>
                <MenuItem value="ANTIGO">ANTIGO</MenuItem>
                <MenuItem value="FORA DO PRAZO">FORA DO PRAZO</MenuItem>
                <MenuItem value="NO PRAZO">NO PRAZO</MenuItem>
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="qualidadeInformacao" control={control} render={({ field }) => (
              <TextField {...field} select label="Qualidade da Informação" fullWidth>
                <MenuItem value="ERRO NOS DADOS">ERRO NOS DADOS</MenuItem>
                <MenuItem value="FALTA DE DADOS">FALTA DE DADOS</MenuItem>
                <MenuItem value="OK">OK</MenuItem>
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="planos" control={control} render={({ field }) => (
              <TextField {...field} select label="Planos" fullWidth>
                <MenuItem value="PENDENTE ATUALIZAÇÃO">PENDENTE ATUALIZAÇÃO</MenuItem>
                <MenuItem value="OK">OK</MenuItem>
              </TextField>
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="dataAtualizacao" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="date" 
                label="Data de Atualização" 
                fullWidth 
                InputLabelProps={{ shrink: true }}
                value={field.value || ''}
              />
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="itensPendentes" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Itens Pendentes" 
                fullWidth 
                inputProps={{ min: 0 }}
                value={field.value || ''}
              />
            )} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Controller name="itensConcluidos" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Itens Concluídos" 
                fullWidth 
                inputProps={{ min: 0 }}
                value={field.value || ''}
              />
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


