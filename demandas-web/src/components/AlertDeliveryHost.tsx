import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, Dialog, IconButton, Slide, Typography } from '@mui/material'
import type { TransitionProps } from '@mui/material/transitions'
import { Bell, X } from 'lucide-react'
import { useNotificationStore } from '../store/notificationStore'
import {
  ALERT_DELIVERY_EVENT,
  ALERT_DELIVERY_PREF_EVENT,
  getAlertDeliveryMode,
  getAlertRepeatIntervalMs,
  getAlertWindowDurationMs,
  notificationsAreEnabled,
  pickUnreadAlertForReminder,
  playAlertSound,
  stripAlertHtml,
  type AlertDeliveryMode,
  type AlertReceivedDetail,
} from '../lib/alertDeliveryPrefs'

const Transition = React.forwardRef(function AlertSlide(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} timeout={280} />
})

function priorityMeta(prioridade?: string) {
  const p = String(prioridade || 'media').toLowerCase()
  if (p === 'urgente') return { label: 'Urgente', color: '#DA3832', bg: 'rgba(218,56,50,0.12)' }
  if (p === 'alta') return { label: 'Alta', color: '#C2410C', bg: 'rgba(234,88,12,0.12)' }
  if (p === 'baixa') return { label: 'Baixa', color: '#00A649', bg: 'rgba(0,166,73,0.12)' }
  return { label: 'Média', color: '#009FDF', bg: 'rgba(0,159,223,0.14)' }
}

export function AlertDeliveryHost() {
  const [mode, setMode] = useState<AlertDeliveryMode>(() => getAlertDeliveryMode())
  const [durationMs, setDurationMs] = useState(() => getAlertWindowDurationMs())
  const [repeatMs, setRepeatMs] = useState(() => getAlertRepeatIntervalMs())
  const [alert, setAlert] = useState<AlertReceivedDetail | null>(null)
  const alertRef = useRef<AlertReceivedDetail | null>(null)
  alertRef.current = alert

  useEffect(() => {
    const onPref = () => {
      setMode(getAlertDeliveryMode())
      setDurationMs(getAlertWindowDurationMs())
      setRepeatMs(getAlertRepeatIntervalMs())
    }
    window.addEventListener(ALERT_DELIVERY_PREF_EVENT, onPref)
    return () => window.removeEventListener(ALERT_DELIVERY_PREF_EVENT, onPref)
  }, [])

  const deliver = useCallback(
    (detail: AlertReceivedDetail) => {
      if (!notificationsAreEnabled()) return
      if (!detail?.titulo) return
      if (mode === 'som' || mode === 'som_e_tela') playAlertSound()
      if (mode === 'tela_cheia' || mode === 'som_e_tela') setAlert(detail)
    },
    [mode]
  )

  const onAlert = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent<AlertReceivedDetail>).detail
      if (!detail) return
      deliver(detail)
    },
    [deliver]
  )

  useEffect(() => {
    window.addEventListener(ALERT_DELIVERY_EVENT, onAlert)
    return () => window.removeEventListener(ALERT_DELIVERY_EVENT, onAlert)
  }, [onAlert])

  useEffect(() => {
    if (!alert) return
    if (durationMs <= 0) return
    const t = window.setTimeout(() => setAlert(null), durationMs)
    return () => window.clearTimeout(t)
  }, [alert, durationMs])

  useEffect(() => {
    if (mode === 'padrao' || repeatMs <= 0) return
    const tick = () => {
      if (!notificationsAreEnabled()) return
      if (typeof document !== 'undefined' && document.hidden) return
      if (alertRef.current) return
      const unread = useNotificationStore
        .getState()
        .notifications.filter((n) => !n.snoozedUntil || new Date(n.snoozedUntil) <= new Date())
      const next = pickUnreadAlertForReminder(unread)
      if (!next) return
      deliver(next)
    }
    const id = window.setInterval(tick, repeatMs)
    return () => window.clearInterval(id)
  }, [mode, repeatMs, deliver])

  const close = () => setAlert(null)
  const body = alert ? stripAlertHtml(alert.mensagem) : ''
  const meta = priorityMeta(alert?.prioridade)

  return (
    <Dialog
      open={Boolean(alert)}
      onClose={close}
      maxWidth={false}
      TransitionComponent={Transition}
      BackdropProps={{
        sx: {
          bgcolor: 'rgba(5, 0, 50, 0.52)',
          backdropFilter: 'blur(6px)',
        },
      }}
      PaperProps={{
        sx: {
          width: 'min(440px, calc(100vw - 32px))',
          m: 2,
          borderRadius: '28px',
          overflow: 'hidden',
          bgcolor: '#fff',
          backgroundImage: 'none',
          boxShadow: '0 8px 24px rgba(0, 37, 97, 0.08), 0 32px 80px rgba(5, 0, 50, 0.28)',
          p: 0,
        },
      }}
    >
      {alert && (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              height: 6,
              background: 'linear-gradient(90deg, #002561 0%, #009FDF 55%, #00A649 100%)',
            }}
          />

          <IconButton
            onClick={close}
            aria-label="Fechar aviso"
            sx={{
              position: 'absolute',
              top: 18,
              right: 14,
              color: 'rgba(255,255,255,0.72)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <X size={18} />
          </IconButton>

          <Box
            sx={{
              px: 3.5,
              pt: 3,
              pb: 3.25,
              background: 'linear-gradient(165deg, #050032 0%, #002561 58%, #004F75 100%)',
              color: '#fff',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.25, pr: 4 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '14px',
                  bgcolor: 'rgba(0,159,223,0.22)',
                  border: '1px solid rgba(0,159,223,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} color="#7DD3F0" strokeWidth={2.2} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.2,
                  }}
                >
                  Nexus · Alerta
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', mt: 0.25 }}>
                  Chegou agora
                </Typography>
              </Box>
            </Box>

            <Typography
              component="h1"
              sx={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: { xs: 22, sm: 24 },
                lineHeight: 1.28,
                letterSpacing: '-0.02em',
                pr: 1,
              }}
            >
              {alert.titulo}
            </Typography>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                mt: 2,
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                bgcolor: meta.bg,
                color: meta.color,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.4,
              }}
            >
              Prioridade {meta.label}
            </Box>
          </Box>

          <Box sx={{ px: 3.5, pt: 2.75, pb: 1.5, bgcolor: '#F5F7FA' }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: '#6b7a80',
                mb: 1.25,
              }}
            >
              Mensagem
            </Typography>
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid #DCDFE3',
                px: 2.25,
                py: 2,
                minHeight: 88,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography
                sx={{
                  color: '#050032',
                  fontSize: 15,
                  lineHeight: 1.65,
                  fontWeight: 400,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {body || 'Há uma nova notificação no sino. Abra a lista para ver o detalhe.'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ px: 3.5, pt: 1.5, pb: 2.75, bgcolor: '#F5F7FA' }}>
            <Button
              fullWidth
              variant="contained"
              onClick={close}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 15,
                py: 1.35,
                borderRadius: '14px',
                bgcolor: '#002561',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#001a42', boxShadow: 'none' },
              }}
            >
              Entendi
            </Button>
            <Typography
              sx={{
                mt: 1.25,
                textAlign: 'center',
                fontSize: 12,
                color: '#6b7a80',
                lineHeight: 1.4,
              }}
            >
              O alerta permanece no sino até você marcar como lido.
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  )
}
