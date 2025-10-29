

import React, { useState, useEffect, useCallback } from 'react'
import { Autocomplete, Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, FormControl, InputLabel, Select, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useDemandStore } from '../../store/demandStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'

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
  cliente: z.string().optional(),
  contrato: z.string().optional(),
  operadora: z.string().optional(),
  produto: z.string().optional(),
  sistema: z.string().optional(),
  analiseQuantitativa: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  qtdRetornos: z.coerce.number().min(0).optional(),
  qualidade: z.string().optional(),
  qtdClientesVinculados: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  usuariosEmpresa: z.coerce.number().min(0, 'Deve ser um número positivo').optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const listas = {
  status: ['Aberta', 'Em andamento', 'Aguardando validação', 'Com erros', 'Em reajuste', 'Concluída', 'Cancelada'],
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
      sistema: '',
      analiseQuantitativa: 0,
      qtdRetornos: 0,
      qualidade: '',
      qtdClientesVinculados: 0,
      usuariosEmpresa: 0,
      observacoes: '',
    }
  })
  const md = useMasterDataStore()
  const demandStore = useDemandStore()
  const selectedClienteId = useWatch({ control, name: 'cliente' })
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  
  // CORRIGIDO: Filtrar contratos por clienteId (relação direta) OU por grupoEconomico (relação indireta)
  const contratosDoCliente = md.contratos.filter((c: any) => 
    c.clienteId === selectedClienteId || // Relação direta por clienteId
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente) // Relação indireta por grupo
  )
  
  console.log('🔍 CONTRATO: Cliente selecionado:', selectedClienteId)
  console.log('🔍 CONTRATO: Grupo do cliente:', grupoDoCliente)
  console.log('🔍 CONTRATO: Contratos disponíveis para o cliente:', contratosDoCliente.map(c => ({ id: c.id, codigo: c.codigo, clienteId: c.clienteId, grupoEconomico: c.grupoEconomico })))
  const selectedTipoId = useWatch({ control, name: 'tipo' })

  // Sincronização desabilitada temporariamente para evitar travamento
  useEffect(() => {
    console.log('🔧 DemandNewPage: Sincronização automática desabilitada temporariamente')
    // TODO: Reabilitar após otimização completa
    // if (md.syncFromApi) {
    //   console.log('🔍 DemandNewPage: Sincronizando dados mestres...')
    //   md.syncFromApi()
    // }
  }, [])

  // Função para testar conectividade com todos os endpoints
  const testAllEndpoints = async () => {
    console.log('🔍 TESTE: Testando conectividade com todos os endpoints...')
    const endpoints = ['areas', 'analistas', 'operadoras', 'produtos', 'sistemas', 'clientes', 'contratos', 'tiposServico', 'tiposDemanda']
    
    for (const endpoint of endpoints) {
      try {
        const baseUrl = 'https://nigteste-production.up.railway.app'
        const response = await fetch(`${baseUrl}/${endpoint}`)
        const data = await response.json()
        console.log(`✅ TESTE: /${endpoint} - ${data.length} registros`)
      } catch (error) {
        console.error(`❌ TESTE: /${endpoint} - ERRO:`, error)
      }
    }
  }

  // Chamar teste automaticamente após 2 segundos
  useEffect(() => {
    const timer = setTimeout(testAllEndpoints, 2000)
    return () => clearTimeout(timer)
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
      if (md.tiposServico.length === 0 || md.tiposDemanda.length === 0) {
        console.error('❌ DADOS NÃO CARREGADOS: Tipos de Serviço ou Tipos de Demanda estão vazios!')
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
      
      console.log('🔍 DemandNewPage: Dados BRUTOS do formulário recebidos:')
      console.log('📋 TODOS OS CAMPOS:', JSON.stringify(data, null, 2))
      
      console.log('🔍 DemandNewPage: Dados do formulário organizados:', {
        tipoServico: data.tipoServico,
        tipo: data.tipo,
        cliente: data.cliente,
        contrato: data.contrato,
        operadora: data.operadora,
        produto: data.produto,
        sistema: data.sistema,
        area: data.area,
        descricao: data.descricao,
        status: data.status
      })
      
      console.log('🔍 TIPOS DOS CAMPOS:')
      console.log('  tipoServico:', typeof data.tipoServico, '→', data.tipoServico)
      console.log('  tipo:', typeof data.tipo, '→', data.tipo)
      console.log('  cliente:', typeof data.cliente, '→', data.cliente)
      console.log('  contrato:', typeof data.contrato, '→', data.contrato)

      // Log das listas disponíveis para validação
      console.log('🔍 DemandNewPage: Listas disponíveis para validação:', {
        analistas: md.analistas.length,
        areas: md.areas.length,
        tiposServico: md.tiposServico.length, // ← Usado para campo 'tipoServico' 
        tiposDemanda: md.tiposDemanda.length, // ← Usado para campo 'tipo'
        clientes: md.clientes.length,
        contratos: md.contratos.length,
        operadoras: md.operadoras.length,
        produtos: md.produtos.length,
        sistemas: md.sistemas.length
      })
      
      console.log('🔍 DemandNewPage: Buscando analista correspondente')
      console.log('🔍 DemandNewPage: Usuário logado:', { id: user?.id, name: user?.name, role: user?.role })
      console.log('🔍 DemandNewPage: Analista encontrado:', analistaCorrespondente?.nome, 'ID:', analistaCorrespondente?.id)
      
      // Validar se o userId é válido
      if (user?.id) {
        console.log('✅ UserId válido:', user.id)
      } else {
        console.warn('⚠️ UserId não encontrado ou inválido')
      }

      // Função helper para converter string vazia em null e sanitizar dados
      const emptyToNull = (value: string | undefined) => {
        if (!value || typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed !== '' ? trimmed : null
      }
      
      // Sanitização extra dos dados do formulário
      const sanitizedData = {
        ...data,
        tipoServico: emptyToNull(data.tipoServico),
        tipo: emptyToNull(data.tipo),
        cliente: emptyToNull(data.cliente),
        contrato: emptyToNull(data.contrato),
        area: emptyToNull(data.area),
        operadora: emptyToNull(data.operadora),
        produto: emptyToNull(data.produto),
        sistema: emptyToNull(data.sistema)
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

      console.log('🔍 VALIDAÇÃO: Iniciando validação de todos os campos...')
      
      // LOGS ESPECÍFICOS PARA CLIENTE E CONTRATO
      if (data.cliente || data.contrato) {
        console.log('🔍 CLIENTE-CONTRATO DEBUG:')
        console.log('  data.cliente (form):', data.cliente)
        console.log('  data.contrato (form):', data.contrato)
        console.log('  md.clientes disponíveis:', md.clientes.map(c => ({ id: c.id, nome: c.nome })))
        console.log('  md.contratos disponíveis:', md.contratos.map(c => ({ id: c.id, codigo: (c as any).codigo, numero: (c as any).numero, clienteId: (c as any).clienteId })))
      }
      
             // Payload para o backend - com validação detalhada de IDs
       const backendPayload = {
         status: data.status,
         ticket: finalTicket,
                 analistaId: validateId(analistaCorrespondente?.id || null, md.analistas, 'Analista'),
        userId: user?.id || null, // ID do usuário que está criando a demanda
       solicitante: emptyToNull(data.solicitante),
       areaId: validateId(sanitizedData.area, md.areas, 'Área'),
       tipoId: validateId(sanitizedData.tipo, md.tiposDemanda, 'TipoDemanda'),
       descricao: data.descricao || null,
       tipoServicoId: validateId(sanitizedData.tipoServico, md.tiposServico, 'TipoServiço'),
       clienteId: validateId(sanitizedData.cliente, md.clientes, 'Cliente'),
       contratoId: validateId(sanitizedData.contrato, md.contratos, 'Contrato'),
       operadoraId: validateId(sanitizedData.operadora, md.operadoras, 'Operadora'),
       produtoId: validateId(sanitizedData.produto, md.produtos, 'Produto'),
       sistemaId: validateId(sanitizedData.sistema, md.sistemas, 'Sistema'),
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : null,
        dataFinal: data.dataFinal ? new Date(data.dataFinal).toISOString() : null,
        periodicidade: data.analiseQuantitativa ? String(data.analiseQuantitativa) : null,
        qtdRetornos: data.qtdRetornos || null,
        qualidade: emptyToNull(data.qualidade),
        qtdClientesVinculados: data.qtdClientesVinculados || null,
        usuariosEmpresa: data.usuariosEmpresa || null,
        observacoes: emptyToNull(data.observacoes),
      }
      
      console.log('🔍 VALIDAÇÃO: Validação concluída. Verificando se algum campo foi rejeitado...')
      
      // VERIFICAÇÃO DIRETA NO BANCO DE DADOS
      if (data.cliente || data.contrato) {
        console.log('🔍 VERIFICAÇÃO BANCO: Testando se IDs existem no banco...')
        
        try {
          // Testar Cliente
          if (data.cliente) {
            console.log(`🔍 VERIFICAÇÃO BANCO: Testando cliente ID: ${data.cliente}`)
            const baseUrl = 'https://nigteste-production.up.railway.app'
            const clienteResponse = await fetch(`${baseUrl}/clientes/${data.cliente}`)
            if (clienteResponse.ok) {
              const clienteData = await clienteResponse.json()
              console.log('✅ VERIFICAÇÃO BANCO: Cliente encontrado no banco:', clienteData)
            } else {
              console.error('❌ VERIFICAÇÃO BANCO: Cliente NÃO encontrado no banco!', clienteResponse.status)
              alert(`ERRO: Cliente selecionado não existe no banco de dados (Status: ${clienteResponse.status})`)
              return
            }
          }
          
          // Testar Contrato
          if (data.contrato) {
            console.log(`🔍 VERIFICAÇÃO BANCO: Testando contrato ID: ${data.contrato}`)
            const baseUrl = 'https://nigteste-production.up.railway.app'
            const contratoResponse = await fetch(`${baseUrl}/contratos/${data.contrato}`)
            if (contratoResponse.ok) {
              const contratoData = await contratoResponse.json()
              console.log('✅ VERIFICAÇÃO BANCO: Contrato encontrado no banco:', contratoData)
            } else {
              console.error('❌ VERIFICAÇÃO BANCO: Contrato NÃO encontrado no banco!', contratoResponse.status)
              alert(`ERRO: Contrato selecionado não existe no banco de dados (Status: ${contratoResponse.status})`)
              return
            }
          }
        } catch (error) {
          console.error('❌ VERIFICAÇÃO BANCO: Erro ao verificar IDs no banco:', error)
          alert('ERRO: Não foi possível verificar os dados no banco. Verifique a conexão.')
          return
        }
      }

      // Validação específica Cliente-Contrato
      if (data.cliente && data.contrato) {
        const clienteSelecionado = md.clientes.find(c => c.id === data.cliente)
        const contratoSelecionado = md.contratos.find(c => c.id === data.contrato)
        
        console.log('🔍 VALIDAÇÃO CLIENTE-CONTRATO:')
        console.log('  Cliente selecionado:', clienteSelecionado)
        console.log('  Contrato selecionado:', contratoSelecionado)
        
        if (contratoSelecionado && clienteSelecionado) {
          // Verificar se o contrato pertence ao cliente (relação direta ou por grupo)
          const contratoValido = (contratoSelecionado as any).clienteId === clienteSelecionado.id ||
                                  (contratoSelecionado as any).grupoEconomico === clienteSelecionado.grupoEconomico
          
          if (!contratoValido) {
            console.error('❌ VALIDAÇÃO: Contrato não pertence ao cliente selecionado!')
            alert('ERRO: O contrato selecionado não pertence ao cliente escolhido. Verifique a seleção.')
            return
          } else {
            console.log('✅ VALIDAÇÃO: Contrato válido para o cliente selecionado')
          }
        }
      }

      // Verificar se algum campo FK foi rejeitado (enviado como null quando deveria ter valor)
      const rejectedFields = []
      if (data.analista && !backendPayload.analistaId) rejectedFields.push('Analista')
      if (sanitizedData.area && !backendPayload.areaId) rejectedFields.push('Área')
      if (sanitizedData.tipo && !backendPayload.tipoId) rejectedFields.push('TipoDemanda')
      if (sanitizedData.tipoServico && !backendPayload.tipoServicoId) rejectedFields.push('TipoCadastro')
      if (sanitizedData.cliente && !backendPayload.clienteId) rejectedFields.push('Cliente')
      if (sanitizedData.contrato && !backendPayload.contratoId) rejectedFields.push('Contrato')
      if (sanitizedData.operadora && !backendPayload.operadoraId) rejectedFields.push('Operadora')
      if (sanitizedData.produto && !backendPayload.produtoId) rejectedFields.push('Produto')
      if (sanitizedData.sistema && !backendPayload.sistemaId) rejectedFields.push('Sistema')
      
      // Não validar userId por enquanto (comentado para evitar erro)
      // if (user?.id && !backendPayload.userId) rejectedFields.push('Usuário')
      
      if (rejectedFields.length > 0) {
        console.error('❌ CAMPOS REJEITADOS:', rejectedFields)
        alert(`ERRO: Os seguintes campos têm IDs inválidos: ${rejectedFields.join(', ')}. Verifique se os dados foram carregados corretamente.`)
        return
      }

      console.log('🔍 DemandNewPage: Payload final para o backend:', JSON.stringify(backendPayload, null, 2))
      
      // LOG ESPECÍFICO PARA CLIENTE E CONTRATO NO PAYLOAD
      if (backendPayload.clienteId || backendPayload.contratoId) {
        console.log('🔍 PAYLOAD CLIENTE-CONTRATO:')
        console.log('  clienteId no payload:', backendPayload.clienteId)
        console.log('  contratoId no payload:', backendPayload.contratoId)
        console.log('  Tipo de clienteId:', typeof backendPayload.clienteId)
        console.log('  Tipo de contratoId:', typeof backendPayload.contratoId)
      }

      // DEBUG: Criar versão simplificada do payload para teste incremental
      const debugPayload = {
        status: backendPayload.status,
        tipoId: backendPayload.tipoId,
        tipoServicoId: backendPayload.tipoServicoId,
        descricao: backendPayload.descricao
      }
      
      console.log('🔍 DEBUG: Payload simplificado (apenas campos obrigatórios):', JSON.stringify(debugPayload, null, 2))
      console.log('🔍 DEBUG: Se quiser testar apenas campos obrigatórios, descomente a linha de teste abaixo')
      // Descomente a próxima linha para testar apenas com campos obrigatórios:
      // const finalPayload = debugPayload

      const finalPayload = backendPayload

      console.log('🎯 PAYLOAD FINAL ANTES DO ENVIO:')
      console.log('📤 JSON que será enviado:', JSON.stringify(finalPayload, null, 2))
      console.log('🔍 Verificação final de campos obrigatórios:')
      console.log('  status:', finalPayload.status)
      console.log('  tipoId:', finalPayload.tipoId)
      console.log('  tipoServicoId:', finalPayload.tipoServicoId)

      // Preparar payload para o store (usar nomes corretos dos campos)
      const storePayload = {
        status: data.status,
        ticket: finalTicket, // CORRIGIDO: Usar o ticket final calculado (do usuário ou gerado)
        analista: analistaCorrespondente?.nome || null,
        analistaId: analistaCorrespondente?.id || null,
        solicitante: emptyToNull(data.solicitante),
        area: md.areas.find(a => a.id === sanitizedData.area)?.nome || null,
        areaId: sanitizedData.area,
        tipo: md.tiposDemanda.find(t => t.id === sanitizedData.tipo)?.nome || null,
        tipoId: sanitizedData.tipo,
        descricao: data.descricao || null,
        tipoServico: md.tiposServico.find(ts => ts.id === sanitizedData.tipoServico)?.nome || null,
        tipoServicoId: sanitizedData.tipoServico,
        cliente: md.clientes.find(c => c.id === sanitizedData.cliente)?.nome || null,
        clienteId: sanitizedData.cliente,
        contrato: md.contratos.find(c => c.id === sanitizedData.contrato)?.codigo || md.contratos.find(c => c.id === sanitizedData.contrato)?.numero || null,
        contratoId: sanitizedData.contrato,
        operadora: md.operadoras.find(o => o.id === sanitizedData.operadora)?.nome || null,
        operadoraId: sanitizedData.operadora,
        produto: md.produtos.find(p => p.id === sanitizedData.produto)?.nome || null,
        produtoId: sanitizedData.produto,
        sistema: md.sistemas.find(s => s.id === sanitizedData.sistema)?.nome || null,
        sistemaId: sanitizedData.sistema,
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : null,
        dataFinal: data.dataFinal ? new Date(data.dataFinal).toISOString() : null,
        periodicidade: data.analiseQuantitativa ? String(data.analiseQuantitativa) : null,
        qtdRetornos: data.qtdRetornos || null,
        qualidade: emptyToNull(data.qualidade),
        qtdClientesVinculados: data.qtdClientesVinculados || null,
        usuariosEmpresa: data.usuariosEmpresa || null,
        observacoes: emptyToNull(data.observacoes),
      }

      console.log('🔍 DemandNewPage: Payload para o store:', JSON.stringify(storePayload, null, 2))

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
                {md.tiposDemanda.map(td => <MenuItem key={td.id} value={td.id}>{td.nome}</MenuItem>)}
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
            <Controller name="solicitante" control={control} render={({ field }) => (
              <TextField {...field} select label="Solicitante" fullWidth error={!!errors.solicitante} helperText={errors.solicitante?.message}>
                <MenuItem value="">Selecione...</MenuItem>
                {md.solicitantes.map(s => <MenuItem key={s.id} value={s.id}>{s.nome}</MenuItem>)}
              </TextField>
            )} />
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

          {/* Segundo Tópico: Informações do Cliente e Contrato */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              2. Informações do Cliente e Contrato
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
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
                    error={!!errors.cliente}
                    helperText={errors.cliente?.message || 'Digite para buscar um cliente'}
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
          <Grid item xs={12} sm={6} md={4}>
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
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="operadora" control={control} render={({ field }) => (
              <Autocomplete
                {...field}
                options={md.operadoras}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                value={md.operadoras.find(o => o.id === field.value) || null}
                onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Operadora"
                    fullWidth
                    error={!!errors.operadora}
                    helperText={errors.operadora?.message || 'Digite para buscar uma operadora'}
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
                loading={md.operadoras.length === 0}
                loadingText="Carregando operadoras..."
                filterOptions={(options, { inputValue }) => {
                  const filtered = options.filter(option =>
                    option.nome.toLowerCase().includes(inputValue.toLowerCase())
                  )
                  return filtered
                }}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="produto" control={control} render={({ field }) => (
              <TextField {...field} select label="Produto" fullWidth error={!!errors.produto} helperText={errors.produto?.message}>
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

          {/* Terceiro Tópico: Análise e Métricas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 1, mt: 2 }}>
              3. Análise e Métricas
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="analiseQuantitativa" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Análise quantitativa" 
                fullWidth 
                placeholder="Digite um número"
                inputProps={{ min: 0, step: 'any' }}
                error={!!errors.analiseQuantitativa} 
                helperText={errors.analiseQuantitativa?.message || 'Campo numérico livre para análise quantitativa'}
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
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="qtdClientesVinculados" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="QTD Clientes Vinculados - EDGE" 
                fullWidth 
                placeholder="Digite um número"
                inputProps={{ min: 0, step: 1 }}
                error={!!errors.qtdClientesVinculados} 
                helperText={errors.qtdClientesVinculados?.message || 'Quantidade de clientes vinculados ao EDGE'}
              />
            )} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller name="usuariosEmpresa" control={control} render={({ field }) => (
              <TextField 
                {...field} 
                type="number" 
                label="Usuários Empresa - MOVE" 
                fullWidth 
                placeholder="Digite um número"
                inputProps={{ min: 0, step: 1 }}
                error={!!errors.usuariosEmpresa} 
                helperText={errors.usuariosEmpresa?.message || 'Quantidade de usuários da empresa no MOVE'}
              />
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
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancelar</Button>
        </Box>
      </Box>
    </Paper>
  )
}


