import React, { useMemo } from 'react'
import { Autocomplete, Box, Button, TextField, Typography } from '@mui/material'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import type { PlacementPlano } from '../../../store/placementStore'
import type { PlanoCoberturaForm } from './placementCotacaoDetalhes'
import {
  applyPlacementPlanoToCobertura,
  findCatalogPlanoByNome,
  planosPorFornecedorCategoria,
} from './placementPlanos'

type Props = {
  plano: PlanoCoberturaForm
  operadoraId: string
  categoria: string
  planosCatalogo: PlacementPlano[]
  disabled?: boolean
  onChange: (part: Partial<PlanoCoberturaForm>) => void
  onSaveToCatalog?: (payload: {
    operadoraId: string
    categoria: string
    plano: string
    acomodacao: string | null
    abrangencia: string | null
  }) => Promise<void>
  savingCatalog?: boolean
}

export function PlanoNomeCatalogField({
  plano,
  operadoraId,
  categoria,
  planosCatalogo,
  disabled,
  onChange,
  onSaveToCatalog,
  savingCatalog,
}: Props) {
  const options = useMemo(
    () => planosPorFornecedorCategoria(planosCatalogo, operadoraId, categoria),
    [planosCatalogo, operadoraId, categoria]
  )

  const catalogMatch = useMemo(
    () => findCatalogPlanoByNome(planosCatalogo, operadoraId, categoria, plano.nomePlano),
    [planosCatalogo, operadoraId, categoria, plano.nomePlano]
  )

  const canSaveManual =
    !!onSaveToCatalog &&
    !!plano.nomePlano.trim() &&
    !!operadoraId &&
    !!categoria.trim() &&
    !catalogMatch

  const noOptionsText =
    operadoraId && categoria.trim()
      ? 'Plano não cadastrado — digite o nome ou cadastre em Dados → Placement → Planos'
      : 'Informe fornecedor e categoria no mapeamento'

  return (
    <Box>
      <Autocomplete
        freeSolo
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.plano)}
        isOptionEqualToValue={(a, b) =>
          typeof a === 'string' || typeof b === 'string' ? a === b : a.id === b.id
        }
        value={catalogMatch ?? plano.nomePlano}
        inputValue={plano.nomePlano}
        disabled={disabled || !operadoraId || !categoria.trim()}
        onChange={(_, newValue) => {
          if (newValue == null) {
            onChange({ nomePlano: '', placementPlanoCatalogId: '', acomodacao: '', abrangencia: '' })
            return
          }
          if (typeof newValue === 'string') {
            onChange({ nomePlano: newValue, placementPlanoCatalogId: '' })
            return
          }
          onChange(applyPlacementPlanoToCobertura(newValue))
        }}
        onInputChange={(_, newInput, reason) => {
          if (reason !== 'input') return
          const match = findCatalogPlanoByNome(
            planosCatalogo,
            operadoraId,
            categoria,
            newInput
          )
          if (match) {
            onChange(applyPlacementPlanoToCobertura(match))
            return
          }
          onChange({ nomePlano: newInput, placementPlanoCatalogId: '' })
        }}
        noOptionsText={noOptionsText}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Nome do plano"
            required
            size="small"
            placeholder={
              options.length ? 'Selecione ou digite o plano' : 'Digite o nome do plano'
            }
            helperText={
              catalogMatch
                ? 'Plano da base — acomodação e abrangência carregadas automaticamente.'
                : options.length
                  ? 'Selecione da lista ou informe um plano ainda não cadastrado.'
                  : 'Nenhum plano na base para este fornecedor/categoria.'
            }
          />
        )}
      />
      {canSaveManual ? (
        <Button
          size="small"
          variant="text"
          sx={{ mt: 0.5, px: 0 }}
          startIcon={<SaveOutlinedIcon fontSize="small" />}
          disabled={disabled || savingCatalog}
          onClick={() =>
            void onSaveToCatalog?.({
              operadoraId,
              categoria: categoria.trim(),
              plano: plano.nomePlano.trim(),
              acomodacao: plano.acomodacao || null,
              abrangencia: plano.abrangencia.trim() || null,
            })
          }
        >
          Salvar na base (Dados → Planos)
        </Button>
      ) : null}
      {catalogMatch && plano.acomodacao && plano.abrangencia ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {plano.acomodacao} · {plano.abrangencia}
        </Typography>
      ) : null}
    </Box>
  )
}
