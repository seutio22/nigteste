import React, { useCallback, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import type { ButtonProps } from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'
import type { CotacaoFormState } from './CotacaoFormFields'
import { PlacementKickOffApresentacaoUnified } from './PlacementKickOffApresentacaoUnified'
import { captureElementFullAsPngDataUri } from './placementSlideCapture'
import { exportKickOffApresentacaoPdf } from './placementKickOffApresentacaoPdf'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  ticket: string
  disabled?: boolean
  label?: string
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
  startIcon?: React.ReactNode
}

const PDF_CAPTURE_MIN_WIDTH = 1100

export function PlacementKickOffApresentacaoPdfButton({
  cotacaoId,
  form,
  ticket,
  disabled,
  label = 'Apresentação',
  size = 'small',
  variant = 'outlined',
  startIcon = <ViewAgendaIcon />,
}: Props) {
  const captureRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleExportPdf = useCallback(async () => {
    const root = captureRef.current
    if (!root) return
    setGenerating(true)
    setErrorMsg(null)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise((r) => setTimeout(r, 800))
      const captureWidth = Math.max(root.scrollWidth, PDF_CAPTURE_MIN_WIDTH)
      const captured = await captureElementFullAsPngDataUri(root, captureWidth)
      await exportKickOffApresentacaoPdf({
        ticket,
        unified: {
          imageDataUri: captured.dataUri,
          imageWidth: captured.width,
          imageHeight: captured.height,
        },
      })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.')
    } finally {
      setGenerating(false)
    }
  }, [ticket])

  return (
    <>
      <Button
        size={size}
        variant={variant}
        startIcon={startIcon}
        disabled={disabled}
        onClick={() => {
          setErrorMsg(null)
          setOpen(true)
        }}
      >
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => !generating && setOpen(false)}
        fullWidth
        maxWidth={false}
        scroll="paper"
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: '96vw' },
            maxWidth: { xs: '100vw', sm: '96vw' },
            height: { xs: '100vh', sm: '92vh' },
            maxHeight: { xs: '100vh', sm: '92vh' },
            m: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, py: 1.5 }}>Apresentação — Análise da base</DialogTitle>
        <DialogContent
          dividers
          sx={{
            bgcolor: 'grey.50',
            p: { xs: 1.5, md: 2.5 },
            flex: 1,
            overflow: 'auto',
          }}
        >
          {errorMsg ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          ) : null}
          <PlacementKickOffApresentacaoUnified
            ref={captureRef}
            cotacaoId={cotacaoId}
            ticket={ticket}
            form={form}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={generating}>
            Fechar
          </Button>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
            disabled={generating}
            onClick={() => void handleExportPdf()}
          >
            {generating ? 'Gerando PDF…' : 'Baixar PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
