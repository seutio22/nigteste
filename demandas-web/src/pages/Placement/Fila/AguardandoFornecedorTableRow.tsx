import React from 'react'
import { TableCell, TableRow } from '@mui/material'
import type { AguardandoOperadoraFornecedorState, MercadoFornecedorClassificacao } from './placementAguardandoOperadora'
import { comissaoApresentadaResumo, grupoProducaoExibido } from './placementAguardandoOperadora'
import type { ComunicarMercadoFornecedorState } from './placementComunicarMercado'
import { MERCADO_CLASSIFICACAO_LABELS } from './placementMercadoQuadro'

type Props = {
  nome: string
  selected: boolean
  cm?: ComunicarMercadoFornecedorState
  ag?: AguardandoOperadoraFornecedorState
  prazoRetorno?: string
  onSelect: () => void
}

export const AguardandoFornecedorTableRow = React.memo(function AguardandoFornecedorTableRow({
  nome,
  selected,
  cm,
  ag,
  prazoRetorno,
  onSelect,
}: Props) {
  return (
    <TableRow selected={selected} hover sx={{ cursor: 'pointer' }} onClick={onSelect}>
      <TableCell>{nome}</TableCell>
      <TableCell>{cm?.dataEnvio ? cm.dataEnvio.slice(0, 10) : '—'}</TableCell>
      <TableCell>
        {cm?.dataPrevisaoRetorno?.slice(0, 10) || prazoRetorno?.slice(0, 10) || '—'}
      </TableCell>
      <TableCell>{ag?.dataRetornoEfetiva?.slice(0, 10) || '—'}</TableCell>
      <TableCell>{grupoProducaoExibido(ag, cm?.grupoProducao) || '—'}</TableCell>
      <TableCell>{comissaoApresentadaResumo(ag)}</TableCell>
      <TableCell>
        {ag?.classificacaoMercado
          ? MERCADO_CLASSIFICACAO_LABELS[ag.classificacaoMercado as MercadoFornecedorClassificacao]
          : '—'}
      </TableCell>
      <TableCell>{ag?.retornoRecebido ? 'Retorno recebido' : 'Aguardando'}</TableCell>
    </TableRow>
  )
})
