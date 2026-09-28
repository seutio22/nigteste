import { useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  SHARE_SECTION_LABELS,
  formatDuracao,
  summarizeShareAccess,
  visitorKey,
  type CountItem,
  type ShareAccessLog,
} from './projectShareAnalytics'

function Kpi({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {titulo}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#002561' }}>
        {valor}
      </Typography>
      {detalhe ? (
        <Typography variant="caption" color="text.secondary">
          {detalhe}
        </Typography>
      ) : null}
    </Paper>
  )
}

function Distribuicao({ titulo, itens, total }: { titulo: string; itens: CountItem[]; total: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {titulo}
      </Typography>
      {itens.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sem dados.
        </Typography>
      ) : (
        itens.map((i) => {
          const pct = total ? Math.round((i.count / total) * 100) : 0
          return (
            <Box key={i.label} sx={{ mb: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{i.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {i.count} ({pct}%)
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          )
        })
      )}
    </Paper>
  )
}

export default function ShareAnalyticsDialog({
  open,
  onClose,
  nome,
  logs,
}: {
  open: boolean
  onClose: () => void
  nome: string
  logs: ShareAccessLog[]
}) {
  const resumo = useMemo(() => summarizeShareAccess(logs), [logs])
  const visitanteNumero = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of [...logs].reverse()) if (!map.has(visitorKey(l))) map.set(visitorKey(l), map.size + 1)
    return map
  }, [logs])
  const maxSecao = Math.max(1, ...resumo.secoes.map((s) => s.seconds))
  const semMedicao = logs.filter((l) => !l.durationSeconds && !l.clickCount).length

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#002561' }}>
          Estatísticas do link
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {nome}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mb: 2, mt: 0 }}>
          <Grid item xs={6} md={2.4}>
            <Kpi titulo="Acessos" valor={String(resumo.acessos)} />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Kpi
              titulo="Visitantes únicos"
              valor={String(resumo.visitantesUnicos)}
              detalhe={`${resumo.visitantesRecorrentes} voltaram mais de uma vez`}
            />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Kpi titulo="Tempo médio na página" valor={formatDuracao(resumo.tempoMedio)} detalhe="por acesso" />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Kpi titulo="Tempo total" valor={formatDuracao(resumo.tempoTotal)} />
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Kpi titulo="Cliques" valor={String(resumo.cliquesTotal)} detalhe={`${resumo.cliquesMedio} por acesso, em média`} />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Abas mais vistas
          </Typography>
          {resumo.secoes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Ainda não há tempo registrado por aba.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Aba</TableCell>
                  <TableCell sx={{ width: '30%' }} />
                  <TableCell align="right">Tempo total</TableCell>
                  <TableCell align="right">Tempo médio</TableCell>
                  <TableCell align="right">Cliques</TableCell>
                  <TableCell align="right">Acessos que viram</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumo.secoes.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell>{s.label}</TableCell>
                    <TableCell>
                      <LinearProgress variant="determinate" value={(s.seconds / maxSecao) * 100} sx={{ height: 8, borderRadius: 4 }} />
                    </TableCell>
                    <TableCell align="right">{formatDuracao(s.seconds)}</TableCell>
                    <TableCell align="right">{formatDuracao(s.acessos ? Math.round(s.seconds / s.acessos) : 0)}</TableCell>
                    <TableCell align="right">{s.clicks}</TableCell>
                    <TableCell align="right">{s.acessos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Distribuicao titulo="Dispositivos" itens={resumo.dispositivos} total={resumo.acessos} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Distribuicao titulo="Navegadores" itens={resumo.navegadores} total={resumo.acessos} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Distribuicao titulo="Sistemas" itens={resumo.sistemas} total={resumo.acessos} />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Acessos ({logs.length})
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 380 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data e hora</TableCell>
                <TableCell>Visitante</TableCell>
                <TableCell>Dispositivo</TableCell>
                <TableCell>IP</TableCell>
                <TableCell align="right">Tempo</TableCell>
                <TableCell align="right">Cliques</TableCell>
                <TableCell>Abas vistas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(l.accessedAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Visitante {visitanteNumero.get(visitorKey(l))}</TableCell>
                  <TableCell>{[l.deviceType, l.browser, l.os].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>{l.ipAddress || '—'}</TableCell>
                  <TableCell align="right">{formatDuracao(l.durationSeconds)}</TableCell>
                  <TableCell align="right">{l.clickCount || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(l.sectionStats ?? {})
                        .filter(([, s]) => (s?.seconds ?? 0) > 0 || (s?.clicks ?? 0) > 0)
                        .sort((a, b) => (b[1]?.seconds ?? 0) - (a[1]?.seconds ?? 0))
                        .map(([k, s]) => (
                          <Chip key={k} size="small" variant="outlined" label={`${SHARE_SECTION_LABELS[k] ?? k} · ${formatDuracao(s.seconds)}`} />
                        ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      Este link ainda não foi acessado.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        {semMedicao > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {semMedicao} acesso(s) sem tempo ou cliques: anteriores a esta medição, ou fechados em poucos segundos. Visitantes sem identificação
            são agrupados por IP.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
