import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore, type PlacementAnalista } from '../../../store/placementStore'

type Props = {
  analistaCadastroId: string
  analistaResponsavelId: string
  analistaResponsavel?: PlacementAnalista | null
  disabled?: boolean
  saving?: boolean
  onDesignar: (analistaResponsavelId: string) => Promise<void>
}

export function PlacementDesignarAnalistaBlock({
  analistaCadastroId,
  analistaResponsavelId,
  analistaResponsavel,
  disabled,
  saving,
  onDesignar,
}: Props) {
  const { analistas: analistasCadastro } = useMasterDataStore()
  const placementAnalistas = usePlacementStore((s) => s.analistas)
  const syncAnalistas = usePlacementStore((s) => s.syncAnalistas)
  const isLoadingAnalistas = usePlacementStore((s) => s.isLoadingAnalistas)

  const [selected, setSelected] = useState<PlacementAnalista | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    void syncAnalistas(true)
  }, [syncAnalistas])

  const ordenados = useMemo(
    () => [...placementAnalistas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [placementAnalistas]
  )

  useEffect(() => {
    if (!analistaResponsavelId) {
      setSelected(null)
      return
    }
    const fromProp =
      analistaResponsavel?.id === analistaResponsavelId ? analistaResponsavel : null
    const fromList = ordenados.find((a) => a.id === analistaResponsavelId) ?? null
    setSelected(fromProp ?? fromList)
  }, [analistaResponsavelId, analistaResponsavel, ordenados])

  const nomeCadastro =
    analistasCadastro.find((a) => a.id === analistaCadastroId)?.nome ?? '—'

  async function handleConfirmar() {
    setLocalError(null)
    if (!selected?.id) {
      setLocalError('Selecione o analista responsável na lista de Placement.')
      return
    }
    try {
      await onDesignar(selected.id)
    } catch (err: any) {
      setLocalError(err?.message ?? 'Não foi possível designar o analista.')
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <PersonAddIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Designar analista responsável
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Obrigatório antes de avançar para «Kick off». O analista de cadastro é quem abriu o
        processo; o responsável vem do catálogo Dados → Placement → Analista.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Analista de cadastro"
            fullWidth
            value={nomeCadastro}
            disabled
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Autocomplete
              sx={{ flex: 1 }}
              options={ordenados}
              loading={isLoadingAnalistas}
              value={selected}
              disabled={disabled || saving}
              onChange={(_, opt) => setSelected(opt)}
              getOptionLabel={(o) => o.nome}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText="Cadastre analistas em Dados → Placement → Analista"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Analista responsável"
                  placeholder="Selecione na lista Placement"
                  required
                />
              )}
            />
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1, flexShrink: 0 }}
              startIcon={<RefreshIcon />}
              disabled={disabled || isLoadingAnalistas}
              onClick={() => void syncAnalistas(true)}
            >
              Atualizar
            </Button>
          </Stack>
        </Grid>

        {selected && (
          <Grid item xs={12}>
            <Alert severity="info" icon={false}>
              <Typography variant="body2">
                <strong>{selected.nome}</strong> · Coordenador: {selected.coordenadorAnalista} ·
                Gerente: {selected.gerenteAnalista}
              </Typography>
            </Alert>
          </Grid>
        )}

        {localError && (
          <Grid item xs={12}>
            <Alert severity="error">{localError}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={() => void handleConfirmar()}
            disabled={disabled || saving || !selected}
          >
            {saving ? 'Salvando…' : analistaResponsavelId ? 'Atualizar designação' : 'Confirmar designação'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  )
}
