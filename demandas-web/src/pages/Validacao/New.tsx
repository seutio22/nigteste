import React, { useState, useEffect } from 'react'
import { Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, FormControl, InputLabel, Select, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useValidationStore } from '../../store/validationStore'
import { useAuthStore } from '../../store/authStore'

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
  itensConcluidos: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

export default function ValidationNewPage() {
  console.log('🔍 ValidationNewPage: Componente carregado')
  
  const navigate = useNavigate()
  const md = useMasterDataStore()
  const store = useValidationStore()
  const { user } = useAuthStore()
  
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
      itensConcluidos: 0
    }
  })

  // Watch para dependências entre campos
  const clienteSelecionado = watch('cliente')
  const operadoraSelecionada = watch('operadora')
  const estruturaEdge = watch('estruturaEdge')
  const estruturaMove = watch('estruturaMove')

  // Buscar o grupo econômico do cliente selecionado
  const clienteSelecionadoData = clienteSelecionado 
    ? md.clientes.find(cliente => cliente.id === clienteSelecionado)
    : null

  // Filtrar contratos por clienteId (relação direta) OU por grupoEconomico (relação indireta)
  const contratosFiltrados = md.contratos.filter((c: any) => {
    const matchClienteId = c.clienteId === clienteSelecionado
    const matchGrupo = clienteSelecionadoData?.grupoEconomico && c.grupoEconomico === clienteSelecionadoData.grupoEconomico
    
    return matchClienteId || matchGrupo
  })


  // Filtrar produtos por operadora selecionada
  const produtosFiltrados = operadoraSelecionada 
    ? md.produtos.filter(produto => produto.operadoraId === operadoraSelecionada || !produto.operadoraId)
    : md.produtos


  // Sincronizar dados mestres quando a página carregar
  React.useEffect(() => {
    if (md.syncFromApi) {
      md.syncFromApi()
    }
  }, [md.syncFromApi])

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

  // Função para calcular o total baseado nos campos EDGE e MOVE
  const calcularTotal = React.useCallback(() => {
    let total = 0
    
    // Somar todos os valores selecionados no EDGE
    if (estruturaEdge && Array.isArray(estruturaEdge)) {
      estruturaEdge.forEach(valor => {
        const numeroEdge = parseInt(valor.split('-')[0])
        if (!isNaN(numeroEdge)) {
          total += numeroEdge
        }
      })
    }
    
    // Somar todos os valores selecionados no MOVE
    if (estruturaMove && Array.isArray(estruturaMove)) {
      estruturaMove.forEach(valor => {
        const numeroMove = parseInt(valor.split('-')[0])
        if (!isNaN(numeroMove)) {
          total += numeroMove
        }
      })
    }
    
    return total
  }, [estruturaEdge, estruturaMove])

  // Calcular total automaticamente
  const totalCalculado = calcularTotal()

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
      
      const validationData = { 
        ...data, 
        total: totalCalculado, 
        updatedAt: new Date().toISOString() 
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Novo Lançamento (Validação)</Typography>
      <Box component="form" key={formKey} onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Primeiro Tópico: Analista e Datas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}>
              1. Informações do Analista e Datas
            </Typography>
          </Grid>
          
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
                {['Aberta','Em andamento','Aguardando validação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="ticket" control={control} render={({ field }) => (
              <TextField {...field} label="Nº Ticket" fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
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

          {/* Segundo Tópico: Cliente, Contrato, Produto, Operadora */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              2. Informações do Cliente e Contrato
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="cliente" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Cliente" 
                fullWidth 
                error={!!errors.cliente} 
                helperText={errors.cliente?.message}
                onChange={(e) => {
                  field.onChange(e)
                  // Limpar contrato quando cliente mudar
                  control._formValues.contrato = ''
                }}
              >
                <MenuItem value="">
                  <em>Selecione um cliente</em>
                </MenuItem>
                {md.clientes.map(cliente => <MenuItem key={cliente.id} value={cliente.id}>{cliente.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="contrato" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Contrato" 
                fullWidth 
                error={!!errors.contrato} 
                helperText={errors.contrato?.message}
              >
                <MenuItem value="">
                  <em>Selecione um contrato</em>
                </MenuItem>
                {contratosFiltrados.length > 0 ? (
                  contratosFiltrados.map((ct: any) => (
                    <MenuItem key={ct.id} value={ct.id}>
                      {ct.codigo || ct.numero}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {clienteSelecionado ? 'Nenhum contrato encontrado para este cliente' : 'Selecione um cliente primeiro'}
                  </MenuItem>
                )}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                label="Operadora" 
                fullWidth 
                error={!!errors.operadora} 
                helperText={errors.operadora?.message}
                onChange={(e) => {
                  field.onChange(e)
                  // Limpar produto quando operadora mudar
                  control._formValues.produto = ''
                }}
              >
                <MenuItem value="">
                  <em>Selecione uma operadora</em>
                </MenuItem>
                {md.operadoras.map(op => <MenuItem key={op.id} value={op.id}>{op.nome}</MenuItem>)}
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select label="Produto" fullWidth error={!!errors.produto} helperText={errors.produto?.message || `${produtosFiltrados.length} produtos disponíveis`}>
                <MenuItem value="">
                  <em>Selecione um produto</em>
                </MenuItem>
                {produtosFiltrados.map(produto => <MenuItem key={produto.id} value={produto.id}>{produto.nome}</MenuItem>)}
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

          {/* Terceiro Tópico: Qualidade e Retornos */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              3. Qualidade e Retornos
            </Typography>
          </Grid>
          
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
                helperText={`Calculado automaticamente: EDGE (${estruturaEdge?.length || 0} seleções) + MOVE (${estruturaMove?.length || 0} seleções) = ${totalCalculado}`}
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

          {/* Novos campos para estruturas EDGE, MOVE e formalização */}
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="estruturaEdge" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                SelectProps={{
                  multiple: true,
                  value: field.value || [],
                  onChange: (e) => field.onChange(e.target.value)
                }}
                label="Estrutura EDGE (Multi-seleção)" 
                fullWidth
                helperText={`${field.value?.length || 0} item(s) selecionado(s)`}
              >
                <MenuItem value="0">0- Sem erros</MenuItem>
                <MenuItem value="1-CODIGO_CONTRATO">1-ERRO CODIGO CONTRATO</MenuItem>
                <MenuItem value="1-CNPJ">1-ERRO CNPJ</MenuItem>
                <MenuItem value="1-CODIGO_SUB">1-ERRO CODIGO SUB</MenuItem>
                <MenuItem value="1-VIGENCIA">1-ERRO VIGENCIA</MenuItem>
                <MenuItem value="1-ASSOCIACAO_MOVE">1-ERRO ASSOCIAÇÃO NO MOVE</MenuItem>
                <MenuItem value="1-RAZAO_SOCIAL">1-ERRO RAZÃO SOCIAL</MenuItem>
                <MenuItem value="1-PLANO_COBERTURAS">1-ERRO Plano; Cadastrado/Coberturas</MenuItem>
                <MenuItem value="1-FINANCEIRO">1-ERRO Financeiro</MenuItem>
                <MenuItem value="1-LIMITE_TECNICO">1-ERRO Limite Técnico</MenuItem>
                <MenuItem value="1-COPARTICIPACAO">1-ERRO Coparticipação</MenuItem>
                <MenuItem value="1-CONTRIBUICAO">1-ERRO Contribuição</MenuItem>
                <MenuItem value="1-DADOS_GERAIS">1-ERRO Dados Gerais</MenuItem>
              </TextField>
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="estruturaMove" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                select 
                SelectProps={{
                  multiple: true,
                  value: field.value || [],
                  onChange: (e) => field.onChange(e.target.value)
                }}
                label="Estrutura MOVE (Multi-seleção)" 
                fullWidth
                helperText={`${field.value?.length || 0} item(s) selecionado(s)`}
              >
                <MenuItem value="0">0- Sem erros</MenuItem>
                <MenuItem value="1-CODIGO_CONTRATO">1-ERRO CODIGO CONTRATO</MenuItem>
                <MenuItem value="1-CNPJ">1-ERRO CNPJ</MenuItem>
                <MenuItem value="1-CODIGO_SUB">1-ERRO CODIGO SUB</MenuItem>
                <MenuItem value="1-VIGENCIA">1-ERRO VIGENCIA</MenuItem>
                <MenuItem value="1-ASSOCIACAO_MOVE">1-ERRO ASSOCIAÇÃO NO MOVE</MenuItem>
                <MenuItem value="1-RAZAO_SOCIAL">1-ERRO RAZÃO SOCIAL</MenuItem>
              </TextField>
            )} />
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
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="itensConcluidos" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Itens Concluídos" 
                fullWidth 
                inputProps={{ min: 0 }}
                placeholder="0"
                helperText="Quantidade de itens concluídos"
              />
            )} />
          </Grid>

          {/* Campos Adicionais */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              4. Informações Adicionais
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Controller name="descricao" control={control} render={({ field }) => (
              <TextField {...field} label="Descrição do chamado" fullWidth multiline minRows={2} error={!!errors.descricao} helperText={errors.descricao?.message} />
            )} />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={!isValid}>
            Salvar
          </Button>
          <Button variant="outlined" onClick={() => navigate('/validacao')}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}


