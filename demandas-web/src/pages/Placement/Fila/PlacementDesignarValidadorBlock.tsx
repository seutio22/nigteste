import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import RefreshIcon from '@mui/icons-material/Refresh'
import { usePlacementStore, type PlacementAnalista } from '../../../store/placementStore'
import { placementWorkflowCardSx } from './placementWorkflowTheme'

type Props = {
  analistaResponsavelId?: string
  analistaValidadorId: string
  disabled?: boolean
  saving?: boolean
  onDesignar: (analistaValidadorId: string) => Promise<void>
}

/** Bloco compacto: designa validador do catálogo Placement. */
export function PlacementDesignarValidadorBlock({
  analistaResponsavelId,
  analistaValidadorId,
  disabled,
  saving,
  onDesignar,
}: Props) {
  const placementAnalistas = usePlacementStore((s) => s.analistas)
  const syncAnalistas = usePlacementStore((s) => s.syncAnalistas)
  const isLoadingAnalistas = usePlacementStore((s) => s.isLoadingAnalistas)

  const [selected, setSelected] = useState<PlacementAnalista | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    void syncAnalistas(true)
  }, [syncAnalistas])

  const ordenados = useMemo(
    () =>
      [...placementAnalistas]
        .filter((a) => !analistaResponsavelId || a.id !== analistaResponsavelId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [placementAnalistas, analistaResponsavelId]
  )

  useEffect(() => {
    if (!analistaValidadorId) {
      setSelected(null)
      return
    }
    setSelected(ordenados.find((a) => a.id === analistaValidadorId) ?? null)
  }, [analistaValidadorId, ordenados])

  const catalogoVazio = placementAnalistas.length === 0
  const soResponsavelDisponivel =
    !catalogoVazio && ordenados.length === 0 && !!analistaResponsavelId

  async function handleConfirmar() {
    setLocalError(null)
    if (!selected?.id) {
      setLocalError('Selecione o analista validador (Placement).')
      return
    }
    if (analistaResponsavelId && selected.id === analistaResponsavelId) {
      setLocalError('O validador deve ser diferente do analista responsável.')
      return
    }
    try {
      await onDesignar(selected.id)
    } catch (err: any) {
      setLocalError(err?.message ?? 'Não foi possível designar o validador.')
    }
  }

  return (
    <Paper variant="outlined" sx={{ ...placementWorkflowCardSx, px: 1.5, py: 1.25, mb: 1.5 }}>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 160 }}>
            <PersonSearchIcon color="action" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Analista validador
            </Typography>
          </Stack>
          <Autocomplete
            size="small"
            sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
            options={ordenados}
            loading={isLoadingAnalistas}
            value={selected}
            disabled={disabled || saving}
            onChange={(_, opt) => setSelected(opt)}
            getOptionLabel={(o) => o.nome}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={
              catalogoVazio || soResponsavelDisponivel
                ? 'Cadastre em Dados → Placement → Analista'
                : 'Nenhum analista'
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Placement"
                placeholder="Selecione…"
                required
              />
            )}
          />
          <Tooltip title="Atualizar lista Placement">
            <span>
              <IconButton
                size="small"
                disabled={disabled || isLoadingAnalistas}
                onClick={() => void syncAnalistas(true)}
                aria-label="Atualizar lista"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            onClick={() => void handleConfirmar()}
            disabled={disabled || saving || !selected}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            {saving ? 'Salvando…' : analistaValidadorId ? 'Atualizar' : 'Designar'}
          </Button>
        </Stack>

        {selected ? (
          <Typography variant="caption" color="text.secondary" sx={{ pl: { sm: 3.5 } }}>
            {selected.nome}
            {selected.coordenadorAnalista
              ? ` · Coord.: ${selected.coordenadorAnalista}`
              : ''}
            {selected.gerenteAnalista ? ` · Ger.: ${selected.gerenteAnalista}` : ''}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ pl: { sm: 3.5 } }}>
            Catálogo Dados → Placement → Analista (outro que o responsável)
          </Typography>
        )}

        {(catalogoVazio || soResponsavelDisponivel) && (
          <Alert severity="warning" sx={{ py: 0 }}>
            {catalogoVazio
              ? 'Sem analistas no Placement. Cadastre e atualize a lista.'
              : 'Só há o responsável no catálogo — cadastre outro analista Placement.'}
          </Alert>
        )}
        {localError ? (
          <Alert severity="error" sx={{ py: 0 }}>
            {localError}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
