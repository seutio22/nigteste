import { useState, useCallback } from 'react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDadosStore } from '../store/dadosStore'
import { getApi } from '../lib/apiConfig'
import { ENTITY_CONFIGS } from '../config/entityConfigs'
import type { TabKey, FormData, SnackMessage } from '../types/dadosTypes'
import type { Cliente, Contrato, Operadora, Produto, Sistema, Analista, Area, TipoDemanda, TipoServico, Solicitante, Relatorio, Modelo } from '../types/masterData'

export const useDadosCRUD = () => {
  const store = useMasterDataStore()
  const dadosStore = useDadosStore()
  const [snack, setSnack] = useState<SnackMessage | null>(null)

  const validateForm = useCallback((activeTab: TabKey, form: FormData): boolean => {
    const config = ENTITY_CONFIGS[activeTab]
    
    if (!config) {
      console.error('❌ Config não encontrada para:', activeTab)
      setSnack({
        open: true,
        message: `Configuração não encontrada para ${activeTab}`,
        severity: 'error'
      })
      return false
    }
    
    const missingFields = config.requiredFields.filter(field => !form[field as keyof FormData])
    
    if (missingFields.length > 0) {
      setSnack({
        open: true,
        message: `Campos obrigatórios: ${missingFields.join(', ')}`,
        severity: 'error'
      })
      return false
    }
    return true
  }, [])

  const createEntity = useCallback(async (activeTab: TabKey, form: FormData): Promise<boolean> => {
    try {
      console.log('🔍 CRIAÇÃO MANUAL: Iniciando processo de salvamento')
      console.log('🔍 CRIAÇÃO MANUAL: Aba ativa:', activeTab)
      console.log('🔍 CRIAÇÃO MANUAL: Dados do formulário:', form)
      
      const config = ENTITY_CONFIGS[activeTab]
      console.log('🔍 CRIAÇÃO MANUAL: Config encontrada:', config)
      
      const id = crypto.randomUUID()
      console.log('🔍 CRIAÇÃO MANUAL: ID gerado:', id)
      
      const api = getApi()
      console.log('🔍 CRIAÇÃO MANUAL: API obtida:', !!api)
      
      console.log('🔍 CRIAÇÃO MANUAL: Endpoint da API:', config.endpoint)
      console.log('🔍 CRIAÇÃO MANUAL: Campos obrigatórios:', config.requiredFields)
      
      let newEntity: any
      
      switch (activeTab) {
        case 'clientes':
          console.log('🔍 CLIENTE CREATE: Dados do formulário:', form)
          console.log('🔍 CLIENTE CREATE: Clientes no store:', store.clientes.length)
          
          // Validar se o grupo econômico já existe (apenas se for preenchido)
          if (form.grupoEconomico && form.grupoEconomico.trim() !== '') {
            const existingClient = store.clientes.find(c => 
              c.grupoEconomico && 
              c.grupoEconomico.trim() !== '' &&
              c.grupoEconomico.toLowerCase().trim() === form.grupoEconomico.toLowerCase().trim()
            )
            console.log('🔍 CLIENTE CREATE: Cliente existente com mesmo grupo:', existingClient)
            if (existingClient) {
              setSnack({
                message: `Grupo econômico "${form.grupoEconomico}" já existe para o cliente "${existingClient.nome}". Por favor, escolha um grupo econômico único.`,
                severity: 'error'
              })
              throw new Error(`Grupo econômico "${form.grupoEconomico}" já existe para o cliente "${existingClient.nome}". Por favor, escolha um grupo econômico único.`)
            }
          }
          
          newEntity = { id, nome: form.nome, grupoEconomico: form.grupoEconomico || '' } as Cliente
          console.log('🔍 CLIENTE CREATE: Nova entidade:', newEntity)
          
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Cliente salvo no banco de dados:', newEntity.id)
          
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ clientes: [...store.clientes, newEntity] })
          console.log('✅ Cliente salvo no store local')
          break
          
        case 'contratos':
          // Para contratos, precisamos de um cliente padrão se não especificado
          const clienteDefault = store.clientes[0]?.id || 'cliente-001' // Cliente padrão do seed
          
          console.log('🔍 CONTRATO: Clientes disponíveis:', store.clientes.map(c => ({ id: c.id, nome: c.nome })))
          console.log('🔍 CONTRATO: Cliente padrão selecionado:', clienteDefault)
          
          const contratoData = {
            numero: form.codigo || `CONT-${Date.now()}`, // Usar codigo como numero ou gerar um
            codigo: form.codigo, 
            grupoEconomico: form.grupoEconomico,
            clienteId: form.clienteId || clienteDefault, // Usar cliente especificado ou padrão
            status: form.status !== undefined && form.status !== null && form.status !== '' ? form.status : 'Ativo' // Respeitar status escolhido pelo usuário
          }
          
          console.log('🔍 CONTRATO: Form status recebido:', form.status, 'Tipo:', typeof form.status)
          console.log('🔍 CONTRATO: Status final calculado:', contratoData.status)
          console.log('🔍 CONTRATO: Dados que serão enviados para API:', contratoData)
          
          newEntity = { id, ...contratoData } as Contrato
          
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, contratoData)
          console.log('✅ Contrato salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ contratos: [...store.contratos, newEntity] })
          break
          
        case 'operadoras':
        case 'produtos':
        case 'sistemas':
        case 'grupos':
        case 'areas':
          // Payload para a API (sem id, pois o Prisma gera automaticamente)
          const apiPayload: any = { 
            nome: form.nome
          }
          
          // Entidade completa para o store local (com id)
          newEntity = { 
            id, 
            nome: form.nome
          }
          
          const storeKey = activeTab as keyof typeof store
          if (storeKey in store) {
            // PRIMEIRO: Salvar na API (banco de dados)
            const savedEntity = await api.post(config.endpoint, apiPayload)
            console.log(`✅ ${activeTab} salvo no banco de dados:`, savedEntity.id)
            // DEPOIS: Salvar no store local (cache) usando o retorno da API
            store.upsertMany({ [storeKey]: [...(store[storeKey] as any[]), savedEntity] })
          }
          break
        case 'analistas':
          // Payload específico para analistas - apenas nome
          const analistaPayload: any = { 
            nome: form.nome
          }
          
          // Entidade completa para o store local (com id)
          newEntity = { 
            id, 
            nome: form.nome
          }
          
          const analistaStoreKey = activeTab as keyof typeof store
          if (analistaStoreKey in store) {
            // PRIMEIRO: Salvar na API (banco de dados)
            const savedEntity = await api.post(config.endpoint, analistaPayload)
            console.log(`✅ ${activeTab} salvo no banco de dados:`, savedEntity.id)
            // DEPOIS: Salvar no store local (cache) usando o retorno da API
            store.upsertMany({ [analistaStoreKey]: [...(store[analistaStoreKey] as any[]), savedEntity] })
          }
          break
        case 'areasMailling':
        case 'cargosMailling':
        case 'filiaisMailling':
          // Payload para a API (sem id, pois o Prisma gera automaticamente)
          const maillingPayload: any = { 
            nome: form.nome, 
            ativo: form.ativo !== undefined ? form.ativo : true
          }
          
          // Só incluir descricao se não estiver vazia
          if (form.descricao && form.descricao.trim() !== '') {
            maillingPayload.descricao = form.descricao
          }
          
          console.log('🔍 DEBUG MAILLING:')
          console.log('  - Form completo:', form)
          console.log('  - form.descricao:', form.descricao)
          console.log('  - API Payload final:', maillingPayload)
          
          // Entidade completa para o store local (com id)
          newEntity = { 
            id, 
            nome: form.nome, 
            descricao: form.descricao || null,
            ativo: form.ativo !== undefined ? form.ativo : true
          }
          
          const maillingStoreKey = activeTab as keyof typeof store
          if (maillingStoreKey in store) {
            // PRIMEIRO: Salvar na API (banco de dados)
            const savedEntity = await api.post(config.endpoint, maillingPayload)
            console.log(`✅ ${activeTab} salvo no banco de dados:`, savedEntity.id)
            // DEPOIS: Salvar no store local (cache) usando o retorno da API
            store.upsertMany({ [maillingStoreKey]: [...(store[maillingStoreKey] as any[]), savedEntity] })
          }
          break
          
        case 'tipos':
          // Payload para a API (apenas nome, conforme configuração)
          const tipoPayload: any = { 
            nome: form.nome
          }
          
          // Entidade completa para o store local (com id)
          newEntity = { 
            id, 
            nome: form.nome
          }
          
          // PRIMEIRO: Salvar na API (banco de dados)
          const savedTipo = await api.post(config.endpoint, tipoPayload)
          console.log('✅ Tipo salvo no banco de dados:', savedTipo.id)
          // DEPOIS: Salvar no store local (cache) usando o retorno da API
          store.upsertMany({ tiposDemanda: [...store.tiposDemanda, savedTipo] })
          break
          
        case 'tipos-cadastro':
          newEntity = { id, nome: form.nome, descricao: form.descricao } as any
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, { nome: form.nome, descricao: form.descricao })
          console.log('✅ TipoCadastro salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ tiposCadastro: [...store.tiposCadastro, newEntity] })
          break
          
        case 'servicos':
          newEntity = { id, nome: form.nome, descricao: form.descricao } as TipoServico
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Serviço salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ tiposServico: [...store.tiposServico, newEntity] })
          break
          
        case 'solicitantes':
          // Validar se já existe solicitante com mesmo nome
          const existingSolicitante = store.solicitantes.find(s => 
            s.nome.toLowerCase().trim() === form.nome?.toLowerCase().trim()
          )
          if (existingSolicitante) {
            setSnack({
              open: true,
              message: `Solicitante "${form.nome}" já existe. Por favor, escolha um nome diferente.`,
              severity: 'error'
            })
            throw new Error(`Solicitante "${form.nome}" já existe. Por favor, escolha um nome diferente.`)
          }
          
          newEntity = { id, nome: form.nome } as Solicitante
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Solicitante salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ solicitantes: [...store.solicitantes, newEntity] })
          break
          
        case 'relatorios':
          newEntity = { id, nome: form.nome } as Relatorio
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Relatório salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ relatorios: [...store.relatorios, newEntity] })
          break
          
        case 'modelos':
          newEntity = { id, nome: form.nome } as Modelo
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Modelo salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ modelos: [...store.modelos, newEntity] })
          break
          
        case 'padrao':
          const tipoServicoNomePadrao = form.tipoServicoId ? 
            (store.tiposServico.find(ts => ts.id === form.tipoServicoId)?.nome || form.tipoServicoId) : 
            null
          newEntity = { id, nome: form.nome, tipoServicoId: tipoServicoNomePadrao }
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, { 
            nome: form.nome, 
            tipoServicoId: form.tipoServicoId || null 
          })
          console.log('✅ Padrão salvo no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          store.upsertMany({ padrao: [...store.padrao, newEntity] })
          break
          
        case 'configuracoes':
          newEntity = {
            id,
            chave: form.chave,
            valor: form.valor,
            tipo: form.tipo || 'configuracao',
            categoria: form.categoria || 'sistema',
            ativo: form.ativo ?? true,
            descricao: form.descricao,
            dataInicio: new Date().toISOString()
          }
          // PRIMEIRO: Salvar na API (banco de dados)
          await api.post(config.endpoint, newEntity)
          console.log('✅ Configuração salva no banco de dados:', newEntity.id)
          // DEPOIS: Salvar no store local (cache)
          dadosStore.add(newEntity)
          break
      }
      
      setSnack({
        open: true,
        message: `${config.displayName} criado com sucesso!`,
        severity: 'success'
      })
      
      return true
    } catch (error) {
      console.error('❌ Erro ao criar entidade:', error)
      console.error('❌ Detalhes do erro:', {
        activeTab,
        form,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorStack: error instanceof Error ? error.stack : undefined
      })
      
      // Se o erro foi na API, o dado não foi salvo no banco
      // Não salvar no store local para evitar inconsistências
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('❌ ERRO FINAL:', errorMessage)
      
      // Re-lançar o erro para que seja capturado pelo componente
      throw new Error(errorMessage)
    }
  }, [store, dadosStore])

  const updateEntity = useCallback(async (activeTab: TabKey, form: FormData): Promise<boolean> => {
    try {
      const config = ENTITY_CONFIGS[activeTab]
      const id = form.id!
      const api = getApi()
      
      switch (activeTab) {
        case 'clientes':
          // Validar se o grupo econômico já existe (excluindo o próprio cliente)
          if (form.grupoEconomico && form.grupoEconomico.trim()) {
            const existingClient = store.clientes.find(c => 
              c.id !== id && 
              c.grupoEconomico && 
              c.grupoEconomico.toLowerCase().trim() === form.grupoEconomico.toLowerCase().trim()
            )
            if (existingClient) {
              throw new Error(`Grupo econômico "${form.grupoEconomico}" já existe para o cliente "${existingClient.nome}". Por favor, escolha um grupo econômico único.`)
            }
          }
          
          const updatedCliente = { id, nome: form.nome, grupoEconomico: form.grupoEconomico } as Cliente
          store.upsertMany({
            clientes: store.clientes.map(c => c.id === id ? updatedCliente : c)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome, grupoEconomico: form.grupoEconomico })
          break
          
        case 'contratos':
          const contratoExistente = store.contratos.find(c => c.id === id)
          const updatedContrato = { 
            id, 
            codigo: form.codigo, 
            grupoEconomico: form.grupoEconomico,
            numero: contratoExistente?.numero || form.codigo || `CONT-${Date.now()}`,
            clienteId: form.clienteId || contratoExistente?.clienteId || store.clientes[0]?.id || 'cliente-001',
            status: form.status !== undefined && form.status !== null && form.status !== '' ? form.status : (contratoExistente?.status || 'Ativo')
          } as Contrato
          store.upsertMany({
            contratos: store.contratos.map(c => c.id === id ? updatedContrato : c)
          })
          await api.put(`${config.endpoint}/${id}`, { 
            codigo: form.codigo, 
            grupoEconomico: form.grupoEconomico,
            numero: updatedContrato.numero,
            clienteId: updatedContrato.clienteId,
            status: updatedContrato.status
          })
          break
          
        case 'operadoras':
        case 'produtos':
        case 'sistemas':
        case 'grupos':
        case 'analistas':
        case 'areas':
        case 'areasMailling':
        case 'cargosMailling':
        case 'filiaisMailling':
          // Payload para a API (sem id)
          const updateApiPayload = { 
            nome: form.nome, 
            descricao: form.descricao || null,
            ativo: form.ativo !== undefined ? form.ativo : true
          }
          
          // Entidade completa para o store local (com id)
          const updatedEntity = { 
            id, 
            nome: form.nome, 
            descricao: form.descricao || null,
            ativo: form.ativo !== undefined ? form.ativo : true
          }
          
          const updateStoreKey = activeTab as keyof typeof store
          if (updateStoreKey in store) {
            // PRIMEIRO: Atualizar na API
            const savedEntity = await api.put(`${config.endpoint}/${id}`, updateApiPayload)
            // DEPOIS: Atualizar no store local usando o retorno da API
            store.upsertMany({
              [updateStoreKey]: (store[updateStoreKey] as any[]).map(item => item.id === id ? savedEntity : item)
            })
          }
          break
          
        case 'tipos':
          const updatedTipo = { id, nome: form.nome } as TipoDemanda
          store.upsertMany({
            tiposDemanda: store.tiposDemanda.map(t => t.id === id ? updatedTipo : t)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome })
          break
          
        case 'tipos-cadastro':
          const updatedTipoCadastro = { id, nome: form.nome, descricao: form.descricao } as any
          store.upsertMany({
            tiposCadastro: store.tiposCadastro.map(t => t.id === id ? updatedTipoCadastro : t)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome, descricao: form.descricao })
          break
          
        case 'servicos':
          const updatedServico = { id, nome: form.nome, descricao: form.descricao } as TipoServico
          store.upsertMany({
            tiposServico: store.tiposServico.map(s => s.id === id ? updatedServico : s)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome, descricao: form.descricao })
          break
          
        case 'solicitantes':
          // Validar se já existe outro solicitante com mesmo nome (excluindo o próprio)
          const duplicateSolicitante = store.solicitantes.find(s => 
            s.id !== id && 
            s.nome.toLowerCase().trim() === form.nome?.toLowerCase().trim()
          )
          if (duplicateSolicitante) {
            throw new Error(`Solicitante "${form.nome}" já existe. Por favor, escolha um nome diferente.`)
          }
          
          const updatedSolicitante = { id, nome: form.nome } as Solicitante
          store.upsertMany({
            solicitantes: store.solicitantes.map(s => s.id === id ? updatedSolicitante : s)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome })
          break
          
        case 'relatorios':
          const updatedRelatorio = { id, nome: form.nome } as Relatorio
          store.upsertMany({
            relatorios: store.relatorios.map(r => r.id === id ? updatedRelatorio : r)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome })
          break
          
        case 'modelos':
          const updatedModelo = { id, nome: form.nome } as Modelo
          store.upsertMany({
            modelos: store.modelos.map(m => m.id === id ? updatedModelo : m)
          })
          await api.put(`${config.endpoint}/${id}`, { nome: form.nome })
          break
          
        case 'padrao':
          const tipoServicoNomePadrao = form.tipoServicoId ? 
            (store.tiposServico.find(ts => ts.id === form.tipoServicoId)?.nome || form.tipoServicoId) : 
            null
          const updatedPadrao = { id, nome: form.nome, tipoServicoId: tipoServicoNomePadrao }
          store.upsertMany({
            padrao: store.padrao.map(d => d.id === id ? updatedPadrao : d)
          })
          await api.put(`${config.endpoint}/${id}`, { 
            nome: form.nome, 
            tipoServicoId: form.tipoServicoId || null 
          })
          break
          
        case 'configuracoes':
          const updatedConfig = {
            chave: form.chave,
            valor: form.valor,
            tipo: form.tipo || 'configuracao',
            categoria: form.categoria || 'sistema',
            ativo: form.ativo ?? true
          }
          dadosStore.update(id, updatedConfig)
          await api.put(`${config.endpoint}/${id}`, updatedConfig)
          break
      }
      
      setSnack({
        open: true,
        message: `${config.displayName} atualizado com sucesso!`,
        severity: 'success'
      })
      
      return true
    } catch (error) {
      console.error('❌ Erro ao atualizar entidade:', error)
      setSnack({
        open: true,
        message: `Erro ao atualizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error'
      })
      return false
    }
  }, [store, dadosStore])

  const deleteEntity = useCallback(async (activeTab: TabKey, id: string): Promise<boolean> => {
    try {
      const config = ENTITY_CONFIGS[activeTab]
      
      // Função auxiliar para remover do store local
      const removeFromStore = (itemId: string) => {
        console.log(`🔍 removeFromStore: Removendo ${itemId} de ${activeTab}`)
        console.log(`🔍 removeFromStore: Estado antes:`, {
          areas: store.areas.length,
          areasIds: store.areas.map(a => a.id)
        })
        
        switch (activeTab) {
          case 'clientes':
            store.upsertMany({ clientes: store.clientes.filter(c => c.id !== itemId) })
            break
          case 'contratos':
            store.upsertMany({ contratos: store.contratos.filter(c => c.id !== itemId) })
            break
          case 'operadoras':
            store.upsertMany({ operadoras: store.operadoras.filter(o => o.id !== itemId) })
            break
          case 'produtos':
            store.upsertMany({ produtos: store.produtos.filter(p => p.id !== itemId) })
            break
          case 'sistemas':
            store.upsertMany({ sistemas: store.sistemas.filter(s => s.id !== itemId) })
            break
          case 'grupos':
            store.upsertMany({ grupos: store.grupos.filter(g => g.id !== itemId) })
            break
          case 'analistas':
            store.upsertMany({ analistas: store.analistas.filter(a => a.id !== itemId) })
            break
          case 'areas':
            const filteredAreas = store.areas.filter(a => a.id !== itemId)
            console.log(`🔍 removeFromStore: Áreas filtradas: ${filteredAreas.length} (era ${store.areas.length})`)
            store.upsertMany({ areas: filteredAreas })
            break
          case 'areasMailling':
            store.upsertMany({ areasMailling: store.areasMailling.filter(a => a.id !== itemId) })
            break
          case 'cargosMailling':
            store.upsertMany({ cargosMailling: store.cargosMailling.filter(c => c.id !== itemId) })
            break
          case 'filiaisMailling':
            store.upsertMany({ filiaisMailling: store.filiaisMailling.filter(f => f.id !== itemId) })
            break
          case 'tipos':
            store.upsertMany({ tiposDemanda: store.tiposDemanda.filter(t => t.id !== itemId) })
            break
          case 'tipos-cadastro':
            store.upsertMany({ tiposCadastro: store.tiposCadastro.filter(t => t.id !== itemId) })
            break
          case 'servicos':
            store.upsertMany({ tiposServico: store.tiposServico.filter(t => t.id !== itemId) })
            break
          case 'solicitantes':
            store.upsertMany({ solicitantes: store.solicitantes.filter(s => s.id !== itemId) })
            break
          case 'relatorios':
            store.upsertMany({ relatorios: store.relatorios.filter(r => r.id !== itemId) })
            break
          case 'modelos':
            store.upsertMany({ modelos: store.modelos.filter(m => m.id !== itemId) })
            break
          case 'padrao':
            store.upsertMany({ padrao: store.padrao.filter(d => d.id !== itemId) })
            break
          case 'configuracoes':
            dadosStore.remove(id)
            break
        }
      }
      
      // Tentar excluir do backend primeiro
      try {
        const api = getApi()
        await api.delete(`${config.endpoint}/${id}`)
        console.log(`✅ Registro ${id} excluído do backend com sucesso`)
      } catch (apiError) {
        console.log(`⚠️ Erro ao excluir do backend:`, apiError)
        
        // Verificar se é erro de dependências (não pode excluir)
        if (apiError instanceof Error && apiError.message.includes('registros dependentes')) {
          console.log(`⚠️ Registro ${id} não pode ser excluído - possui dependências`)
          
          setSnack({
            open: true,
            message: `${config.displayName} não pode ser excluído pois possui registros dependentes. Remova as dependências primeiro.`,
            severity: 'warning'
          })
          return false
        }
        
        
        // Verificar se é erro de registro não encontrado (500 ou 404)
        if (apiError instanceof Error && (
          apiError.message.includes('500') || 
          apiError.message.includes('não foi encontrado') ||
          apiError.message.includes('404')
        )) {
          console.log(`ℹ️ Registro ${id} não existe no backend, removendo do cache local`)
          // Remover do store local mesmo se não existir no backend
          removeFromStore(id)
          
          setSnack({
            open: true,
            message: `${config.displayName} removido do cache local (não existia no servidor)`,
            severity: 'info'
          })
          return true
        } else {
          // Re-lançar o erro se não for de "não encontrado"
          throw apiError
        }
      }
      
      // Se chegou até aqui, a exclusão foi bem-sucedida no backend
      // Remover do store local
      removeFromStore(id)
      
      setSnack({
        open: true,
        message: `${config.displayName} excluído com sucesso!`,
        severity: 'success'
      })
      
      return true
    } catch (error) {
      console.error('❌ Erro ao excluir entidade:', error)
      
      setSnack({
        open: true,
        message: `Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error'
      })
      return false
    }
  }, [store, dadosStore])

  const saveEntity = useCallback(async (activeTab: TabKey, form: FormData): Promise<boolean> => {
    if (!validateForm(activeTab, form)) {
      return false
    }
    
    const isEditing = !!form.id
    return isEditing ? await updateEntity(activeTab, form) : await createEntity(activeTab, form)
  }, [validateForm, createEntity, updateEntity])

  return {
    snack,
    setSnack,
    saveEntity,
    deleteEntity,
    validateForm
  }
}