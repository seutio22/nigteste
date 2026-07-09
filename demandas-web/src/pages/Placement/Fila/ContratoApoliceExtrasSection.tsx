import React from 'react'
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'
import type { SimNaoChoice } from './UpgradeDowngradeFields'

export type ContratoApoliceExtrasValue = {
  multaRescisaoContratual: SimNaoChoice
  multaRescisaoValor: string
  multaRescisaoRegra: string
  multaRescisaoAvisoPrevio: string
  possuiConvencaoColetiva: SimNaoChoice
  convencaoColetivaDetalhe: string
}

type Props = {
  value: ContratoApoliceExtrasValue
  disabled?: boolean
  onChange: (patch: Partial<ContratoApoliceExtrasValue>) => void
}

function SimNaoField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: SimNaoChoice
  disabled?: boolean
  onChange: (next: SimNaoChoice) => void
}) {
  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.5 }}>
        {label}
      </FormLabel>
      <RadioGroup row value={value} onChange={(e) => onChange(e.target.value as SimNaoChoice)}>
        <FormControlLabel
          value="sim"
          control={<Radio size="small" disabled={disabled} />}
          label="Sim"
        />
        <FormControlLabel
          value="nao"
          control={<Radio size="small" disabled={disabled} />}
          label="Não"
        />
      </RadioGroup>
    </FormControl>
  )
}

export function ContratoApoliceExtrasSection({ value, disabled, onChange }: Props) {
  const setMulta = (next: SimNaoChoice) => {
    onChange({
      multaRescisaoContratual: next,
      ...(next !== 'sim'
        ? {
            multaRescisaoValor: '',
            multaRescisaoRegra: '',
            multaRescisaoAvisoPrevio: '',
          }
        : {}),
    })
  }

  const setConvencao = (next: SimNaoChoice) => {
    onChange({
      possuiConvencaoColetiva: next,
      ...(next !== 'sim' ? { convencaoColetivaDetalhe: '' } : {}),
    })
  }

  return (
    <>
      <Grid item xs={12}>
        <SimNaoField
          label="Contrato prevê multa para rescisão contratual?"
          value={value.multaRescisaoContratual}
          disabled={disabled}
          onChange={setMulta}
        />
      </Grid>

      {value.multaRescisaoContratual === 'sim' && (
        <>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Valor da multa"
              fullWidth
              required
              value={value.multaRescisaoValor}
              disabled={disabled}
              onChange={(e) => onChange({ multaRescisaoValor: e.target.value })}
              placeholder="Ex.: percentual ou valor fixo"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Aviso prévio para rescisão"
              fullWidth
              required
              value={value.multaRescisaoAvisoPrevio}
              disabled={disabled}
              onChange={(e) => onChange({ multaRescisaoAvisoPrevio: e.target.value })}
              placeholder="Ex.: 60 dias"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Regra para a multa"
              fullWidth
              required
              multiline
              minRows={2}
              maxRows={16}
              value={value.multaRescisaoRegra}
              disabled={disabled}
              onChange={(e) => onChange({ multaRescisaoRegra: e.target.value })}
              placeholder="Descreva a regra aplicável"
            />
          </Grid>
        </>
      )}

      <Grid item xs={12}>
        <Box sx={{ mt: value.multaRescisaoContratual === 'sim' ? 0 : 1 }}>
          <SimNaoField
            label="Em acordo coletivo?"
            value={value.possuiConvencaoColetiva}
            disabled={disabled}
            onChange={setConvencao}
          />
        </Box>
      </Grid>

      {value.possuiConvencaoColetiva === 'sim' && (
        <Grid item xs={12}>
          <TextField
            label="Detalhes do acordo coletivo"
            fullWidth
            multiline
            minRows={2}
            maxRows={12}
            value={value.convencaoColetivaDetalhe}
            disabled={disabled}
            onChange={(e) => onChange({ convencaoColetivaDetalhe: e.target.value })}
            placeholder="Informe convenção, sindicato, cláusulas ou observações relevantes"
          />
        </Grid>
      )}
    </>
  )
}
