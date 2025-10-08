import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'

export const useDeadlineNotifications = () => {
  const { add: addNotification } = useNotificationStore()
  const { user } = useAuthStore()

  const checkDeadlineNotifications = useCallback(async () => {
    // TEMPORARIAMENTE DESABILITADO - causando logout automático
    // TODO: Corrigir autenticação do endpoint /notifications/scheduled
    console.log('🔔 Verificação de notificações temporariamente desabilitada')
    return
    
    // Não verificar notificações se o usuário não estiver logado
    if (!user) {
      console.log('🔔 Usuário não logado, pulando verificação de notificações')
      return
    }
    
    try {
      console.log('🔔 Verificando notificações de vencimento...')
      
      const api = getApi()
      const response = await api.get('/notifications/scheduled')
      
      if (response.notifications && response.notifications.length > 0) {
        console.log(`🔔 ${response.notifications.length} notificações de vencimento encontradas`)
        
        // Adicionar cada notificação ao store
        response.notifications.forEach((notification: any) => {
          // Verificar se a notificação já foi exibida hoje
          const today = new Date().toDateString()
          const notificationKey = `deadline-${notification.dados.kanbanTicketId}-${today}`
          
          if (!localStorage.getItem(notificationKey)) {
            addNotification({
              titulo: notification.titulo,
              mensagem: notification.mensagem,
              tipo: notification.tipo,
              prioridade: notification.prioridade,
              dados: notification.dados
            })
            
            // Marcar como exibida hoje
            localStorage.setItem(notificationKey, 'true')
            
            console.log('🔔 Notificação de vencimento adicionada:', notification.titulo)
          }
        })
      } else {
        console.log('🔔 Nenhuma notificação de vencimento encontrada')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar notificações de vencimento:', error)
    }
  }, [addNotification, user])

  useEffect(() => {
    // Verificar imediatamente ao carregar
    checkDeadlineNotifications()
    
    // Verificar a cada hora
    const interval = setInterval(checkDeadlineNotifications, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [checkDeadlineNotifications])

  return {
    checkDeadlineNotifications
  }
}
