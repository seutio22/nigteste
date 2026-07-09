import React from 'react'
import { Checkbox, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import { PlacementDraftTextField } from './PlacementDraftTextField'
import type { ComunicarMercadoFornecedorState } from './placementComunicarMercado'

type Props = {
  nome: string
  fornKey: string
  selected: boolean
  disabled?: boolean
  st?: ComunicarMercadoFornecedorState
  prazoRetorno?: string
  onSelect: () => void
  onPatch: (key: string, part: Partial<ComunicarMercadoFornecedorState>) => void
  onToggleComunicado: (key: string, nome: string, checked: boolean) => void
}

export const ComunicarMercadoFornecedorTableRow = React.memo(function ComunicarMercadoFornecedorTableRow({
  nome,
  fornKey,
  selected,
  disabled,
  st,
  prazoRetorno,
  onSelect,
  onPatch,
  onToggleComunicado,
}: Props) {
  return (
    <TableRow
      hover
      selected={selected}
      sx={{
        cursor: 'pointer',
        bgcolor: st?.enviado ? 'success.50' : undefined,
      }}
      onClick={onSelect}
    >
      <TableCell>
        <Stack direction="row" alignItems="center" gap={0.5}>
          {st?.enviado ? <CheckCircleIcon fontSize="small" color="success" /> : null}
          <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 400 }}>
            {nome}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          disabled={disabled}
          value={st?.dataEnvio?.slice(0, 10) ?? ''}
          onChange={(e) => onPatch(fornKey, { dataEnvio: e.target.value })}
          style={{ width: '100%', fontSize: 13, padding: 4 }}
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          disabled={disabled}
          value={st?.dataPrevisaoRetorno?.slice(0, 10) || prazoRetorno?.slice(0, 10) || ''}
          onChange={(e) => onPatch(fornKey, { dataPrevisaoRetorno: e.target.value })}
          style={{ width: '100%', fontSize: 13, padding: 4 }}
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <PlacementDraftTextField
          size="small"
          fullWidth
          placeholder="Grupo"
          disabled={disabled}
          value={st?.grupoProducao ?? ''}
          onCommit={(v) => onPatch(fornKey, { grupoProducao: v })}
        />
      </TableCell>
      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Marcar como comunicado ao mercado">
          <Checkbox
            checked={st?.enviado === true}
            disabled={disabled}
            icon={<MarkEmailReadIcon fontSize="small" />}
            checkedIcon={<MarkEmailReadIcon fontSize="small" color="success" />}
            onChange={(e) => onToggleComunicado(fornKey, nome, e.target.checked)}
          />
        </Tooltip>
      </TableCell>
    </TableRow>
  )
})
