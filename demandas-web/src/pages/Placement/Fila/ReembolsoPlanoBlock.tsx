import React, { memo, useRef } from 'react'
import {
  Box,
  Button,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  formatReembolsoMoedaDisplay,
  newReembolsoProcedimentoId,
  REEMBOLSO_PROCEDIMENTOS_FIXOS,
  sanitizeReembolsoDias,
  sanitizeReembolsoMoedaInput,
  type ReembolsoPlanoDetalhe,
} from './placementReembolso'
import { PlacementDraftTextField } from './PlacementDraftTextField'

const MAX_CUSTOM = 8

const inputCompactSx = {
  width: 92,
  '& .MuiInputBase-root': { height: 32 },
  '& .MuiInputBase-input': { py: 0.5, px: 0.75, fontSize: '0.75rem', textAlign: 'center' },
}

interface Props {
  detalhe: ReembolsoPlanoDetalhe
  disabled?: boolean
  onChange: (next: ReembolsoPlanoDetalhe) => void
}

function patchValor(d: ReembolsoPlanoDetalhe, key: string, value: string): ReembolsoPlanoDetalhe {
  return {
    ...d,
    valores: { ...d.valores, [key]: value },
  }
}

function MoedaField({
  value,
  disabled,
  onCommit,
}: {
  value: string
  disabled?: boolean
  onCommit: (v: string) => void
}) {
  return (
    <PlacementDraftTextField
      size="small"
      disabled={disabled}
      value={value}
      placeholder="0,00"
      sx={inputCompactSx}
      transform={sanitizeReembolsoMoedaInput}
      formatOnBlur={formatReembolsoMoedaDisplay}
      onCommit={onCommit}
      inputProps={{ inputMode: 'decimal' }}
    />
  )
}

function ProcLinha({
  label,
  value,
  disabled,
  onCommit,
  onRemove,
}: {
  label: React.ReactNode
  value: string
  disabled?: boolean
  onCommit: (v: string) => void
  onRemove?: () => void
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minHeight: 34 }}>
      <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
        {typeof label === 'string' ? (
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, fontSize: 10, lineHeight: 1.25, display: 'block' }}
          >
            {label}
          </Typography>
        ) : (
          label
        )}
      </Box>
      <MoedaField value={value} disabled={disabled} onCommit={onCommit} />
      {onRemove ? (
        <IconButton size="small" disabled={disabled} onClick={onRemove} sx={{ p: 0.35 }}>
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      ) : (
        <Box sx={{ width: 28, flexShrink: 0 }} />
      )}
    </Stack>
  )
}

export const ReembolsoPlanoBlock = memo(function ReembolsoPlanoBlock({
  detalhe,
  disabled,
  onChange,
}: Props) {
  const d = detalhe
  const dRef = useRef(d)
  dRef.current = d

  const addCustom = () => {
    if (dRef.current.procedimentosCustomizados.length >= MAX_CUSTOM) return
    const id = newReembolsoProcedimentoId()
    onChange({
      ...dRef.current,
      procedimentosCustomizados: [...dRef.current.procedimentosCustomizados, { id, nome: '' }],
    })
  }

  const removeCustom = (id: string) => {
    const cur = dRef.current
    const nextValores = { ...cur.valores }
    delete nextValores[id]
    onChange({
      ...cur,
      valores: nextValores,
      procedimentosCustomizados: cur.procedimentosCustomizados.filter((p) => p.id !== id),
    })
  }

  return (
    <Box sx={{ mt: 1, maxWidth: 720 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
        Detalhamento por procedimento
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.25 }}>
        <PlacementDraftTextField
          label="Prazo consulta (dias)"
          size="small"
          value={d.consultaDias}
          disabled={disabled}
          transform={sanitizeReembolsoDias}
          onCommit={(v) => onChange({ ...dRef.current, consultaDias: v })}
          sx={{ width: 148, '& .MuiInputBase-root': { height: 34 } }}
        />
        <PlacementDraftTextField
          label="Prazo procedimentos (dias)"
          size="small"
          value={d.procedimentosDias}
          disabled={disabled}
          transform={sanitizeReembolsoDias}
          onCommit={(v) => onChange({ ...dRef.current, procedimentosDias: v })}
          sx={{ width: 168, '& .MuiInputBase-root': { height: 34 } }}
        />
      </Stack>

      <Grid container spacing={1.5}>
        {REEMBOLSO_PROCEDIMENTOS_FIXOS.map((proc) => (
          <Grid item xs={12} sm={6} key={proc.key}>
            <ProcLinha
              label={proc.label}
              value={d.valores[proc.key] ?? ''}
              disabled={disabled}
              onCommit={(v) => onChange(patchValor(dRef.current, proc.key, v))}
            />
          </Grid>
        ))}
        {d.procedimentosCustomizados.map((proc) => (
          <Grid item xs={12} sm={6} key={proc.id}>
            <ProcLinha
              label={
                <PlacementDraftTextField
                  size="small"
                  fullWidth
                  disabled={disabled}
                  placeholder="Procedimento"
                  value={proc.nome}
                  onCommit={(nome) =>
                    onChange({
                      ...dRef.current,
                      procedimentosCustomizados: dRef.current.procedimentosCustomizados.map((p) =>
                        p.id === proc.id ? { ...p, nome } : p
                      ),
                    })
                  }
                  sx={{
                    '& .MuiInputBase-root': { height: 32 },
                    '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' },
                  }}
                />
              }
              value={d.valores[proc.id] ?? ''}
              disabled={disabled}
              onCommit={(v) => onChange(patchValor(dRef.current, proc.id, v))}
              onRemove={() => removeCustom(proc.id)}
            />
          </Grid>
        ))}
      </Grid>

      <Button
        size="small"
        startIcon={<AddIcon />}
        disabled={disabled || d.procedimentosCustomizados.length >= MAX_CUSTOM}
        onClick={addCustom}
        sx={{ mt: 1, fontSize: '0.75rem' }}
      >
        Adicionar procedimento
      </Button>
    </Box>
  )
})
