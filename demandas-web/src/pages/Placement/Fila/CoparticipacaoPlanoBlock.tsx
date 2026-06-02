import React from 'react'
import {
  Box,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  type CoparticipacaoForm,
  placeholderLimitadorCopart,
  placeholderValorCopart,
  procedimentosPorColuna,
} from './placementCoparticipacao'

const HEADER_BG = '#1e3a5f'

interface Props {
  coparticipacao: CoparticipacaoForm
  disabled?: boolean
  onChange: (next: CoparticipacaoForm) => void
}

function patchLinha(
  c: CoparticipacaoForm,
  key: keyof CoparticipacaoForm['linhas'],
  part: Partial<CoparticipacaoForm['linhas'][typeof key]>
): CoparticipacaoForm {
  return {
    ...c,
    linhas: {
      ...c.linhas,
      [key]: { ...c.linhas[key], ...part },
    },
  }
}

export function CoparticipacaoPlanoBlock({ coparticipacao, disabled, onChange }: Props) {
  const c = coparticipacao
  const forma = c.formaCobranca
  const phValor = placeholderValorCopart(forma)
  const phLimitador = placeholderLimitadorCopart(forma)

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Radio
            size="small"
            checked={!c.possui}
            disabled={disabled}
            onChange={() => onChange({ ...c, possui: false })}
          />
        }
        label="Plano sem coparticipação"
      />
      <FormControlLabel
        control={
          <Radio
            size="small"
            checked={c.possui}
            disabled={disabled}
            onChange={() => onChange({ ...c, possui: true })}
          />
        }
        label="Plano com coparticipação"
        sx={{ ml: 2 }}
      />

      {c.possui && (
        <Paper
          variant="outlined"
          sx={{
            mt: 1.5,
            overflow: 'hidden',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ bgcolor: HEADER_BG, px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
              Modelo de coparticipação
            </Typography>
          </Box>

          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              gap={2}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140 }}>
                Forma de cobrança
              </Typography>
              <RadioGroup
                row
                value={forma}
                onChange={(e) =>
                  onChange({
                    ...c,
                    formaCobranca: e.target.value as CoparticipacaoForm['formaCobranca'],
                  })
                }
              >
                <FormControlLabel
                  value="percentual"
                  control={<Radio size="small" disabled={disabled} />}
                  label="%"
                />
                <FormControlLabel
                  value="valor"
                  control={<Radio size="small" disabled={disabled} />}
                  label="R$"
                />
              </RadioGroup>
            </Stack>

            <Grid container spacing={2}>
              {([0, 1, 2] as const).map((col) => (
                <Grid item xs={12} md={4} key={col}>
                  <Grid container spacing={1} sx={{ mb: 0.5 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Procedimento
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {forma === 'valor' ? 'R$' : '%'}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Limitador
                      </Typography>
                    </Grid>
                  </Grid>
                  <Stack gap={1}>
                    {procedimentosPorColuna(col).map((proc) => {
                      const linha = c.linhas[proc.key]
                      return (
                        <Grid container spacing={1} key={proc.key} alignItems="center">
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                              {proc.label}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              size="small"
                              fullWidth
                              hiddenLabel
                              disabled={disabled}
                              value={linha.valor}
                              placeholder={phValor}
                              onChange={(e) =>
                                onChange(patchLinha(c, proc.key, { valor: e.target.value }))
                              }
                              inputProps={{ 'aria-label': `${proc.label} valor` }}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              size="small"
                              fullWidth
                              hiddenLabel
                              disabled={disabled}
                              value={linha.limitador}
                              placeholder={phLimitador}
                              onChange={(e) =>
                                onChange(patchLinha(c, proc.key, { limitador: e.target.value }))
                              }
                              inputProps={{ 'aria-label': `${proc.label} limitador` }}
                            />
                          </Grid>
                        </Grid>
                      )
                    })}
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} sm={3} md={2}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Internação
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3} md={2}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Forma"
                    disabled={disabled}
                    value={c.internacao.tipoCobranca}
                    onChange={(e) =>
                      onChange({
                        ...c,
                        internacao: {
                          ...c.internacao,
                          tipoCobranca: e.target
                            .value as CoparticipacaoForm['internacao']['tipoCobranca'],
                        },
                      })
                    }
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    <MenuItem value="percentual">Percentual (%)</MenuItem>
                    <MenuItem value="valor">Valor (R$)</MenuItem>
                    <MenuItem value="desconto">Limitador de desconto</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={2} md={2}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Valor"
                    disabled={disabled}
                    value={c.internacao.valor}
                    placeholder={
                      c.internacao.tipoCobranca === 'valor'
                        ? 'R$'
                        : c.internacao.tipoCobranca === 'desconto'
                          ? '% desc.'
                          : '%'
                    }
                    onChange={(e) =>
                      onChange({
                        ...c,
                        internacao: { ...c.internacao, valor: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Limitador"
                    disabled={disabled}
                    value={c.internacao.limitador}
                    placeholder="Limite (R$, % ou teto de desconto)"
                    onChange={(e) =>
                      onChange({
                        ...c,
                        internacao: { ...c.internacao, limitador: e.target.value },
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
              Informe coparticipação e limitador por procedimento. O limitador pode ser teto em R$ ou em %,
              conforme a forma de cobrança. Em internação, use «Limitador de desconto» quando aplicável.
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  )
}
