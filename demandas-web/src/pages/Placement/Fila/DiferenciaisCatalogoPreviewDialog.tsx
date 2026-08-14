import React from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { DiferencialPreviewRow } from './placementConsolidandoDados'

type Props = {
  open: boolean
  mode: 'import' | 'save'
  fornecedorNome: string
  rows: DiferencialPreviewRow[]
  skippedCount?: number
  loading?: boolean
  /** Ex.: "Diferenciais" ou "Condições contratuais" */
  catalogLabel?: string
  onClose: () => void
  onConfirm: () => void
}

export function DiferenciaisCatalogoPreviewDialog({
  open,
  mode,
  fornecedorNome,
  rows,
  skippedCount = 0,
  loading = false,
  catalogLabel = 'Diferenciais',
  onClose,
  onConfirm,
}: Props) {
  const isImport = mode === 'import'
  const isCondicoes = catalogLabel.toLowerCase().includes('condi')
  const dadosPath = isCondicoes
    ? 'Dados → Condições contratuais'
    : 'Dados → Diferenciais'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isImport ? 'Prévia — consultar catálogo' : 'Prévia — cadastrar no catálogo'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isImport
            ? `Fornecedor: ${fornecedorNome}. Revise os itens encontrados em ${dadosPath} antes de preencher o lançamento.`
            : `Fornecedor: ${fornecedorNome}. Confirme os registros que serão gravados em ${dadosPath} para reutilização em outras cotações.`}
        </Typography>

        {!rows.length ? (
          <Alert severity="warning">
            {isImport
              ? 'Nenhum registro encontrado no catálogo para este fornecedor.'
              : isCondicoes
                ? 'Nenhum registro elegível para cadastro. Informe a descrição (plano é opcional — deixe em branco para condição geral do fornecedor).'
                : 'Nenhum diferencial elegível para cadastro. Informe descrição e selecione um plano cadastrado em Dados → Planos.'}
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Plano</TableCell>
                <TableCell>Descrição</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.itemKey}-${row.planoLabel}-${row.texto.slice(0, 24)}`}>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.itemLabel}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.planoLabel}</TableCell>
                  <TableCell>{row.texto}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {skippedCount > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {skippedCount} linha(s) da cotação não entraram na prévia
            {isCondicoes
              ? ' (plano informado sem vínculo em Dados → Planos).'
              : ' por falta de plano vinculado em Dados → Planos.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading || !rows.length}
        >
          {loading
            ? 'Processando…'
            : isImport
              ? 'Importar para esta cotação'
              : 'Confirmar cadastro no catálogo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
