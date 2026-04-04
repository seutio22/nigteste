import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import NexusSnapshotPreviewDialog from './NexusSnapshotPreviewDialog'

type Row = {
  entityKey: string
  rowCount: number
  syncedAt: string | null
  lastError: string | null
}

export default function NexusSyncCard({ onSynced }: { onSynced?: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [autoMin, setAutoMin] = useState<number | null>(null)
  const [autoHint, setAutoHint] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [previewEntity, setPreviewEntity] = useState<string | null>(null)

  async function load() {
    const r = await api<{
      nexusConfigured: boolean
      autoSyncIntervalMinutes?: number
      autoSyncHint?: string
      entities: Row[]
    }>('/admin/nexus-sync/status')
    if (r.ok && r.data) {
      setConfigured(r.data.nexusConfigured)
      setAutoMin(r.data.autoSyncIntervalMinutes ?? null)
      setAutoHint(r.data.autoSyncHint ?? null)
      setRows(r.data.entities)
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function runSync() {
    setMsg(null)
    setRunning(true)
    const r = await api<{ results?: { entityKey: string; ok: boolean; rowCount?: number; error?: string }[] }>(
      '/admin/nexus-sync/run',
      { method: 'POST', body: JSON.stringify({}) }
    )
    setRunning(false)
    if (!r.ok) {
      setMsg(r.error || 'Falha na sincronização')
      return
    }
    const ok = r.data?.results?.filter((x) => x.ok).length ?? 0
    const fail = r.data?.results?.filter((x) => !x.ok).length ?? 0
    setMsg(`Sincronização concluída: ${ok} entidade(s) OK${fail ? `, ${fail} com erro` : ''}.`)
    await load()
    onSynced?.()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Sincronização com o Nexus (página Dados)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A API do portal busca os mesmos dados mestres que a tela <strong>Dados</strong> do Nexus (clientes, áreas, tipos,
        etc.) e guarda uma cópia para listas nos formulários. É preciso apontar para a <strong>API demandas</strong>{' '}
        (URL pública + JWT): no Railway do serviço <strong>portal-colaborador-api</strong>, use o painel{' '}
        <strong>Variables</strong>, ou o <strong>Railway CLI</strong> (<code>npx @railway/cli login</code> e{' '}
        <code>railway variable set …</code>), ou o script no repositório{' '}
        <code>portal-api/configure-nexus-railway.ps1</code>. Opcional:{' '}
        <code>NEXUS_SYNC_INTERVAL_MINUTES</code> (padrão <strong>15</strong>),{' '}
        <code>NEXUS_SYNC_ON_STARTUP=true</code>.
      </Typography>
      {autoHint && (
        <Typography variant="body2" color="primary.main" sx={{ mb: 1 }}>
          {autoHint}
          {autoMin != null && autoMin > 0 && (
            <span> (intervalo atual: {autoMin} min)</span>
          )}
        </Typography>
      )}
      {configured === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" component="span" display="block" fontWeight={600} gutterBottom>
            Integração Nexus ainda não configurada na API
          </Typography>
          <Typography variant="body2" component="span" color="text.secondary">
            No serviço <strong>portal-colaborador-api</strong> no Railway ainda não há <code>NEXUS_API_BASE_URL</code> (URL
            da API demandas, <strong>sem</strong> / no fim) nem <code>NEXUS_API_TOKEN</code> (JWT com leitura dos
            cadastros). Defina no painel <strong>Variables</strong>, ou com o CLI após <code>npx @railway/cli login</code> e
            link ao projeto, ou execute <code>portal-api/configure-nexus-railway.ps1 -BaseUrl "…" -Token "…"</code> no
            repositório. O Railway costuma redeployar ao salvar; depois use &quot;Sincronizar agora&quot;.
          </Typography>
        </Alert>
      )}
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => void runSync()} disabled={running}>
          {running ? 'Sincronizando…' : 'Sincronizar agora'}
        </Button>
        <Button sx={{ ml: 1 }} onClick={() => void load()} disabled={loading}>
          Atualizar lista
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Entidade</TableCell>
            <TableCell>Registros</TableCell>
            <TableCell>Última sync</TableCell>
            <TableCell>Erro</TableCell>
            <TableCell align="right">Detalhe</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5}>Carregando…</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary" variant="body2">
                  {configured === false
                    ? 'Após definir URL + token (Railway ou CLI) e o serviço subir, a tabela preenche na primeira sync.'
                    : 'Nenhum snapshot ainda. Clique em «Sincronizar agora».'}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.entityKey}>
                <TableCell>{r.entityKey}</TableCell>
                <TableCell>{r.rowCount}</TableCell>
                <TableCell>
                  {r.syncedAt ? new Date(r.syncedAt).toLocaleString('pt-BR') : '—'}
                </TableCell>
                <TableCell>
                  {r.lastError ? (
                    <Typography variant="caption" color="error">
                      {r.lastError.slice(0, 120)}
                      {r.lastError.length > 120 ? '…' : ''}
                    </Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => setPreviewEntity(r.entityKey)}>
                    Ver registros
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <NexusSnapshotPreviewDialog
        open={!!previewEntity}
        entityKey={previewEntity}
        onClose={() => setPreviewEntity(null)}
      />
    </Paper>
  )
}
