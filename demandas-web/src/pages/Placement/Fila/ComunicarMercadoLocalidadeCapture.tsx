import React, { useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import { computeLocalidadeResumo } from './placementBeneficiariosLocalidade'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { LocalidadeSlide, SLIDE_H, SLIDE_W } from './BeneficiariosLocalidadeDashboard'
import { SLIDE_FONT } from './placementSlideTheme'
import { captureElementAsPngDataUri } from './placementSlideCapture'

type Props = {
  beneficiarios: PlacementBeneficiario[]
  incluirNoEmail: boolean
  imagemDataUri: string
  disabled?: boolean
  onChange: (part: { incluirNoEmail?: boolean; imagemDataUri?: string }) => void
}

export function ComunicarMercadoLocalidadeCapture({
  beneficiarios,
  incluirNoEmail,
  imagemDataUri,
  disabled,
  onChange,
}: Props) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const resumo = useMemo(() => {
    if (!beneficiarios.length) return null
    return computeLocalidadeResumo(beneficiarios)
  }, [beneficiarios])

  async function handleCapture() {
    if (!exportRef.current || !resumo) return
    setCapturing(true)
    setErrorMsg(null)
    try {
      const dataUri = await captureElementAsPngDataUri(
        exportRef.current,
        SLIDE_W,
        SLIDE_H,
        (doc) => {
          const root = doc.querySelector('[data-export-root]') as HTMLElement | null
          const slide = doc.querySelector('[data-slide-inner]') as HTMLElement | null
          if (root) {
            root.style.width = `${SLIDE_W}px`
            root.style.height = `${SLIDE_H}px`
            root.style.overflow = 'hidden'
          }
          if (slide) {
            slide.style.width = `${SLIDE_W}px`
            slide.style.height = `${SLIDE_H}px`
            slide.style.fontFamily = SLIDE_FONT
          }
        }
      )
      onChange({ imagemDataUri: dataUri, incluirNoEmail: true })
    } catch {
      setErrorMsg('Não foi possível capturar o gráfico. Tente novamente.')
    } finally {
      setCapturing(false)
    }
  }

  if (!beneficiarios.length) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        Importe beneficiários na etapa anterior para gerar o gráfico de localidades.
      </Alert>
    )
  }

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={incluirNoEmail}
            disabled={disabled || !imagemDataUri}
            onChange={(e) => onChange({ incluirNoEmail: e.target.checked })}
          />
        }
        label="Incluir gráfico de localidades no e-mail"
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={capturing ? <CircularProgress size={14} /> : <ImageIcon />}
          disabled={disabled || capturing || !resumo}
          onClick={() => void handleCapture()}
        >
          {capturing ? 'Capturando…' : 'Capturar gráfico (etapa Localidades)'}
        </Button>
        {imagemDataUri ? (
          <Typography variant="caption" color="success.main">
            Gráfico pronto para o e-mail
          </Typography>
        ) : null}
      </Box>
      {errorMsg ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMsg}
        </Alert>
      ) : null}
      {imagemDataUri ? (
        <Box
          component="img"
          src={imagemDataUri}
          alt="Preview localidades"
          sx={{ mt: 1.5, maxWidth: '100%', maxHeight: 220, borderRadius: 1, border: 1, borderColor: 'divider' }}
        />
      ) : null}
      {resumo ? (
        <Box
          sx={{
            position: 'fixed',
            left: -9999,
            top: 0,
            pointerEvents: 'none',
            opacity: 0,
          }}
          aria-hidden
        >
          <Box ref={exportRef} data-export-root sx={{ width: SLIDE_W, height: SLIDE_H }}>
            <LocalidadeSlide resumo={resumo} />
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
