import React, { useState, useEffect } from 'react'
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

  // Observar o valor do campo tipoServico para filtrar tipos de demanda
  const tipoServicoValue = useWatch({ control, name: 'tipoServico' })

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

  const onSubmit = async (data: AtendimentoFormData) => {
    try {
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
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Solicitante *"
                    error={!!errors.solicitante}
                    helperText={errors.solicitante?.message}
                  >
                    <MenuItem value="">Selecione...</MenuItem>
                    {masterDataStore.solicitantes.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.nome}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      <MenuItem value="duvida">Dúvida</MenuItem>
                      <MenuItem value="solicitacao">Solicitação</MenuItem>
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
                    <InputLabel>Tipo de Demanda</InputLabel>
                    <Select {...field} label="Tipo de Demanda">
                      {masterDataStore.tiposDemanda
                        .map(tipo => (
                          <MenuItem key={tipo.id} value={tipo.id}>
                            {tipo.nome}
                          </MenuItem>
                        ))}
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
                  <Autocomplete
                    {...field}
                    options={masterDataStore.clientes}
                    getOptionLabel={(option) => option.nome || ''}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    value={masterDataStore.clientes.find(c => c.id === field.value) || null}
                    onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Cliente"
                        fullWidth
                        helperText="Digite para buscar um cliente"
                        placeholder="Digite para buscar..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
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
                    loading={masterDataStore.clientes.length === 0}
                    loadingText="Carregando clientes..."
                    filterOptions={(options, { inputValue }) => {
                      const filtered = options.filter(option =>
                        option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                        (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(inputValue.toLowerCase()))
                      )
                      return filtered
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="contrato"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Contrato</InputLabel>
                    <Select {...field} label="Contrato">
                      {masterDataStore.contratos.map(contrato => (
                        <MenuItem key={contrato.id} value={contrato.id}>
                          {contrato.codigo}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
