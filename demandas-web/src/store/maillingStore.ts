import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MaillingContact, MaillingFilter, ChangeLogEntry } from '../types/mailling'
import { useAuthStore } from './authStore'
import { useMasterDataStore } from './masterDataStore'
import * as XLSX from 'xlsx'

interface MaillingState {
  contacts: MaillingContact[]
  add: (contact: Omit<MaillingContact, 'id' | 'createdAt' | 'updatedAt' | 'changeLog'>) => Promise<void>
  update: (id: string, updates: Partial<MaillingContact>) => void
  remove: (id: string) => void
  removeMultiple: (ids: string[]) => void
  getFiltered: (filters: MaillingFilter) => MaillingContact[]
  exportToExcel: () => void
  exportEmailsToExcel: (contacts: MaillingContact[]) => void
  getEmailsFormatted: (contacts: MaillingContact[]) => string
  importFromExcel: (emails: string[], filters: Partial<MaillingFilter>) => void
  addChangeLog: (contactId: string, entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => void
  syncFromApi: () => Promise<void>
}

export const useMaillingStore = create<MaillingState>()(
  persist(
    (set, get) => ({
      contacts: [],
      
      add: async (contact: Omit<MaillingContact, 'id' | 'createdAt' | 'updatedAt' | 'changeLog'>) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        try {
          // Preparar dados para a API (usando o modelo do Prisma)
          const apiData = {
            nome: contact.nome,
            email: contact.email,
            telefone: contact.superior || '',
            empresa: contact.area || '',
            cargo: contact.cargo || '',
            departamento: contact.filial || '',
            categoria: 'Geral',
            status: 'Ativo',
            origem: 'Sistema'
          }
          
          // Chamar a API para salvar no banco
          const { api } = await import('../lib/api')
          const savedContact = await api.post('/mailling', apiData)
          
          // Criar contato local com dados da API
          const newContact: MaillingContact = {
            id: savedContact.id,
            email: contact.email,
            nome: contact.nome,
            cargo: contact.cargo,
            area: contact.area,
            filial: contact.filial,
            superior: contact.superior,
            posicaoEmail: contact.posicaoEmail,
            grupos: contact.grupos || [],
            cancelamento: contact.cancelamento || 'nao',
            alteracaoContratual: contact.alteracaoContratual || 'nao',
            alteracaoDadosCliente: contact.alteracaoDadosCliente || 'nao',
            alteracaoServicos: contact.alteracaoServicos || 'nao',
            alteracaoRemuneracao: contact.alteracaoRemuneracao || 'nao',
            curadoriaPortalRh: contact.curadoriaPortalRh || 'nao',
            documentacaoContratual: contact.documentacaoContratual || 'nao',
            createdAt: savedContact.createdAt || new Date().toISOString(),
            updatedAt: savedContact.updatedAt || new Date().toISOString(),
            changeLog: [{
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              field: 'criação',
              oldValue: '',
              newValue: 'Contato criado',
              changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
              description: 'Contato criado no sistema'
            }]
          }
          
          set((state) => {
            const updatedContacts = [...state.contacts, newContact]
            
            // Salvar no localStorage
            localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
            
            return { contacts: updatedContacts }
          })
          
          console.log('✅ Contato de mailling salvo no banco de dados:', savedContact.id)
          
        } catch (error) {
          console.error('❌ Erro ao salvar contato de mailling no banco:', error)
          
          // Em caso de erro, salvar apenas localmente
          const newContact: MaillingContact = {
            id: crypto.randomUUID(),
            email: contact.email,
            nome: contact.nome,
            cargo: contact.cargo,
            area: contact.area,
            filial: contact.filial,
            superior: contact.superior,
            posicaoEmail: contact.posicaoEmail,
            grupos: contact.grupos || [],
            cancelamento: contact.cancelamento || 'nao',
            alteracaoContratual: contact.alteracaoContratual || 'nao',
            alteracaoDadosCliente: contact.alteracaoDadosCliente || 'nao',
            alteracaoServicos: contact.alteracaoServicos || 'nao',
            alteracaoRemuneracao: contact.alteracaoRemuneracao || 'nao',
            curadoriaPortalRh: contact.curadoriaPortalRh || 'nao',
            documentacaoContratual: contact.documentacaoContratual || 'nao',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            changeLog: [{
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              field: 'criação',
              oldValue: '',
              newValue: 'Contato criado (erro na API)',
              changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
              description: 'Contato criado no sistema (salvo apenas localmente)'
            }]
          }
          
          set((state) => {
            const updatedContacts = [...state.contacts, newContact]
            
            // Salvar no localStorage
            localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
            
            return { contacts: updatedContacts }
          })
        }
      },
      
      update: (id, updates) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        set((state) => {
          const updatedContacts = state.contacts.map(contact => {
            if (contact.id === id) {
              // Criar log de alterações para campos modificados
              const changeLog: ChangeLogEntry[] = []
              const oldContact = { ...contact }
              
              Object.entries(updates).forEach(([key, newValue]) => {
                if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'changeLog') {
                  const oldValue = oldContact[key as keyof MaillingContact]
                  if (oldValue !== newValue) {
                    changeLog.push({
                      id: crypto.randomUUID(),
                      timestamp: new Date().toISOString(),
                      field: key,
                      oldValue: String(oldValue || ''),
                      newValue: String(newValue || ''),
                      changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
                      description: `Campo "${key}" alterado de "${oldValue || 'vazio'}" para "${newValue || 'vazio'}"`
                    })
                  }
                }
              })
              
              return { 
                ...contact, 
                ...updates, 
                changeLog: [...(contact.changeLog || []), ...changeLog],
                updatedAt: new Date().toISOString() 
              }
            }
            return contact
          })
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
          
          return { contacts: updatedContacts }
        })
      },
      
      remove: (id) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        // Antes de remover, vamos salvar o log da exclusão
        const contactToRemove = get().contacts.find(c => c.id === id)
        if (contactToRemove) {
          const deletionLog: ChangeLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: 'exclusão',
            oldValue: 'Contato ativo',
            newValue: 'Contato removido',
            changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
            description: 'Contato removido do sistema'
          }
          
          // Aqui poderíamos salvar o log de exclusão em um arquivo ou banco separado
          console.log('Log de exclusão:', deletionLog)
        }
        
