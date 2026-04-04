import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'

const PAGE_SIZE = 100

type SnapshotPayload = {
  entityKey: string
  syncedAt: string | null
  rowCount: number
  total: number
  limit: number
  offset: number
  columns: string[]
  rows: Record<string, string>[]
}

type Props = {
  open: boolean
  entityKey: string | null
  onClose: () => void
}

export default function NexusSnapshotPreviewDialog({ open, entityKey, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<SnapshotPayload | null>(null)
  const [offset, setOffset] = useState(0)

  const load = useCallback(async () => {
    if (!entityKey) return
    setLoading(true)
    setErr(null)
    const params = new URLSearchParams({
      entity: entityKey,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    const r = await api<SnapshotPayload>(`/admin/nexus-sync/snapshot?${params.toString()}`)
    setLoading(false)
    if (!r.ok || !r.data) {
      setErr(r.error || 'Não foi possível carregar os registros')
      setData(null)
      return
    }
    setData(r.data)
  }, [entityKey, offset])

  useEffect(() => {
    if (open && entityKey) void load()
  }, [open, entityKey, offset, load])

  const hasPrev = offset > 0
  const hasNext = data != null && offset + data.rows.length < data.total

  return (
    <Dialog
      key={open && entityKey ? `${entityKey}-open` : 'closed'}
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
    >
      <DialogTitle component="div">
        <Typography variant="h6" component="span">
          Registros sincronizados
        </Typography>
        {entityKey && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Entidade: <strong>{entityKey}</strong>
            {data && (
              <>
                {' '}
                — {data.total} linha(s) no snapshot
                {data.syncedAt && (
                  <> · última sync: {new Date(data.syncedAt).toLocaleString('pt-BR')}</>
                )}
              </>
            )}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        )}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        {!loading && data && data.total === 0 && (
          <Typography color="text.secondary" variant="body2">
            Nenhum registro nesta entidade após a última sincronização.
          </Typography>
        )}
        {!loading && data && data.total > 0 && data.columns.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Colunas inferidas dos dados (primeiras chaves dos objetos). Valores complexos aparecem como JSON.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Mostrando {data.offset + 1}–{data.offset + data.rows.length} de {data.total}
            </Typography>
            <TableContainer sx={{ maxHeight: 420, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>#</TableCell>
                    {data.columns.map((c) => (
                      <TableCell key={c} sx={{ fontWeight: 700, bgcolor: 'action.hover', whiteSpace: 'nowrap' }}>
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={data.offset + i} hover>
                      <TableCell sx={{ color: 'text.secondary', width: 48 }}>{data.offset + i + 1}</TableCell>
                      {data.columns.map((c) => (
                        <TableCell
                          key={c}
                          sx={{
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: row[c]?.length > 80 ? 'monospace' : 'inherit',
                            fontSize: row[c]?.length > 80 ? '0.75rem' : 'inherit',
                          }}
                          title={row[c] || undefined}
                        >
                          {row[c] === '' ? '—' : row[c]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box display="flex" gap={1} alignItems="center" sx={{ mt: 2 }}>
              <Button size="small" disabled={!hasPrev} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button size="small" disabled={!hasNext} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                Próxima
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
