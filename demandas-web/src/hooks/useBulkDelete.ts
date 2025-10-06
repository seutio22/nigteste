import { useState } from 'react'
import { useMasterDataStore } from '../store/masterDataStore'

interface BulkDeleteResult {
  success: boolean
  deletedCount: number
  errors: string[]
  archivedRecords: any[]
}

export const useBulkDelete = () => {
  const [isDeleting, setIsDeleting] = useState(false)
  const store = useMasterDataStore()

  const bulkDelete = async (column: string, records: any[]): Promise<BulkDeleteResult> => {
    setIsDeleting(true)
    
    try {
      const result: BulkDeleteResult = {
        success: true,
        deletedCount: 0,
        errors: [],
        archivedRecords: []
      }

      // Simular exclusão e arquivamento
      for (const record of records) {
        try {
          // Aqui você implementaria a lógica real de exclusão
          // Por enquanto, vamos simular o processo
          
          // 1. Buscar o registro original para arquivamento
          const originalRecord = findOriginalRecord(column, record)
          if (originalRecord) {
            // 2. Adicionar metadados de arquivamento
            const archivedRecord = {
              ...originalRecord,
              archivedAt: new Date().toISOString(),
              archivedBy: 'current-user', // Aqui você pegaria o usuário logado
              archiveReason: 'Bulk delete',
              originalTable: column,
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 3 meses
            }
            
            result.archivedRecords.push(archivedRecord)
          }

          // 3. Remover do store local (simulação)
          removeFromStore(column, record)
          
          result.deletedCount++
          
        } catch (error) {
          result.errors.push(`Erro ao excluir registro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      // 4. Aqui você faria a chamada para a API para:
      // - Excluir os registros das tabelas originais
      // - Salvar os registros arquivados na tabela de arquivo
      // - Registrar a operação de exclusão em massa

      console.log('🗑️ BULK DELETE: Exclusão em massa concluída', {
        column,
        deletedCount: result.deletedCount,
        archivedCount: result.archivedRecords.length,
        errors: result.errors.length
      })

      return result

    } catch (error) {
      console.error('❌ BULK DELETE: Erro geral:', error)
      return {
        success: false,
        deletedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        archivedRecords: []
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const findOriginalRecord = (column: string, record: any) => {
    const existingRecords = getExistingRecords(column)
    
    return existingRecords.find(existing => {
      if (column === 'clientes') {
        return existing.nome === record.nome && existing.grupoEconomico === record.grupoEconomico
      } else if (column === 'contratos') {
        return existing.codigo === record.codigo && existing.grupoEconomico === record.grupoEconomico && existing.status === record.status
      } else if (column === 'operadoras' || column === 'produtos' || column === 'sistemas' || column === 'areas' || column === 'solicitantes') {
        return existing.nome === record.nome
      } else if (column === 'analistas') {
        return existing.nome === record.nome && existing.email === record.email
      } else if (column === 'tipos' || column === 'servicos' || column === 'relatorios' || column === 'modelos' || column === 'padrao') {
        return existing.nome === record.nome
      } else if (column === 'tipos-cadastro') {
        return existing.nome === record.nome
      }
      return false
    })
  }

  const getExistingRecords = (column: string) => {
    switch (column) {
      case 'clientes': return store.clientes || []
      case 'contratos': return store.contratos || []
      case 'operadoras': return store.operadoras || []
      case 'produtos': return store.produtos || []
      case 'sistemas': return store.sistemas || []
      case 'analistas': return store.analistas || []
      case 'areas': return store.areas || []
      case 'tipos': return store.tiposDemanda || []
      case 'tipos-cadastro': return store.tiposCadastro || []
      case 'servicos': return store.tiposServico || []
      case 'solicitantes': return store.solicitantes || []
      case 'relatorios': return store.relatorios || []
      case 'modelos': return store.modelos || []
      case 'padrao': return store.padrao || []
      default: return []
    }
  }

  const removeFromStore = (column: string, record: any) => {
    // Simulação de remoção do store
    // Na implementação real, você chamaria os métodos apropriados do store
    console.log(`🗑️ Removendo registro da coluna ${column}:`, record)
    
    // Exemplo de como seria a remoção real:
    // switch (column) {
    //   case 'clientes':
    //     store.removeClientes(record)
    //     break
    //   case 'contratos':
    //     store.removeContratos(record)
    //     break
    //   // ... outros casos
    // }
  }

  return {
    bulkDelete,
    isDeleting
  }
}
