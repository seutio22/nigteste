import React from 'react'
import { Box, TextField, Typography } from '@mui/material'
import {
  type ItensConcluidosDetalhe,
  sumItensConcluidosDetalhe,
} from './validacaoItensConcluidos'

type Props = {
  value: ItensConcluidosDetalhe
  onChange: (next: ItensConcluidosDetalhe) => void
}

const FIELDS: Array<{ key: keyof ItensConcluidosDetalhe; label: string }> = [
  { key: 'contrato', label: 'Contrato' },
  { key: 'subs', label: "SUB's" },
]

function qtyInputValue(value?: number): string {
  return value == null || Number.isNaN(value) ? '' : String(value)
}

function parseQtyInput(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

export function ItensConcluidosPanel({ value, onChange }: Props) {
  const total = sumItensConcluidosDetalhe(value)

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Itens concluídos
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          bgcolor: 'grey.50',
        }}
      >
        {FIELDS.map((field) => (
          <Box
            key={field.key}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
              {field.label}
            </Typography>
            <TextField
              type="number"
              size="small"
              inputProps={{ min: 0, step: 1 }}
              placeholder="0"
              value={qtyInputValue(value[field.key])}
              onChange={(e) =>
                onChange({
                  ...value,
                  [field.key]: parseQtyInput(e.target.value),
                })
              }
              sx={{
                width: 68,
                '& .MuiInputBase-root': { bgcolor: 'background.paper' },
                '& input': { py: 0.75, px: 1, textAlign: 'center' },
              }}
            />
          </Box>
        ))}

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            ml: { xs: 0, sm: 'auto' },
            pl: { xs: 0, sm: 1 },
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderColor: { sm: 'divider' },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
            {total}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