        set((state) => {
          const updatedContacts = state.contacts.filter(contact => contact.id !== id)
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
          
          return { contacts: updatedContacts }
        })
      },
      
      removeMultiple: (ids) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        // Antes de remover, vamos salvar o log das exclusões
        const contactsToRemove = get().contacts.filter(c => ids.includes(c.id))
        contactsToRemove.forEach(contact => {
          const deletionLog: ChangeLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: 'exclusão em lote',
            oldValue: 'Contato ativo',
            newValue: 'Contato removido',
            changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
            description: 'Contato removido em exclusão em lote'
          }
          
          // Aqui poderíamos salvar o log de exclusão em um arquivo ou banco separado
          console.log('Log de exclusão em lote:', deletionLog)
        })
        
        set((state) => {
          const updatedContacts = state.contacts.filter(contact => !ids.includes(contact.id))
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
          
          return { contacts: updatedContacts }
        })
      },
      
      getFiltered: (filters) => {
        const { contacts } = get()
        return contacts.filter(contact => {
          for (const [key, value] of Object.entries(filters)) {
            if (value && contact[key as keyof MaillingContact] !== value) {
              return false
            }
          }
          return true
        })
      },
      
      importFromExcel: (emails: string[], filters: Partial<MaillingFilter>) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        const newContacts: MaillingContact[] = emails.map(email => ({
          id: crypto.randomUUID(),
          email,
          nome: filters.nome || '',
          cargo: filters.cargo || '',
          area: filters.area || '',
          filial: filters.filial || '',
          superior: filters.superior || '',
          posicaoEmail: filters.posicaoEmail || 'PARA',
          grupos: filters.grupos || [],
          cancelamento: filters.cancelamento || 'nao',
          alteracaoContratual: filters.alteracaoContratual || 'nao',
          alteracaoDadosCliente: filters.alteracaoDadosCliente || 'nao',
          alteracaoServicos: filters.alteracaoServicos || 'nao',
          alteracaoRemuneracao: filters.alteracaoRemuneracao || 'nao',
          curadoriaPortalRh: filters.curadoriaPortalRh || 'nao',
          documentacaoContratual: filters.documentacaoContratual || 'nao',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          changeLog: [{
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: 'importação',
            oldValue: '',
            newValue: 'Contato importado via Excel',
            changedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado',
            description: 'Contato importado via Excel'
          }]
        }))
        
        set((state) => {
          const updatedContacts = [...state.contacts, ...newContacts]
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
          
          return { contacts: updatedContacts }
        })
      },
      
      exportToExcel: () => {
        const { contacts } = get()
        
        // Importar masterDataStore para buscar nomes legíveis
        const masterDataStore = useMasterDataStore.getState()
        
        // Preparar dados para exportação com nomes legíveis
        const exportData = contacts.map(contact => {
          // Buscar nomes legíveis para área, cargo e filial
          const areaNome = contact.area ? 
            masterDataStore.areasMailling?.find(a => a.id === contact.area)?.nome || contact.area : 
            ''
          
          const cargoNome = contact.cargo ? 
            masterDataStore.cargosMailling?.find(c => c.id === contact.cargo)?.nome || contact.cargo : 
            ''
          
          const filialNome = contact.filial ? 
            masterDataStore.filiaisMailling?.find(f => f.id === contact.filial)?.nome || contact.filial : 
            ''
          
          return {
            'Nome': contact.nome || '',
            'E-mail': contact.email,
            'Cargo': cargoNome,
            'Área': areaNome,
            'Filial': filialNome,
            'Superior': contact.superior || '',
            'Posição E-mail': contact.posicaoEmail || '',
            'Informativos': contact.informativos || '',
            'Cancelamento': contact.cancelamento || '',
            'Alteração Contratual': contact.alteracaoContratual || '',
            'Alteração Dados Cliente': contact.alteracaoDadosCliente || '',
            'Alteração Serviços': contact.alteracaoServicos || '',
            'Aniversário Clientes': contact.aniversarioClientes || '',
            'Alteração Remuneração': contact.alteracaoRemuneracao || '',
            'DEXPARA': contact.dexpara || '',
            'Curadoria Portal RH': contact.curadoriaPortalRh || '',
            'Documentação Contratual': contact.documentacaoContratual || '',
            'Criado em': new Date(contact.createdAt).toLocaleDateString('pt-BR'),
            'Atualizado em': new Date(contact.updatedAt).toLocaleDateString('pt-BR')
          }
        })
        
        // Criar workbook e worksheet
        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Contatos Mailling')
        
        // Ajustar larguras das colunas
        const colWidths = [
          { wch: 20 }, // Nome
          { wch: 30 }, // E-mail
          { wch: 15 }, // Cargo
          { wch: 15 }, // Área
          { wch: 15 }, // Filial
          { wch: 15 }, // Superior
          { wch: 15 }, // Posição E-mail
          { wch: 12 }, // Informativos
          { wch: 12 }, // Cancelamento
          { wch: 18 }, // Alteração Contratual
          { wch: 20 }, // Alteração Dados Cliente
          { wch: 18 }, // Alteração Serviços
          { wch: 18 }, // Aniversário Clientes
          { wch: 18 }, // Alteração Remuneração
          { wch: 12 }, // DEXPARA
          { wch: 18 }, // Curadoria Portal RH
          { wch: 22 }, // Documentação Contratual
          { wch: 12 }, // Criado em
          { wch: 12 }  // Atualizado em
        ]
        ws['!cols'] = colWidths
        
        // Exportar arquivo
        XLSX.writeFile(wb, `mailling-contatos-${new Date().toISOString().split('T')[0]}.xlsx`)
      },

      exportEmailsToExcel: (contacts: MaillingContact[]) => {
        // Importar masterDataStore para buscar nomes legíveis
        const masterDataStore = useMasterDataStore.getState()
        
        // Preparar dados apenas com e-mails e informações básicas com nomes legíveis
        const exportData = contacts.map(contact => {
          // Buscar nomes legíveis para área, cargo e filial
          const areaNome = contact.area ? 
            masterDataStore.areasMailling?.find(a => a.id === contact.area)?.nome || contact.area : 
            ''
          
          const cargoNome = contact.cargo ? 
            masterDataStore.cargosMailling?.find(c => c.id === contact.cargo)?.nome || contact.cargo : 
            ''
          
          const filialNome = contact.filial ? 
            masterDataStore.filiaisMailling?.find(f => f.id === contact.filial)?.nome || contact.filial : 
            ''
          
          return {
            'Nome': contact.nome || '',
            'E-mail': contact.email,
            'Cargo': cargoNome,
            'Área': areaNome,
            'Filial': filialNome,
            'Superior': contact.superior || '',
            'Posição E-mail': contact.posicaoEmail || ''
          }
        })
        
        // Criar workbook e worksheet
        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'E-mails Mailling')
        
        // Ajustar larguras das colunas
        const colWidths = [
          { wch: 20 }, // Nome
          { wch: 30 }, // E-mail
          { wch: 15 }, // Cargo
          { wch: 15 }, // Área
          { wch: 15 }, // Filial
          { wch: 15 }, // Superior
          { wch: 15 }  // Posição E-mail
        ]
        ws['!cols'] = colWidths
        
        // Exportar arquivo
        XLSX.writeFile(wb, `mailling-emails-${new Date().toISOString().split('T')[0]}.xlsx`)
      },

      getEmailsFormatted: (contacts: MaillingContact[]) => {
        // Agrupar e-mails por posição
        const emailsByPosition = {
          'PARA': [] as string[],
          'CÓPIA OCULTA': [] as string[],
          'CÓPIA': [] as string[]
        }
        
        // Separar e-mails por posição
        contacts.forEach(contact => {
          const position = contact.posicaoEmail || 'PARA'
          if (emailsByPosition[position as keyof typeof emailsByPosition]) {
            emailsByPosition[position as keyof typeof emailsByPosition].push(contact.email)
          }
        })
        
        // Formatar saída com seções
        let formatted = ''
        
        if (emailsByPosition['PARA'].length > 0) {
          formatted += `PARA:\n${emailsByPosition['PARA'].join('; ')}\n\n`
        }
        
        if (emailsByPosition['CÓPIA OCULTA'].length > 0) {
          formatted += `CÓPIA OCULTA:\n${emailsByPosition['CÓPIA OCULTA'].join('; ')}\n\n`
        }
        
        if (emailsByPosition['CÓPIA'].length > 0) {
          formatted += `CÓPIA:\n${emailsByPosition['CÓPIA'].join('; ')}\n\n`
        }
        
        // Remover quebras de linha extras no final
        return formatted.trim()
      },

      addChangeLog: (contactId, entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => {
        const authStore = useAuthStore.getState()
        const currentUser = authStore.user
        
        set((state) => {
          const updatedContacts = state.contacts.map(contact => {
            if (contact.id === contactId) {
              const changeLogEntry: ChangeLogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                ...entry,
                changedBy: entry.changedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Usuário não identificado'),
                description: entry.description || `Campo "${entry.field}" alterado de "${entry.oldValue}" para "${entry.newValue}"`
              }
              
              return {
                ...contact,
                changeLog: [...(contact.changeLog || []), changeLogEntry],
                updatedAt: new Date().toISOString()
              }
            }
            return contact
          })
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(updatedContacts))
          
          return { contacts: updatedContacts }
        })
      },

      syncFromApi: async () => {
        try {
          console.log('🔄 MaillingStore: Iniciando syncFromApi...')
          
          // Chamar a API para buscar contatos
          const { api } = await import('../lib/api')
          const apiContacts = await api.get('/mailling')
          
          console.log('📊 MaillingStore: Dados recebidos da API:', apiContacts.length, 'itens')
          
          // Converter dados da API para o formato do frontend
          const convertedContacts: MaillingContact[] = apiContacts.map((apiContact: any) => ({
            id: apiContact.id,
            nome: apiContact.nome,
            email: apiContact.email,
            cargo: apiContact.cargo || '',
            area: apiContact.empresa || '',
            filial: apiContact.departamento || '',
            superior: apiContact.telefone || '',
            posicaoEmail: 'PARA',
            informativos: 'nao',
            cancelamento: 'nao',
            alteracaoContratual: 'nao',
            alteracaoDadosCliente: 'nao',
            alteracaoServicos: 'nao',
            aniversarioClientes: 'nao',
            alteracaoRemuneracao: 'nao',
            dexpara: 'nao',
            curadoriaPortalRh: 'nao',
            documentacaoContratual: 'nao',
            createdAt: apiContact.createdAt || new Date().toISOString(),
            updatedAt: apiContact.updatedAt || new Date().toISOString(),
            changeLog: [{
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              field: 'sincronização',
              oldValue: '',
              newValue: 'Dados sincronizados da API',
              changedBy: 'Sistema',
              description: 'Contato carregado do banco de dados'
            }]
          }))
          
          // Atualizar o store
          set({ contacts: convertedContacts })
          
          // Salvar no localStorage
          localStorage.setItem('mailling-v1', JSON.stringify(convertedContacts))
          
          console.log('✅ MaillingStore: syncFromApi concluído com sucesso!')
          
        } catch (error) {
          console.error('❌ MaillingStore: Erro ao sincronizar com API:', error)
        }
      }
    }),
    { name: 'mailling-v1' }
  )
)


