import { useCallback, useEffect, useRef } from 'react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDadosStore } from '../store/dadosStore'

export const useDadosSync = () => {
  const store = useMasterDataStore()
  const dadosStore = useDadosStore()
  const hasInitialized = useRef(false)

  const syncData = useCallback(async () => {
    try {
      console.log('🔍 Dados: Iniciando sincronização...')
      
      // Sincronizar dados mestres
      if (store.syncFromApi) {
        await store.syncFromApi()
        console.log('🔍 Dados: Dados mestres sincronizados')
      }
      
      // Sincronizar dados de configuração
      await dadosStore.syncFromApi()
      console.log('🔍 Dados: Dados de configuração sincronizados')
      
      // Log dos dados após sincronização
      setTimeout(() => {
        console.log('🔍 Dados: Estado após sincronização:', {
          clientes: store.clientes.length,
          contratos: store.contratos.length,
          operadoras: store.operadoras.length,
          produtos: store.produtos.length,
          sistemas: store.sistemas.length,
          analistas: store.analistas.length,
          areas: store.areas.length,
          tiposDemanda: store.tiposDemanda.length,
          tiposServico: store.tiposServico.length,
          solicitantes: store.solicitantes.length,
          relatorios: store.relatorios.length,
          modelos: store.modelos.length,
          padrao: store.padrao.length,
          configuracoes: dadosStore.items.length
        })
      }, 1000)
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error)
    }
  }, []) // Remover dependências para evitar recriação

  const forceSync = useCallback(async () => {
    try {
      console.log('🔍 Dados: Forçando sincronização completa...')
      
      // Limpar dados locais primeiro
      store.clearAll()
      
      // Sincronizar do zero
      await syncData()
      
      console.log('✅ Dados: Sincronização forçada concluída')
      
    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error)
    }
  }, [store, syncData])

  // Sincronização automática ao montar o componente (APENAS UMA VEZ)
  useEffect(() => {
    if (hasInitialized.current) {
      console.log('🔍 Dados: Hook já inicializado, pulando...')
      return
    }

    hasInitialized.current = true
    
    // Só sincronizar se não houver dados locais
    const hasLocalData = store.clientes.length > 0 || 
                        store.contratos.length > 0 || 
                        store.operadoras.length > 0 ||
                        store.produtos.length > 0 ||
                        store.sistemas.length > 0 ||
                        store.analistas.length > 0 ||
                        store.areas.length > 0 ||
                        store.tiposDemanda.length > 0 ||
                        store.tiposServico.length > 0 ||
                        store.solicitantes.length > 0 ||
                        store.relatorios.length > 0 ||
                        store.modelos.length > 0 ||
                        store.padrao.length > 0
    
    if (!hasLocalData) {
      console.log('🔍 Dados: Nenhum dado local encontrado, sincronizando...')
      syncData()
    } else {
      console.log('🔍 Dados: Dados locais encontrados, pulando sincronização automática')
      console.log('🔍 Dados: Dados locais:', {
        clientes: store.clientes.length,
        contratos: store.contratos.length,
        operadoras: store.operadoras.length,
        produtos: store.produtos.length,
        sistemas: store.sistemas.length,
        analistas: store.analistas.length,
        areas: store.areas.length,
        tiposDemanda: store.tiposDemanda.length,
        tiposServico: store.tiposServico.length,
        solicitantes: store.solicitantes.length,
        relatorios: store.relatorios.length,
        modelos: store.modelos.length,
        padrao: store.padrao.length
      })
    }
  }, []) // Executar apenas uma vez ao montar

  return {
    syncData,
    forceSync,
    isSyncing: store.isSyncing,
    lastSync: store.lastSync
  }
}
