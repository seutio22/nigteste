import React from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import {
  FORMULARIO_TIPOS_DISPONIVEIS,
  PLACEMENT_FORMULARIO_TIPOS,
  type PlacementFormularioTipo,
  labelFormularioTipo,
} from './placementFormularioContrato'

const FORMULARIO_ICONS: Partial<Record<PlacementFormularioTipo, React.ReactNode>> = {
  saude: <LocalHospitalIcon color="primary" />,
}

type PickerProps = {
  onSelect: (tipo: PlacementFormularioTipo) => void
  disabled?: boolean
}

export function isFormularioTipoParam(value: string | null | undefined): value is PlacementFormularioTipo {
  if (!value) return false
  return PLACEMENT_FORMULARIO_TIPOS.some((t) => t.value === value)
}

export function parseFormularioTipoFromSearch(
  value: string | null | undefined
): PlacementFormularioTipo | null {
  if (!isFormularioTipoParam(value)) return null
  return value
}

function FormularioTipoCards({ onSelect, disabled }: PickerProps) {
  return (
    <Grid container spacing={2}>
      {PLACEMENT_FORMULARIO_TIPOS.map((opt) => {
        const disponivel = FORMULARIO_TIPOS_DISPONIVEIS.includes(
          opt.value as (typeof FORMULARIO_TIPOS_DISPONIVEIS)[number]
        )
        return (
          <Grid item xs={12} sm={6} md={3} key={opt.value}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                opacity: disponivel ? 1 : 0.72,
                borderColor: disponivel ? 'primary.light' : 'divider',
              }}
            >
              <CardActionArea
                disabled={disabled || !disponivel}
                onClick={() => onSelect(opt.value)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {FORMULARIO_ICONS[opt.value] ?? (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                          }}
                        />
                      )}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {opt.label}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {opt.value === 'saude'
                        ? 'Cotação de plano de saúde — contrato, planos, beneficiários e kick off.'
                        : 'Formulário específico para este ramo.'}
                    </Typography>
                    {!disponivel && (
                      <Chip label="Em breve" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

/** Tela inicial da nova cotação — escolha do formulário antes de carregar os campos. */
export function FormularioTipoPickerPage({
  onSelect,
  disabled,
}: PickerProps & { title?: string }) {
  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        Escolha o tipo de formulário. Cada opção carrega um fluxo de cotação adaptado ao ramo.
      </Typography>
      <FormularioTipoCards onSelect={onSelect} disabled={disabled} />
    </Stack>
  )
}

type DialogProps = PickerProps & {
  open: boolean
  onClose: () => void
}

export function FormularioTipoPickerDialog({ open, onClose, onSelect, disabled }: DialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nova cotação — qual formulário?</DialogTitle>
      <DialogContent dividers sx={{ pb: 3 }}>
        <FormularioTipoPickerPage
          onSelect={(tipo) => {
            onSelect(tipo)
            onClose()
          }}
          disabled={disabled}
        />
      </DialogContent>
    </Dialog>
  )
}

export function FormularioTipoBadge({ tipo }: { tipo: PlacementFormularioTipo }) {
  if (!tipo) return null
  return (
    <Chip
      label={`Formulário: ${labelFormularioTipo(tipo)}`}
      color="primary"
      variant="outlined"
      size="small"
      sx={{ fontWeight: 600 }}
    />
  )
}
