import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import LinkIcon from '@mui/icons-material/Link'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import { useNavigate } from 'react-router-dom'
import { placementWorkflowCardSx } from './placementWorkflowTheme'
import { SharePlacementModal } from './SharePlacementModal'
import { PROPOSTA_DECK_ORDER, propostaDeckNavLabel } from './placementPropostaDeck'
import type { CotacaoFormState } from './CotacaoFormFields'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { useComparativoConfigPersist } from './useComparativoConfigPersist'
import { usePlacementKickOffAutosave } from './usePlacementKickOffAutosave'
import { patchKickOffInForm } from './placementPatchKickOff'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import {
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import {
  COMPARATIVO_LINHA_CHAVES,
  COMPARATIVO_LINHA_HINTS,
  COMPARATIVO_LINHA_LABELS,
  type ComparativoLinhaChave,
} from './placementComparativoConfig'
import {
  apresentacaoAllowedViewsCsv,
  parseApresentacaoPanesOcultas,
  PROPOSTA_APRESENTACAO_PANES,
  type PropostaViewerPane,
} from './placementPropostaApresentacao'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  ticket?: string
  disabled?: boolean
}

export function PlacementPropostaEnviadaPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  ticket,
  disabled,
}: Props) {
  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

  const { config, persistConfig } = useComparativoConfigPersist({
    cotacaoId,
    form,
    operadoras,
    operadorasById,
    onChange,
    onPersisted,
  })
  const { scheduleSave } = usePlacementKickOffAutosave({ cotacaoId, onPersisted })

  const linhasOcultas = useMemo(() => new Set(config.linhasOcultas ?? []), [config.linhasOcultas])

  const panesOcultas = useMemo(() => {
    const ag = parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia)
    return new Set(parseApresentacaoPanesOcultas(ag?.apresentacaoPanesOcultas))
  }, [form.kickOffEstrategia])

  const allowedViewsCsv = useMemo(
    () => apresentacaoAllowedViewsCsv(Array.from(panesOcultas)),
    [panesOcultas]
  )

  const toggleLinha = useCallback(
    (chave: ComparativoLinhaChave) => {
      if (disabled) return
      const next = new Set(config.linhasOcultas ?? [])
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      persistConfig({ ...config, linhasOcultas: Array.from(next) as ComparativoLinhaChave[] })
    },
    [config, disabled, persistConfig]
  )

  const togglePane = useCallback(
    (pane: PropostaViewerPane) => {
      if (disabled) return
      const comunicar = ensureComunicarMercadoState(
        parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      )
      const ag = ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById,
        comunicar
      )
      const next = new Set(parseApresentacaoPanesOcultas(ag.apresentacaoPanesOcultas))
      if (next.has(pane)) next.delete(pane)
      else next.add(pane)
      // Impede ocultar todas as abas.
      const stillVisible = PROPOSTA_APRESENTACAO_PANES.some((p) => !next.has(p.id))
      if (!stillVisible) return
      const fornecedores = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
      const nextForm = patchKickOffInForm(
        form,
        {
          aguardandoOperadora: {
            ...ag,
            apresentacaoPanesOcultas: Array.from(next),
          },
        },
        fornecedores
      )
      onChange(nextForm)
      if (nextForm.kickOffEstrategia) scheduleSave(nextForm.kickOffEstrategia)
    },
    [disabled, form, onChange, operadoras, operadorasById, scheduleSave]
  )

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          ...placementWorkflowCardSx,
          p: { xs: 2, md: 2.5 },
          mb: 2,
          borderLeft: '4px solid',
          borderLeftColor: 'primary.main',
        }}
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Apresentação da proposta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Defina o que entra na apresentação e no link público antes de gerar. O visual é o
              comparativo em tela cheia (não o slide de PPT).
            </Typography>
          </Box>

          <Alert severity="info" sx={{ py: 0.75 }}>
            Questionar o que apresentar ao cliente — por exemplo a faixa «MDS · Corretor ·
            Coparticipação». O que desligar aqui some da apresentação e do link.
          </Alert>

          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              maxWidth: '100%',
              opacity:
                linhasOcultas.has('contribuicao') && linhasOcultas.has('coparticipacao') ? 0.45 : 1,
            }}
          >
            <HealthAndSafetyIcon sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
              {[
                !linhasOcultas.has('contribuicao') ? 'MDS 50% · Corretor 50%' : null,
                !linhasOcultas.has('coparticipacao') ? 'Sem coparticipação' : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Faixa resumo oculta'}
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}
          >
            Conteúdo do contrato / comparativo
          </Typography>
          <Stack spacing={0.5}>
            {COMPARATIVO_LINHA_CHAVES.map((chave) => (
              <FormControlLabel
                key={chave}
                control={
                  <Switch
                    size="small"
                    checked={!linhasOcultas.has(chave)}
                    disabled={disabled}
                    onChange={() => toggleLinha(chave)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: linhasOcultas.has(chave) ? 400 : 600 }}>
                      {COMPARATIVO_LINHA_LABELS[chave]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {COMPARATIVO_LINHA_HINTS[chave]}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0 }}
              />
            ))}
          </Stack>

          <Divider />

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}
          >
            Abas da apresentação
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {PROPOSTA_APRESENTACAO_PANES.map((p) => (
              <FormControlLabel
                key={p.id}
                control={
                  <Switch
                    size="small"
                    checked={!panesOcultas.has(p.id)}
                    disabled={disabled}
                    onChange={() => togglePane(p.id)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: panesOcultas.has(p.id) ? 400 : 600 }}>
                    {p.label}
                  </Typography>
                }
              />
            ))}
          </Stack>

          <Divider />

          <Stack component="ol" spacing={0.35} sx={{ m: 0, pl: 2.25 }}>
            {PROPOSTA_DECK_ORDER.map((id) => (
              <Typography key={id} component="li" variant="body2" color="text.secondary">
                {propostaDeckNavLabel(id)}
              </Typography>
            ))}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<SlideshowIcon />}
              disabled={disabled}
              onClick={() => navigate(`/placement/fila/${cotacaoId}/proposta`)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Gerar apresentação
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              disabled={disabled}
              onClick={() => setShareOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Gerar link público
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <SharePlacementModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        cotacaoId={cotacaoId}
        ticketLabel={ticket || cotacaoId}
        allowedViews={allowedViewsCsv}
      />
    </>
  )
}
