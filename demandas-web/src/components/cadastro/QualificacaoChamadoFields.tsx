import {
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  CHAMADO_QUALIFICACAO_ITENS,
  type ChamadoQualificacao,
  type ChamadoQualificacaoKey,
  countChamadoQualificacaoPontos,
} from '../../types/chamadoQualificacao'

interface Props {
  value: ChamadoQualificacao
  onChange: (next: ChamadoQualificacao) => void
  disabled?: boolean
  showHelper?: boolean
}

export function QualificacaoChamadoFields({
  value,
  onChange,
  disabled,
  showHelper = true,
}: Props) {
  const pontosMarcados = countChamadoQualificacaoPontos(value)

  const toggle = (key: ChamadoQualificacaoKey, checked: boolean) => {
    onChange({ ...value, [key]: checked })
  }

  return (
    <>
      {showHelper && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Marque os pontos identificados na recepção do chamado.
        </Typography>
      )}

      <FormGroup sx={{ gap: 0.5 }}>
        {CHAMADO_QUALIFICACAO_ITENS.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={value[key]}
                disabled={disabled}
                onChange={(e) => toggle(key, e.target.checked)}
              />
            }
            label={<Typography variant="body2">{label}</Typography>}
          />
        ))}
      </FormGroup>

      <TextField
        label="Observações da qualificação"
        value={value.observacao ?? ''}
        onChange={(e) => onChange({ ...value, observacao: e.target.value })}
        multiline
        minRows={3}
        fullWidth
        size="small"
        disabled={disabled}
        sx={{ mt: 2 }}
        placeholder="Detalhes adicionais sobre a recepção…"
      />

      {pontosMarcados > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
          {CHAMADO_QUALIFICACAO_ITENS.filter(({ key }) => value[key]).map(({ key, label }) => (
            <Chip key={key} label={label} size="small" color="warning" variant="outlined" />
          ))}
        </Stack>
      )}
    </>
  )
}
