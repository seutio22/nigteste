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
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [fixingEst, setFixingEst] = useState(false)
  const [fixEstMsg, setFixEstMsg] = useState<string | null>(null)
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
    const results = r.data?.results ?? []
    const imp = results.find((x) => x.entityKey === '_import_seguros_portal')
    let impS = ''
    if (imp) {
      impS = imp.ok
        ? ` Importação → portal: ${imp.rowCount ?? 0} linha(s) nova(s) (apólices/estipulantes).`
        : ` Importação → portal falhou: ${imp.error ?? 'ver logs da API'}.`
    }
    setMsg(`Sincronização concluída: ${ok} passo(s) OK${fail ? `, ${fail} com erro` : ''}.${impS}`)
    await load()
    onSynced?.()
  }

  async function runImportSeguros(dryRun: boolean) {
    setImportMsg(null)
    setImporting(true)
    const r = await api<{
      ok?: boolean
      result?: {
        dryRun: boolean
        contratosNoSnapshot: number
        apolicesJaExistentes: number
        apolicesCriadas: number
        estipulantesCriados: number
        ignoradosSemGrupo: number
        errors: string[]
      }
    }>('/admin/nexus-sync/import-seguros', { method: 'POST', body: JSON.stringify({ dryRun }) })
    setImporting(false)
    if (!r.ok) {
      setImportMsg(r.error || 'Falha na importação')
      return
    }
    const x = r.data?.result
    if (!x) {
      setImportMsg('Resposta sem detalhe.')
      return
    }
    const errTxt = x.errors.length ? ` Erros: ${x.errors.slice(0, 3).join(' | ')}${x.errors.length > 3 ? '…' : ''}` : ''
    setImportMsg(
      dryRun
        ? `[Simulação] Contratos no snapshot: ${x.contratosNoSnapshot}. Criaria ${x.apolicesCriadas} apólice(s), ${x.estipulantesCriados} estipulante(s). Já existiam (Nexus): ${x.apolicesJaExistentes}. Sem grupo: ${x.ignoradosSemGrupo}.${errTxt}`
        : `Importação concluída. Novas apólices: ${x.apolicesCriadas}. Novos estipulantes: ${x.estipulantesCriados}. Ignoradas (já ligadas): ${x.apolicesJaExistentes}. Sem grupo: ${x.ignoradosSemGrupo}.${errTxt}`,
    )
    if (!dryRun) onSynced?.()
  }

  async function runFixContratoEstipulantes(dryRun: boolean) {
    setFixEstMsg(null)
    setFixingEst(true)
    const r = await api<{
      ok?: boolean
      result?: {
        dryRun: boolean
        gruposProcessados: number
        estipulantesRemovidos: number
        apolicesRealinhadas: number
        apolicesDuplicadasRemovidas: number
        gruposIgnorados: Array<{ grupoChave: string; grupoNome: string; motivo: string }>
        erros: string[]
      }
    }>('/admin/nexus-sync/fix-contrato-estipulantes', { method: 'POST', body: JSON.stringify({ dryRun }) })
    setFixingEst(false)
    if (!r.ok) {
      setFixEstMsg(r.error || 'Falha na correção')
      return
    }
    const x = r.data?.result
    if (!x) {
      setFixEstMsg('Resposta sem detalhe.')
      return
    }
    const ign =
      x.gruposIgnorados.length > 0
        ? ` Ignorados: ${x.gruposIgnorados
            .slice(0, 4)
            .map((g) => `${g.grupoNome}: ${g.motivo}`)
            .join(' | ')}${x.gruposIgnorados.length > 4 ? '…' : ''}.`
        : ''
    const errTxt = x.erros.length ? ` Erros: ${x.erros.slice(0, 3).join(' | ')}${x.erros.length > 3 ? '…' : ''}` : ''
    setFixEstMsg(
      dryRun
        ? `[Simulação] Grupos: ${x.gruposProcessados}. Removeria ${x.estipulantesRemovidos} estipulante(s) placeholder; realinharia ${x.apolicesRealinhadas} apólice(s); apagaria ${x.apolicesDuplicadasRemovidas} duplicada(s).${ign}${errTxt}`
        : `Correção concluída. Grupos: ${x.gruposProcessados}. Estipulantes removidos: ${x.estipulantesRemovidos}. Apólices realinhadas: ${x.apolicesRealinhadas}. Duplicadas removidas: ${x.apolicesDuplicadasRemovidas}.${ign}${errTxt}`,
    )
    if (!dryRun) onSynced?.()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Sincronização com o Nexus (página Dados)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A API do portal busca os mesmos dados mestres que a tela <strong>Dados</strong> do Nexus (clientes, áreas, tipos,
        etc.) e guarda uma cópia em <strong>PostgreSQL</strong> (tabela <code>PortalNexusEntitySnapshot</code>) para
        listas nos formulários. Para os <strong>cadastros de seguros</strong> (estipulantes e apólices), o portal usa as
        suas próprias tabelas; pode <strong>importar</strong> do snapshot Nexus como <em>ponto de partida</em> e depois
        complementar ou corrigir tudo no menu Apólices — reimportar <strong>não sobrescreve</strong> linhas já existentes.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        É preciso apontar a API para a <strong>API demandas</strong> do Nexus (URL + JWT): no Railway{' '}
        <strong>portal-colaborador-api</strong>, variáveis <code>NEXUS_API_BASE_URL</code> e <code>NEXUS_API_TOKEN</code>; opcional{' '}
        <code>NEXUS_SYNC_INTERVAL_MINUTES</code> (padrão 15), <code>NEXUS_SYNC_ON_STARTUP=true</code>. Após cada sync completa, por
        padrão corre também a importação de contratos para as tabelas do portal (menos linhas «Só Nexus»); para desligar:{' '}
        <code>NEXUS_IMPORT_SEGUROS_AFTER_SYNC=0</code>.
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
      {fixEstMsg && (
        <Alert
          severity={
            fixEstMsg.startsWith('Falha') || fixEstMsg.includes('Erros:') ? 'warning' : fixEstMsg.startsWith('[Simulação]') ? 'info' : 'success'
          }
          sx={{ mb: 2 }}
          onClose={() => setFixEstMsg(null)}
        >
          {fixEstMsg}
        </Alert>
      )}
      {importMsg && (
        <Alert
          severity={
            importMsg.startsWith('Falha') || importMsg.includes('Erros:') ? 'warning' : importMsg.startsWith('[Simulação]') ? 'info' : 'success'
          }
          sx={{ mb: 2 }}
          onClose={() => setImportMsg(null)}
        >
          {importMsg}
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
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Importar seguros Nexus → base do portal
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button
          variant="outlined"
          color="secondary"
          disabled={importing || configured === false}
          onClick={() => void runImportSeguros(true)}
        >
          {importing ? '…' : 'Simular importação'}
        </Button>
        <Button variant="outlined" disabled={importing || configured === false} onClick={() => void runImportSeguros(false)}>
          {importing ? 'Importando…' : 'Importar contratos agora'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Exige snapshots <code>contratos</code> e (recomendado) <code>clientes</code> atualizados. Só cria linhas novas.
        </Typography>
      </Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Corrigir estipulantes legados «Contrato (…)»
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Move apólices do estipulante errado (razão social que começa por <code>Contrato (</code>) para o <strong>único</strong>{' '}
        estipulante real do mesmo grupo económico e apaga os placeholders. Se houver mais do que um estipulante real no
        grupo, o grupo é ignorado (veja a mensagem após simular).
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button
          variant="outlined"
          color="secondary"
          disabled={fixingEst}
          onClick={() => void runFixContratoEstipulantes(true)}
        >
          {fixingEst ? '…' : 'Simular correção'}
        </Button>
        <Button variant="contained" color="warning" disabled={fixingEst} onClick={() => void runFixContratoEstipulantes(false)}>
          {fixingEst ? 'A corrigir…' : 'Aplicar correção na base'}
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
