import React from 'react'
import {
  Box,
  Button,
  Grid,
  IconButton,
  Stack,
  TextField,
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
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (v: string) => void
}) {
  return (
    <TextField
      size="small"
      disabled={disabled}
      value={value}
      placeholder="0,00"
      sx={inputCompactSx}
      onBlur={() => {
        const formatted = formatReembolsoMoedaDisplay(value)
        if (formatted !== value) onChange(formatted)
      }}
      onChange={(e) => onChange(sanitizeReembolsoMoedaInput(e.target.value))}
      inputProps={{ inputMode: 'decimal' }}
    />
  )
}

function ProcLinha({
  label,
  value,
  disabled,
  onChange,
  onRemove,
}: {
  label: React.ReactNode
  value: string
  disabled?: boolean
  onChange: (v: string) => void
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
      <MoedaField value={value} disabled={disabled} onChange={onChange} />
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

export function ReembolsoPlanoBlock({ detalhe, disabled, onChange }: Props) {
  const d = detalhe

  const addCustom = () => {
    if (d.procedimentosCustomizados.length >= MAX_CUSTOM) return
    const id = newReembolsoProcedimentoId()
    onChange({
      ...d,
      procedimentosCustomizados: [...d.procedimentosCustomizados, { id, nome: '' }],
    })
  }

  const removeCustom = (id: string) => {
    const nextValores = { ...d.valores }
    delete nextValores[id]
    onChange({
      ...d,
      valores: nextValores,
      procedimentosCustomizados: d.procedimentosCustomizados.filter((p) => p.id !== id),
    })
  }

  return (
    <Box sx={{ mt: 1, maxWidth: 720 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
        Detalhamento por procedimento
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.25 }}>
        <TextField
          label="Prazo consulta (dias)"
          size="small"
          value={d.consultaDias}
          disabled={disabled}
          onChange={(e) => onChange({ ...d, consultaDias: sanitizeReembolsoDias(e.target.value) })}
          sx={{ width: 148, '& .MuiInputBase-root': { height: 34 } }}
        />
        <TextField
          label="Prazo procedimentos (dias)"
          size="small"
          value={d.procedimentosDias}
          disabled={disabled}
          onChange={(e) => onChange({ ...d, procedimentosDias: sanitizeReembolsoDias(e.target.value) })}
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
              onChange={(v) => onChange(patchValor(d, proc.key, v))}
            />
          </Grid>
        ))}
        {d.procedimentosCustomizados.map((proc) => (
          <Grid item xs={12} sm={6} key={proc.id}>
            <ProcLinha
              label={
                <TextField
                  size="small"
                  fullWidth
                  disabled={disabled}
                  placeholder="Procedimento"
                  value={proc.nome}
                  onChange={(e) =>
                    onChange({
                      ...d,
                      procedimentosCustomizados: d.procedimentosCustomizados.map((p) =>
                        p.id === proc.id ? { ...p, nome: e.target.value } : p
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
              onChange={(v) => onChange(patchValor(d, proc.id, v))}
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
}
