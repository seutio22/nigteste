import React, { useState, useMemo, useEffect } from 'react'
import { Paper, Typography, Box, Button, Alert } from '@mui/material'
import * as XLSX from 'xlsx'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDadosStore } from '../store/dadosStore'
import { useDadosCRUD } from '../hooks/useDadosCRUD'
import { DadosHeader } from '../components/DadosHeader'
import { DadosTabs } from '../components/DadosTabs'
import { DadosGrid } from '../components/DadosGrid'
import { DadosForm } from '../components/DadosForm'
import { DadosHelpModal } from '../components/DadosHelpModal'
import { SnackNotification } from '../components/SnackNotification'
import { UploadModal } from '../components/UploadModal'
import { SmartImporter } from '../components/SmartImporter'
import { BulkDeleteModal } from '../components/BulkDeleteModal'
import { useBulkDelete } from '../hooks/useBulkDelete'
// CleanupModal removido - função de limpeza de duplicatas removida
import { smartImporterConfigs } from '../config/smartImporterConfigs'
import type { TabKey, FormData, DataMap } from '../types/dadosTypes'
import type { ImportResult } from '../types/smartImporter'

export default function DadosPage() {
  const store = useMasterDataStore()
  const dadosStore = useDadosStore()
  const { snack, setSnack, saveEntity, deleteEntity } = useDadosCRUD()
  const { bulkDelete, isDeleting } = useBulkDelete()
  
  const [activeTab, setActiveTab] = useState<TabKey>('clientes')
  const [form, setForm] = useState<FormData>({})
  const [openForm, setOpenForm] = useState(false)
  const [openHelp, setOpenHelp] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  // cleanupModalOpen removido - modal de limpeza de duplicatas removido

  // Sincronização dinâmica ativada - será feita automaticamente pelo useDynamicSync
  useEffect(() => {
    console.log('🔧 DadosPage: Sincronização dinâmica ativada - dados serão carregados automaticamente')
  }, [store])


  // Mapeamento de dados para cada aba
  const dataMap: DataMap = useMemo(() => ({
    clientes: store.clientes,
    contratos: store.contratos,
    operadoras: store.operadoras,
    produtos: store.produtos,
    sistemas: store.sistemas,
    grupos: store.grupos,
    analistas: store.analistas,
    areas: store.areas,
    // Tipos e categorias
    tipos: store.tiposDemanda,
    'tipos-cadastro': store.tiposCadastro,
    servicos: store.tiposServico,
    padrao: store.padrao,
    // Dados de Mailling
    areasMailling: store.areasMailling,
    cargosMailling: store.cargosMailling,
    filiaisMailling: store.filiaisMailling,
    // Outros dados
    solicitantes: store.solicitantes,
    relatorios: store.relatorios,
    modelos: store.modelos,
    // Propriedades para Analytics (que estavam faltando)
    categorias: store.categorias,
    periodicidades: store.periodicidades,
    status: store.status,
    // Dados de configuração
    configuracoes: dadosStore.items,
  }), [store, dadosStore])

  // Dados atuais da aba selecionada
  const currentData = useMemo(() => {
    const data = dataMap[activeTab] || []
    
    // Aplicar filtro de contratos ativos apenas se estiver na aba de contratos
    if (activeTab === 'contratos') {
      const { showOnlyActiveContracts } = store
      if (showOnlyActiveContracts) {
        return data.filter((contrato: any) => contrato.status === 'Ativo')
      }
    }
    
    return data
  }, [dataMap, activeTab, store.showOnlyActiveContracts])
  

  // Handlers
  const handleAdd = () => {
    // Inicializar formulário com valores padrão baseado na aba ativa
    const defaultForm: FormData = {}
    
    // Para contratos, definir status padrão como Ativo
    if (activeTab === 'contratos') {
      defaultForm.status = 'Ativo'
    }
    
    // Para entidades de mailling, definir ativo como true por padrão e descricao como string vazia
    if (['areasMailling', 'cargosMailling', 'filiaisMailling'].includes(activeTab)) {
      defaultForm.ativo = true
      defaultForm.descricao = ''
    }
    
    console.log('🔍 DADOS: Formulário inicializado para', activeTab, ':', defaultForm)
    setForm(defaultForm)
    setOpenForm(true)
  }

  const handleEdit = (row: any) => {
    setForm({ ...row })
    setOpenForm(true)
  }

  const handleDelete = async (id: string) => {
    const success = await deleteEntity(activeTab, id)
    if (success) {
      setOpenForm(false)
    }
  }

  // Função para limpar dados locais das áreas e forçar sincronização
  const handleClearAreasLocalData = async () => {
    if (activeTab === 'areas') {
      store.clearAreasLocalData()
      // Forçar nova sincronização
      await store.syncFromApi?.()
    }
  }

  const handleSave = async () => {
    const success = await saveEntity(activeTab, form)
    if (success) {
      setOpenForm(false)
      setForm({})
    }
  }

  // handleCleanupSuccess removido - função de limpeza de duplicatas removida


  const handleFormClose = () => {
    setOpenForm(false)
    setForm({})
  }


  


  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      // Processar itens válidos em lotes para evitar timeout
      
      const BATCH_SIZE = 50 // Processar em lotes de 50
      const batches = []
      
      for (let i = 0; i < result.valid.length; i += BATCH_SIZE) {
        batches.push(result.valid.slice(i, i + BATCH_SIZE))
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        for (let i = 0; i < batch.length; i++) {
          const item = batch[i]
          const globalIndex = batchIndex * BATCH_SIZE + i
          // Definir data fora do try-catch para estar acessível no catch
          const data = item.isCorrected ? item.correctedData : item.data
          
          try {
          // Determinar endpoint baseado na aba ativa
          let endpoint = ''
          let payload: any = {}

          switch (activeTab) {
            case 'clientes':
              endpoint = '/clientes'
              payload = { nome: data.nome, grupoEconomico: data.grupoEconomico }
              break
            case 'contratos':
              endpoint = '/contratos'
              payload = { 
                codigo: data.codigo, 
                numero: data.numero || data.codigo || `CONT-${Date.now()}`, // Garantir que numero existe
                grupoEconomico: data.grupoEconomico, 
                status: data.status || 'Ativo' // Garantir que status existe
              }
              break
            case 'operadoras':
              endpoint = '/operadoras'
              payload = { nome: data.nome }
              break
            case 'produtos':
              endpoint = '/produtos'
              payload = { nome: data.nome }
              break
            case 'sistemas':
              endpoint = '/sistemas'
              payload = { nome: data.nome }
              break
            case 'grupos':
              endpoint = '/grupos'
              payload = { nome: data.nome }
              break
            case 'analistas':
              endpoint = '/analistas'
              payload = { nome: data.nome }
              break
            case 'areas':
              endpoint = '/areas'
              payload = { nome: data.nome }
              break
            case 'solicitantes':
              endpoint = '/solicitantes'
              payload = { nome: data.nome }
              break
            case 'relatorios':
              endpoint = '/relatorios'
              payload = { nome: data.nome, descricao: data.descricao || '' }
              break
            case 'modelos':
              endpoint = '/modelos'
              payload = { nome: data.nome, descricao: data.descricao || '' }
              break
            case 'areasMailling':
              endpoint = '/areas-mailling'
              payload = { nome: data.nome, descricao: data.descricao || '', ativo: data.ativo !== undefined ? data.ativo : true }
              break
            case 'cargosMailling':
              endpoint = '/cargos-mailling'
              payload = { nome: data.nome, descricao: data.descricao || '', ativo: data.ativo !== undefined ? data.ativo : true }
              break
            case 'filiaisMailling':
              endpoint = '/filiais-mailling'
              payload = { nome: data.nome, descricao: data.descricao || '', ativo: data.ativo !== undefined ? data.ativo : true }
              break
            default:
              console.warn(`Endpoint não configurado para ${activeTab}`)
              continue
          }

          if (endpoint) {
            await api.post(endpoint, payload)
            totalSavedToDatabase++
            
            // Pequeno delay para evitar sobrecarga da API
            if (i % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }

          totalImported++
          } catch (apiError: any) {
            console.error(`❌ Erro ao salvar item ${globalIndex + 1} no banco:`, apiError)
            
            // Extrair mensagem de erro específica da API
            let errorMessage = 'Erro desconhecido'
            if (apiError?.message) {
              errorMessage = apiError.message
            } else if (apiError?.data?.message) {
              errorMessage = apiError.data.message
            } else if (typeof apiError === 'string') {
              errorMessage = apiError
            }
            
            // Adicionar informação do item que falhou (nome ou código)
            const itemIdentifier = data.nome || data.codigo || data.numero || `item-${globalIndex + 1}`
            errors.push(`${itemIdentifier}: ${errorMessage}`)
            
            // Se há muitos erros consecutivos, pode ser um problema de timeout ou limite
            if (errors.length > 100) {
              console.error(`❌ Muitos erros consecutivos (${errors.length}). Parando importação.`)
              break
            }
          }
        }
        
        // Delay entre lotes para evitar sobrecarga
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Aguardando 2 segundos antes do próximo lote...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Atualizar store local
      const storeKey = activeTab as keyof typeof store
      if (storeKey in store) {
        const newItems = result.valid.map(item => ({
          id: crypto.randomUUID(),
          ...(item.isCorrected ? item.correctedData : item.data),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))

        store.upsertMany({ [storeKey]: [...(store[storeKey] as any[]), ...newItems] })
      }

      // Mostrar resultado
      const successMessage = totalSavedToDatabase > 0 
        ? `Importação inteligente concluída! ${totalImported} registros importados e ${totalSavedToDatabase} salvos no banco de dados.`
        : `Importação inteligente concluída! ${totalImported} registros importados localmente.`

      setSnack({
        open: true,
        message: successMessage,
        severity: totalSavedToDatabase > 0 ? 'success' : 'warning'
      })

      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT: Alguns erros ocorreram:', errors)
        
        // Mostrar detalhes dos erros
        const errorDetails = errors.slice(0, 3).join('\n') // Mostrar até 3 erros
        const moreErrors = errors.length > 3 ? `\n... e mais ${errors.length - 3} erro(s)` : ''
        
        setSnack({
          open: true,
          message: `${successMessage}\n\nErros encontrados:\n${errorDetails}${moreErrors}`,
          severity: 'warning'
        })
      }

      console.log(`✅ SMART IMPORT: Processamento concluído.`)
      console.log(`📊 Total processado: ${totalImported}`)
      console.log(`💾 Total salvo no banco: ${totalSavedToDatabase}`)
      console.log(`❌ Total de erros: ${errors.length}`)
      console.log(`📈 Taxa de sucesso: ${totalSavedToDatabase > 0 ? ((totalSavedToDatabase / totalImported) * 100).toFixed(1) : 0}%`)

    } catch (error) {
      console.error('❌ SMART IMPORT: Erro geral:', error)
      setSnack({
        open: true,
        message: 'Erro durante a importação inteligente. Tente novamente.',
        severity: 'error'
      })
    }
  }

  const handleExportCurrent = () => {
    try {
      const currentData = dataMap[activeTab] || []
      if (!currentData || currentData.length === 0) {
        setSnack({
          open: true,
          message: 'Nenhum dado para exportar nesta aba',
          severity: 'warning'
        })
        return
      }

      console.log(`📊 EXPORTAÇÃO DA ABA: Iniciando exportação de ${activeTab}...`)
      console.log(`📋 Dados encontrados: ${currentData.length} itens`)

      // Criar workbook
      const workbook = XLSX.utils.book_new()
      
      // Processar dados para garantir que todos os campos sejam incluídos
      const processedData = currentData.map(item => {
        // Se o item é um objeto, incluir todas as propriedades
        if (typeof item === 'object' && item !== null) {
          return { ...item }
        }
        return item
      })
      
      // Converter dados para worksheet
      const worksheet = XLSX.utils.json_to_sheet(processedData)
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, activeTab)
      
      // Gerar nome do arquivo
      const fileName = `dados_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`
      
      // Fazer download
      XLSX.writeFile(workbook, fileName)
      
      console.log(`✅ EXPORTAÇÃO DA ABA: ${currentData.length} itens exportados de ${activeTab}`)
      
      setSnack({
        open: true,
        message: `Dados de ${activeTab} exportados com sucesso! ${currentData.length} itens`,
        severity: 'success'
      })
    } catch (error) {
      console.error('❌ Erro ao exportar dados atuais:', error)
      setSnack({
        open: true,
        message: 'Erro ao exportar dados',
        severity: 'error'
      })
    }
  }

  const handleExportAll = () => {
    try {
      const workbook = XLSX.utils.book_new()
      
      // Lista COMPLETA de todas as entidades para exportar (incluindo campos que estavam faltando)
      const entities = [
        { key: 'clientes', data: store.clientes, name: 'Clientes' },
        { key: 'contratos', data: store.contratos, name: 'Contratos' },
        { key: 'operadoras', data: store.operadoras, name: 'Operadoras' },
        { key: 'produtos', data: store.produtos, name: 'Produtos' },
        { key: 'sistemas', data: store.sistemas, name: 'Sistemas' },
        { key: 'grupos', data: store.grupos, name: 'Grupos' },
        { key: 'analistas', data: store.analistas, name: 'Analistas' },
        { key: 'areas', data: store.areas, name: 'Areas' },
        { key: 'tiposCadastro', data: store.tiposCadastro, name: 'Tipos Cadastro' },
        { key: 'tiposServico', data: store.tiposServico, name: 'Tipos Servico' },
        { key: 'tiposDemanda', data: store.tiposDemanda, name: 'Tipos Demanda' },
        { key: 'solicitantes', data: store.solicitantes, name: 'Solicitantes' },
        { key: 'relatorios', data: store.relatorios, name: 'Relatorios' },
        { key: 'modelos', data: store.modelos, name: 'Modelos' },
        { key: 'padrao', data: store.padrao, name: 'Padrao' },
        // Dados de Mailling
        { key: 'areasMailling', data: store.areasMailling, name: 'Areas Mailling' },
        { key: 'cargosMailling', data: store.cargosMailling, name: 'Cargos Mailling' },
        { key: 'filiaisMailling', data: store.filiaisMailling, name: 'Filiais Mailling' },
        // Propriedades para Analytics (que estavam faltando)
        { key: 'categorias', data: store.categorias, name: 'Categorias' },
        { key: 'periodicidades', data: store.periodicidades, name: 'Periodicidades' },
        { key: 'status', data: store.status, name: 'Status' },
        // Dados de configuração
        { key: 'configuracoes', data: dadosStore.items, name: 'Configuracoes' }
      ]
      
      console.log('📊 EXPORTAÇÃO COMPLETA: Iniciando exportação de todas as entidades...')
      
      // Adicionar cada entidade como uma aba
      let totalExported = 0
      entities.forEach(entity => {
        if (entity.data && entity.data.length > 0) {
          console.log(`📋 Exportando ${entity.name}: ${entity.data.length} itens`)
          
          // Processar dados para garantir que todos os campos sejam incluídos
          const processedData = entity.data.map(item => {
            // Se o item é um objeto, incluir todas as propriedades
            if (typeof item === 'object' && item !== null) {
              return { ...item }
            }
            return item
          })
          
          const worksheet = XLSX.utils.json_to_sheet(processedData)
          XLSX.utils.book_append_sheet(workbook, worksheet, entity.name)
          totalExported += entity.data.length
        } else {
          console.log(`⚠️ ${entity.name}: Sem dados para exportar`)
        }
      })
      
      // Verificar se há dados para exportar
      const hasData = entities.some(entity => entity.data && entity.data.length > 0)
      if (!hasData) {
        setSnack({
          open: true,
          message: 'Nenhum dado para exportar',
          severity: 'warning'
        })
        return
      }
      
      // Gerar nome do arquivo
      const fileName = `dados_completos_${new Date().toISOString().split('T')[0]}.xlsx`
      
      // Fazer download
      XLSX.writeFile(workbook, fileName)
      
      console.log(`✅ EXPORTAÇÃO COMPLETA: ${totalExported} itens exportados em ${entities.filter(e => e.data && e.data.length > 0).length} abas`)
      
      setSnack({
        open: true,
        message: `Todos os dados exportados com sucesso! ${totalExported} itens em ${entities.filter(e => e.data && e.data.length > 0).length} abas`,
        severity: 'success'
      })
    } catch (error) {
      console.error('❌ Erro ao exportar todos os dados:', error)
      setSnack({
        open: true,
        message: 'Erro ao exportar dados',
        severity: 'error'
      })
    }
  }

  const handleBulkDelete = async (column: string, records: any[]) => {
    try {
      const result = await bulkDelete(column, records)
      
      if (result.success) {
        setSnack({
          open: true,
          message: `Exclusão em massa concluída! ${result.deletedCount} registros excluídos e arquivados por 3 meses.`,
          severity: 'success'
        })
        
        // Forçar sincronização para atualizar a interface
        if (store.syncFromApi) {
          await store.syncFromApi()
        }
      } else {
        setSnack({
          open: true,
          message: `Erro na exclusão em massa: ${result.errors.join(', ')}`,
          severity: 'error'
        })
      }
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      setSnack({
        open: true,
        message: 'Erro inesperado na exclusão em massa',
        severity: 'error'
      })
    }
  }

  const handleUpload = async (file: File) => {
    try {
      // Importar API
      const { api } = await import('../lib/api.local')
      
      // Ler o arquivo Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []
      
      // Processar cada aba do Excel
      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length < 2) {
            continue
          }
          
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1) as any[][]
          
          
          // Mapear dados baseado no nome da aba
          switch (sheetName.toLowerCase()) {
            case 'contratos':
              console.log(`🔍 UPLOAD: Processando contratos - Headers:`, headers)
              console.log(`🔍 UPLOAD: Processando contratos - Primeiras 3 linhas:`, rows.slice(0, 3))
              
              const contratosData = rows.map((row, rowIndex) => {
                const contrato: any = { id: crypto.randomUUID() }
                console.log(`🔍 UPLOAD: Processando linha ${rowIndex + 1}:`, row)
                
                headers.forEach((header, index) => {
                  const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  const value = row[index]
                  console.log(`🔍 UPLOAD: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
                  
                  if (cleanHeader === 'id' && value) {
                    contrato.id = value
                  } else if (cleanHeader === 'codigo') {
                    contrato.codigo = value
                  } else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') {
                    contrato.grupoEconomico = value
                  } else if (cleanHeader === 'status') {
                    contrato.status = value || 'Ativo' // Valor padrão se não informado
                  }
                })
                
                console.log(`🔍 UPLOAD: Contrato processado:`, contrato)
                return contrato
              }).filter(c => {
                const isValid = c.codigo && c.grupoEconomico && c.status
                console.log(`🔍 UPLOAD: Contrato ${c.id} válido? ${isValid} (codigo: "${c.codigo}", grupoEconomico: "${c.grupoEconomico}", status: "${c.status}")`)
                return isValid
              })
              
              console.log(`🔍 UPLOAD: Contratos válidos encontrados:`, contratosData.length)
              console.log(`🔍 UPLOAD: Estado atual do store antes do upsert:`, store.contratos.length)
              
              if (contratosData.length > 0) {
                const newContratos = [...store.contratos, ...contratosData]
                console.log(`🔍 UPLOAD: Novos contratos a serem adicionados:`, contratosData)
                console.log(`🔍 UPLOAD: Total de contratos após merge:`, newContratos.length)
                
                // Salvar no store local
                store.upsertMany({ contratos: newContratos })
                totalImported += contratosData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const contrato of contratosData) {
                    await api.post('/contratos', {
                      codigo: contrato.codigo,
                      grupoEconomico: contrato.grupoEconomico,
                      status: contrato.status
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${contratosData.length} contratos salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar contratos no banco:`, apiError)
                  errors.push(`Erro ao salvar contratos no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${contratosData.length} contratos importados`)
                
                // Verificar estado após upsert
                setTimeout(() => {
                  console.log(`🔍 UPLOAD: Estado do store após upsert:`, store.contratos.length)
                  console.log(`🔍 UPLOAD: Contratos no store:`, store.contratos)
                }, 100)
              } else {
                console.log(`⚠️ UPLOAD: Nenhum contrato válido encontrado`)
              }
              break
              
            case 'clientes':
              console.log(`🔍 UPLOAD: Processando clientes - Headers:`, headers)
              console.log(`🔍 UPLOAD: Processando clientes - Primeiras 3 linhas:`, rows.slice(0, 3))
              
              const clientesData = rows.map((row, rowIndex) => {
                const cliente: any = { id: crypto.randomUUID() }
                console.log(`🔍 UPLOAD: Processando linha ${rowIndex + 1}:`, row)
                
                headers.forEach((header, index) => {
                  const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  const value = row[index]
                  console.log(`🔍 UPLOAD: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
                  
                  if (cleanHeader === 'id' && value) {
                    cliente.id = value
                  } else if (cleanHeader === 'nome') {
                    cliente.nome = value
                  } else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') {
                    cliente.grupoEconomico = value
                  }
                })
                
                console.log(`🔍 UPLOAD: Cliente processado:`, cliente)
                return cliente
              }).filter(c => {
                const isValid = c.nome
                console.log(`🔍 UPLOAD: Cliente ${c.id} válido? ${isValid} (nome: "${c.nome}", grupoEconomico: "${c.grupoEconomico}")`)
                return isValid
              })
              
              console.log(`🔍 UPLOAD: Clientes válidos encontrados:`, clientesData.length)
              console.log(`🔍 UPLOAD: Estado atual do store antes do upsert:`, store.clientes.length)
              
              if (clientesData.length > 0) {
                const newClientes = [...store.clientes, ...clientesData]
                console.log(`🔍 UPLOAD: Novos clientes a serem adicionados:`, clientesData)
                console.log(`🔍 UPLOAD: Total de clientes após merge:`, newClientes.length)
                
                // Salvar no store local
                store.upsertMany({ clientes: newClientes })
                totalImported += clientesData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const cliente of clientesData) {
                    await api.post('/clientes', {
                      nome: cliente.nome,
                      grupoEconomico: cliente.grupoEconomico
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${clientesData.length} clientes salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar clientes no banco:`, apiError)
                  errors.push(`Erro ao salvar clientes no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${clientesData.length} clientes importados`)
                
                // Verificar estado após upsert
                setTimeout(() => {
                  console.log(`🔍 UPLOAD: Estado do store após upsert:`, store.clientes.length)
                  console.log(`🔍 UPLOAD: Clientes no store:`, store.clientes)
                }, 100)
              } else {
                console.log(`⚠️ UPLOAD: Nenhum cliente válido encontrado`)
              }
              break
              
            case 'operadoras':
            case 'produtos':
            case 'sistemas':
            case 'analistas':
            case 'areas':
              const simpleData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (simpleData.length > 0) {
                const storeKey = sheetName.toLowerCase() as keyof typeof store
                if (storeKey in store) {
                  // Salvar no store local
                  store.upsertMany({ [storeKey]: [...(store[storeKey] as any[]), ...simpleData] })
                  totalImported += simpleData.length
                  
                  // Salvar no banco de dados via API
                  try {
                    const endpoint = `/${storeKey}`
                    for (const item of simpleData) {
                      await api.post(endpoint, {
                        nome: item.nome
                      })
                      totalSavedToDatabase++
                    }
                    console.log(`✅ UPLOAD: ${simpleData.length} ${sheetName} salvos no banco de dados`)
                  } catch (apiError) {
                    console.error(`❌ UPLOAD: Erro ao salvar ${sheetName} no banco:`, apiError)
                    errors.push(`Erro ao salvar ${sheetName} no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                  }
                  
                  console.log(`🔍 UPLOAD: ${simpleData.length} ${sheetName} importados`)
                }
              }
              break
              
            case 'areasmailling':
              const areasMaillingData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (areasMaillingData.length > 0) {
                // Salvar no store local
                store.upsertMany({ areasMailling: [...store.areasMailling, ...areasMaillingData] })
                totalImported += areasMaillingData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of areasMaillingData) {
                    await api.post('/areas-mailling', {
                      nome: item.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${areasMaillingData.length} areas mailling salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar areas mailling no banco:`, apiError)
                  errors.push(`Erro ao salvar areas mailling no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${areasMaillingData.length} areas mailling importados`)
              }
              break
              
            case 'cargosmailling':
              const cargosMaillingData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (cargosMaillingData.length > 0) {
                // Salvar no store local
                store.upsertMany({ cargosMailling: [...store.cargosMailling, ...cargosMaillingData] })
                totalImported += cargosMaillingData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of cargosMaillingData) {
                    await api.post('/cargos-mailling', {
                      nome: item.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${cargosMaillingData.length} cargos mailling salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar cargos mailling no banco:`, apiError)
                  errors.push(`Erro ao salvar cargos mailling no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${cargosMaillingData.length} cargos mailling importados`)
              }
              break
              
            case 'filiaismailling':
              const filiaisMaillingData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (filiaisMaillingData.length > 0) {
                // Salvar no store local
                store.upsertMany({ filiaisMailling: [...store.filiaisMailling, ...filiaisMaillingData] })
                totalImported += filiaisMaillingData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of filiaisMaillingData) {
                    await api.post('/filiais-mailling', {
                      nome: item.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${filiaisMaillingData.length} filiais mailling salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar filiais mailling no banco:`, apiError)
                  errors.push(`Erro ao salvar filiais mailling no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${filiaisMaillingData.length} filiais mailling importados`)
              }
              break
              
            case 'tipos':
              console.log(`🔍 UPLOAD: Processando tipos - Headers:`, headers)
              console.log(`🔍 UPLOAD: Processando tipos - Primeiras 3 linhas:`, rows.slice(0, 3))
              
              const tiposData = rows.map((row, rowIndex) => {
                const tipo: any = { id: crypto.randomUUID() }
                console.log(`🔍 UPLOAD: Processando linha ${rowIndex + 1}:`, row)
                
                headers.forEach((header, index) => {
                  const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  const value = row[index]
                  console.log(`🔍 UPLOAD: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
                  
                  if (cleanHeader === 'id' && value) {
                    tipo.id = value
                  } else if (cleanHeader === 'nome') {
                    tipo.nome = value
                  }
                })
                
                console.log(`🔍 UPLOAD: Tipo processado:`, tipo)
                return tipo
              }).filter(t => {
                const isValid = t.nome
                console.log(`🔍 UPLOAD: Tipo ${t.id} válido? ${isValid} (nome: "${t.nome}")`)
                return isValid
              })
              
              console.log(`🔍 UPLOAD: Tipos válidos encontrados:`, tiposData.length)
              console.log(`🔍 UPLOAD: Estado atual do store antes do upsert:`, store.tiposDemanda.length)
              
              if (tiposData.length > 0) {
                const newTipos = [...store.tiposDemanda, ...tiposData]
                console.log(`🔍 UPLOAD: Novos tipos a serem adicionados:`, tiposData)
                console.log(`🔍 UPLOAD: Total de tipos após merge:`, newTipos.length)
                
                // Salvar no store local
                store.upsertMany({ tiposDemanda: newTipos })
                totalImported += tiposData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const tipo of tiposData) {
                    await api.post('/tiposDemanda', {
                      nome: tipo.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${tiposData.length} tipos salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar tipos no banco:`, apiError)
                  errors.push(`Erro ao salvar tipos no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${tiposData.length} tipos importados`)
                
                // Forçar sincronização para garantir persistência
                setTimeout(async () => {
                  console.log(`🔍 UPLOAD: Forçando sincronização após upload...`)
                  if (store.syncFromApi) {
                    await store.syncFromApi()
                    console.log(`✅ UPLOAD: Sincronização forçada concluída`)
                  }
                }, 500)
              } else {
                console.log(`⚠️ UPLOAD: Nenhum tipo válido encontrado`)
              }
              break
              
            case 'tiposcadastro':
              console.log(`🔍 UPLOAD: Processando tipos cadastro - Headers:`, headers)
              console.log(`🔍 UPLOAD: Processando tipos cadastro - Primeiras 3 linhas:`, rows.slice(0, 3))
              
              const tiposCadastroData = rows.map((row, rowIndex) => {
                const tipoCadastro: any = { id: crypto.randomUUID() }
                console.log(`🔍 UPLOAD: Processando linha ${rowIndex + 1}:`, row)
                
                headers.forEach((header, index) => {
                  const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  const value = row[index]
                  console.log(`🔍 UPLOAD: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
                  
                  if (cleanHeader === 'id' && value) {
                    tipoCadastro.id = value
                  } else if (cleanHeader === 'nome') {
                    tipoCadastro.nome = value
                  } else if (cleanHeader === 'descricao') {
                    tipoCadastro.descricao = value
                  }
                })
                
                console.log(`🔍 UPLOAD: Tipo cadastro processado:`, tipoCadastro)
                return tipoCadastro
              }).filter(t => {
                const isValid = t.nome
                console.log(`🔍 UPLOAD: Tipo cadastro ${t.id} válido? ${isValid} (nome: "${t.nome}", descricao: "${t.descricao}")`)
                return isValid
              })
              
              console.log(`🔍 UPLOAD: Tipos cadastro válidos encontrados:`, tiposCadastroData.length)
              console.log(`🔍 UPLOAD: Estado atual do store antes do upsert:`, store.tiposCadastro.length)
              
              if (tiposCadastroData.length > 0) {
                const newTiposCadastro = [...store.tiposCadastro, ...tiposCadastroData]
                console.log(`🔍 UPLOAD: Novos tipos cadastro a serem adicionados:`, tiposCadastroData)
                console.log(`🔍 UPLOAD: Total de tipos cadastro após merge:`, newTiposCadastro.length)
                
                // Salvar no store local
                store.upsertMany({ tiposCadastro: newTiposCadastro })
                totalImported += tiposCadastroData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const tipoCadastro of tiposCadastroData) {
                    await api.post('/tiposCadastro', {
                      nome: tipoCadastro.nome,
                      descricao: tipoCadastro.descricao
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${tiposCadastroData.length} tipos cadastro salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar tipos cadastro no banco:`, apiError)
                  errors.push(`Erro ao salvar tipos cadastro no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${tiposCadastroData.length} tipos cadastro importados`)
                
                // Forçar sincronização para garantir persistência
                setTimeout(async () => {
                  console.log(`🔍 UPLOAD: Forçando sincronização após upload...`)
                  if (store.syncFromApi) {
                    await store.syncFromApi()
                    console.log(`✅ UPLOAD: Sincronização forçada concluída`)
                  }
                }, 500)
              } else {
                console.log(`⚠️ UPLOAD: Nenhum tipo cadastro válido encontrado`)
              }
              break
              
            case 'servicos':
              const servicosData = rows.map(row => {
                const servico: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    servico.id = row[index]
                  } else if (header === 'nome') {
                    servico.nome = row[index]
                  }
                })
                return servico
              }).filter(s => s.nome)
              
              if (servicosData.length > 0) {
                // Salvar no store local
                store.upsertMany({ tiposServico: [...store.tiposServico, ...servicosData] })
                totalImported += servicosData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const servico of servicosData) {
                    await api.post('/tiposServico', {
                      nome: servico.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${servicosData.length} serviços salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar serviços no banco:`, apiError)
                  errors.push(`Erro ao salvar serviços no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${servicosData.length} serviços importados`)
              }
              break
              
            case 'padrao':
              console.log(`🔍 UPLOAD: Processando padrao - Headers:`, headers)
              console.log(`🔍 UPLOAD: Processando padrao - Primeiras 3 linhas:`, rows.slice(0, 3))
              
              const padraoData = rows.map((row, rowIndex) => {
                const padrao: any = { id: crypto.randomUUID() }
                console.log(`🔍 UPLOAD: Processando linha ${rowIndex + 1}:`, row)
                
                headers.forEach((header, index) => {
                  const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  const value = row[index]
                  console.log(`🔍 UPLOAD: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
                  
                  if (cleanHeader === 'id' && value) {
                    padrao.id = value
                  } else if (cleanHeader === 'nome') {
                    padrao.nome = value
                  }
                })
                
                console.log(`🔍 UPLOAD: Padrao processado:`, padrao)
                return padrao
              }).filter(p => {
                const isValid = p.nome
                console.log(`🔍 UPLOAD: Padrao ${p.id} válido? ${isValid} (nome: "${p.nome}")`)
                return isValid
              })
              
              console.log(`🔍 UPLOAD: Padroes válidos encontrados:`, padraoData.length)
              console.log(`🔍 UPLOAD: Estado atual do store antes do upsert:`, store.padrao.length)
              
              if (padraoData.length > 0) {
                const newPadrao = [...store.padrao, ...padraoData]
                console.log(`🔍 UPLOAD: Novos padrões a serem adicionados:`, padraoData)
                console.log(`🔍 UPLOAD: Total de padrões após merge:`, newPadrao.length)
                
                // Salvar no store local
                store.upsertMany({ padrao: newPadrao })
                totalImported += padraoData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const padrao of padraoData) {
                    await api.post('/padrao', {
                      nome: padrao.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${padraoData.length} padrões salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar padrões no banco:`, apiError)
                  errors.push(`Erro ao salvar padrões no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${padraoData.length} padrões importados`)
                
                // Verificar estado após upsert
                setTimeout(() => {
                  console.log(`🔍 UPLOAD: Estado do store após upsert:`, store.padrao.length)
                  console.log(`🔍 UPLOAD: Padrões no store:`, store.padrao)
                }, 100)
              } else {
                console.log(`⚠️ UPLOAD: Nenhum padrão válido encontrado`)
              }
              break
              
            case 'configuracoes':
              const configData = rows.map(row => {
                const config: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    config.id = row[index]
                  } else if (header === 'chave') {
                    config.chave = row[index]
                  } else if (header === 'valor') {
                    config.valor = row[index]
                  } else if (header === 'tipo') {
                    config.tipo = row[index]
                  } else if (header === 'categoria') {
                    config.categoria = row[index]
                  } else if (header === 'descricao') {
                    config.descricao = row[index]
                  }
                })
                return config
              }).filter(c => c.chave && c.valor)
              
              if (configData.length > 0) {
                // Salvar no store local
                configData.forEach(config => {
                  dadosStore.add(config)
                })
                totalImported += configData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const config of configData) {
                    await api.post('/dados', {
                      chave: config.chave,
                      valor: config.valor,
                      tipo: config.tipo,
                      categoria: config.categoria,
                      descricao: config.descricao,
                      ativo: config.ativo
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${configData.length} configurações salvas no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar configurações no banco:`, apiError)
                  errors.push(`Erro ao salvar configurações no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${configData.length} configurações importadas`)
              }
              break
              
            case 'solicitantes':
              const solicitantesData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (solicitantesData.length > 0) {
                // Salvar no store local
                store.upsertMany({ solicitantes: [...store.solicitantes, ...solicitantesData] })
                totalImported += solicitantesData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of solicitantesData) {
                    await api.post('/solicitantes', {
                      nome: item.nome
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${solicitantesData.length} solicitantes salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar solicitantes no banco:`, apiError)
                  errors.push(`Erro ao salvar solicitantes no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${solicitantesData.length} solicitantes importados`)
              }
              break
              
            case 'relatorios':
              const relatoriosData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  } else if (header === 'descricao') {
                    item.descricao = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (relatoriosData.length > 0) {
                // Salvar no store local
                store.upsertMany({ relatorios: [...store.relatorios, ...relatoriosData] })
                totalImported += relatoriosData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of relatoriosData) {
                    await api.post('/relatorios', {
                      nome: item.nome,
                      descricao: item.descricao || ''
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${relatoriosData.length} relatórios salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar relatórios no banco:`, apiError)
                  errors.push(`Erro ao salvar relatórios no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${relatoriosData.length} relatórios importados`)
              }
              break
              
            case 'modelos':
              const modelosData = rows.map(row => {
                const item: any = { id: crypto.randomUUID() }
                headers.forEach((header, index) => {
                  if (header === 'id' && row[index]) {
                    item.id = row[index]
                  } else if (header === 'nome') {
                    item.nome = row[index]
                  } else if (header === 'descricao') {
                    item.descricao = row[index]
                  }
                })
                return item
              }).filter(item => item.nome)
              
              if (modelosData.length > 0) {
                // Salvar no store local
                store.upsertMany({ modelos: [...store.modelos, ...modelosData] })
                totalImported += modelosData.length
                
                // Salvar no banco de dados via API
                try {
                  for (const item of modelosData) {
                    await api.post('/modelos', {
                      nome: item.nome,
                      descricao: item.descricao || ''
                    })
                    totalSavedToDatabase++
                  }
                  console.log(`✅ UPLOAD: ${modelosData.length} modelos salvos no banco de dados`)
                } catch (apiError) {
                  console.error(`❌ UPLOAD: Erro ao salvar modelos no banco:`, apiError)
                  errors.push(`Erro ao salvar modelos no banco: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
                }
                
                console.log(`🔍 UPLOAD: ${modelosData.length} modelos importados`)
              }
              break
          }
          
        } catch (sheetError) {
          console.error(`❌ UPLOAD: Erro ao processar aba ${sheetName}:`, sheetError)
          errors.push(`Erro na aba ${sheetName}: ${sheetError instanceof Error ? sheetError.message : 'Erro desconhecido'}`)
        }
      }
      
      // Mostrar resultado
      if (totalImported > 0) {
        const successMessage = totalSavedToDatabase > 0 
          ? `Upload concluído! ${totalImported} registros importados e ${totalSavedToDatabase} salvos no banco de dados.`
          : `Upload concluído! ${totalImported} registros importados localmente.`
        
        setSnack({
          open: true,
          message: successMessage,
          severity: totalSavedToDatabase > 0 ? 'success' : 'warning'
        })
        
        if (errors.length > 0) {
          console.warn('⚠️ UPLOAD: Alguns erros ocorreram:', errors)
          setSnack({
            open: true,
            message: `${successMessage} ${errors.length} erros ocorreram ao salvar no banco.`,
            severity: 'warning'
          })
        }
        
        console.log(`✅ UPLOAD: Processamento concluído. Total importado: ${totalImported}, Total salvo no banco: ${totalSavedToDatabase}`)
      } else {
        setSnack({
          open: true,
          message: 'Nenhum dado foi importado. Verifique o formato do arquivo.',
          severity: 'warning'
        })
      }
      
    } catch (error) {
      console.error('❌ UPLOAD: Erro geral:', error)
      setSnack({
        open: true,
        message: `Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error'
      })
      throw error // Re-throw para o modal mostrar o erro
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
        <DadosHeader
          activeTab={activeTab}
          onUpload={() => setUploadModalOpen(true)}
          onSmartImport={() => setSmartImporterOpen(true)}
          onBulkDelete={() => setBulkDeleteModalOpen(true)}
          onHelp={() => setOpenHelp(true)}
          onAdd={handleAdd}
          onExportAll={handleExportAll}
          onExportCurrent={handleExportCurrent}
          // onCleanup removido - função de limpeza de duplicatas removida
        />


      <Typography variant="body2" sx={{ mb: 2 }}>
        Para importar, utilize o modelo com abas: Clientes, Contratos, Operadoras, Produtos, Sistemas, Analistas, Areas, Areas Mailling, Cargos Mailling, Filiais Mailling, Tipos, Servicos, Solicitantes, Relatorios, Modelos. As colunas devem seguir exatamente os nomes do modelo. Em "Tipos", preencha "tipoServicoId" com CAD (Cadastro) ou MAN (Manutenção).
      </Typography>

      {/* Status de sincronização */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          ✅ Sincronizado
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Dados locais: {store.clientes.length} clientes, {store.contratos.length} contratos, {store.operadoras.length} operadoras, {store.solicitantes.length} solicitantes, {store.relatorios.length} relatórios, {store.modelos.length} modelos
          {store.clientes.length > 0 || store.contratos.length > 0 ? ' - Dados persistidos localmente' : ' - Nenhum dado local'}
        </Typography>
        
      </Box>

      <DadosTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <DadosGrid
        activeTab={activeTab}
        data={currentData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DadosForm
        open={openForm}
        onClose={handleFormClose}
        activeTab={activeTab}
        editingItem={form}
        onSuccess={handleFormClose}
      />

      <DadosHelpModal
        open={openHelp}
        onClose={() => setOpenHelp(false)}
      />

      <SnackNotification snack={snack} />

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload de Dados Mestres"
        entityType="dados"
        onUpload={handleUpload}
      />

      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs[activeTab] || smartImporterConfigs.clientes}
        masterData={store}
      />

      <BulkDeleteModal
        open={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onBulkDelete={handleBulkDelete}
        masterData={store}
      />

      {/* CleanupModal removido - modal de limpeza de duplicatas removido */}
    </Paper>
  )
}


