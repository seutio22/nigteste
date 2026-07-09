import React from 'react'
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { InconsistenciaResumoItem } from './placementBeneficiariosValidacaoExport'

type Props = {
  loading?: boolean
  itens: InconsistenciaResumoItem[]
  totalLinhas: number
  totalOcorrencias: number
  /** Remove largura máxima — uso em apresentação unificada. */
  fullWidth?: boolean
}

export function KickOffInconsistenciasResumoTable({
  loading,
  itens,
  totalLinhas,
  totalOcorrencias,
  fullWidth,
}: Props) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Carregando validação…
        </Typography>
      </Box>
    )
  }

  if (totalLinhas === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Importe a base de beneficiários na Análise para exibir o resumo.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        maxWidth: fullWidth ? 'none' : 520,
      }}
    >
      <Table size="small" sx={{ '& td, & th': { py: 0.75, px: 1.5, fontSize: 12 } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell sx={{ fontWeight: 700 }}>Resumo inconsistências</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 72 }}>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {itens.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2}>
                <Typography variant="caption" color="success.main">
                  Nenhuma inconsistência na base.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            itens.map((item) => (
              <TableRow key={item.descricao} hover>
                <TableCell>{item.descricao}</TableCell>
                <TableCell align="right">{item.total}</TableCell>
              </TableRow>
            ))
          )}
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 700 }}>Total ocorrências</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {totalOcorrencias}
            </TableCell>
          </TableRow>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 700 }}>Total linhas (base)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {totalLinhas}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  )
}
