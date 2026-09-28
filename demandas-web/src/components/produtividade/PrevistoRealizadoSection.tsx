import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMasterDataStore } from '../../store/masterDataStore'
import { getPageConfig, type TipoFieldConfig } from '../../pages/produtividadePageConfig'
import type { ProdutividadeRegraRow } from '../../pages/produtividadeMatching'
import { PRODUTIVIDADE_PAGE_LABEL } from '../../pages/produtividadeMatching'
import {
  TEMPO_ADICIONAL_STATUS_LABEL,
  getMotivoLabel,
  revisarTempoAdicional,
  type TempoAdicionalRow,
} from '../../pages/tempoAdicional'
import { buildConfronto, type ConfrontoGrupo } from '../../pages/tempoAdicionalDashboard'

type Props = {
  rows: TempoAdicionalRow[]
  rules: ProdutividadeRegraRow[]
  fromDate: string
  toDate: string
  analistaId: string
  analistaNomeById: Record<string, string>
  onChanged: () => void
}

const DETAIL_BASE: Record<string, string> = {
  demandas: 'cadastro',
  manutencoes: 'manutencao',
  atendimentos: 'atendimento',
  validacoes: 'validacao',
  reajustes: 'reajuste',
  analytics: 'analytics',
}

const STATUS_COLOR = { pendente: 'warning', aprovado: 'success', rejeitado: 'default' } as const

function fmtHoras(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

function fmtPct(v: number | null): string {
  return v == null ? '—' : `+${String(v).replace('.', ',')}%`
}

function Kpi({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.25 }}>
        {value}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Paper>
  )
}

function GrupoTable({ grupos, titulo }: { grupos: ConfrontoGrupo[]; titulo: string }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{titulo}</TableCell>
            <TableCell align="right">Chamados</TableCell>
            <TableCell align="right">Previsto médio</TableCell>
            <TableCell align="right">Realizado médio</TableCell>
            <TableCell align="right">Desvio</TableCell>
            <TableCell align="right">Horas adicionais</TableCell>
            <TableCell align="right">Pendentes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {grupos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                  Nenhum tempo adicional lançado no período.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            grupos.map((g) => (
              <TableRow key={g.key || 'vazio'} hover>
                <TableCell>{g.label}</TableCell>
                <TableCell align="right">{g.chamados}</TableCell>
                <TableCell align="right">{fmtHoras(g.previstoMedioSeconds)}</TableCell>
                <TableCell align="right">{fmtHoras(g.realizadoMedioSeconds)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    variant="outlined"
                    color={g.desvioPct != null && g.desvioPct >= 30 ? 'error' : g.desvioPct != null && g.desvioPct >= 15 ? 'warning' : 'default'}
                    label={fmtPct(g.desvioPct)}
                  />
                </TableCell>
                <TableCell align="right">{fmtHoras(g.adicionalSeconds)}</TableCell>
                <TableCell align="right">{g.pendentes || '0'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function PrevistoRealizadoSection({
  rows,
  rules,
  fromDate,
  toDate,
  analistaId,
  analistaNomeById,
  onChanged,
}: Props) {
  const md = useMasterDataStore()
  const [tab, setTab] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  const regraLabel = useMemo(() => {
    const byId = new Map(rules.map((r) => [r.id, r]))
    const tipo = (cfg: TipoFieldConfig | null, value: string | null | undefined) => {
      if (!cfg || !value) return null
      if (cfg.source === 'enum') return cfg.options.find((o) => o.value === value)?.label ?? value
      const list = ((md as any)[cfg.catalog] || []) as { id: string; nome?: string }[]
      return list.find((c) => c.id === value)?.nome ?? value
    }
    return (regraId: string | null) => {
      if (!regraId) return 'Sem regra de produtividade'
      const r = byId.get(regraId)
      if (!r) return 'Regra removida'
      const cfg = getPageConfig(r.pageKey)
      const page = PRODUTIVIDADE_PAGE_LABEL[r.pageKey as keyof typeof PRODUTIVIDADE_PAGE_LABEL] || cfg.label
      return [page, tipo(cfg.tipo1, r.tipo1Id), tipo(cfg.tipo2, r.tipo2Id)].filter(Boolean).join(' · ')
    }
  }, [rules, md])

  const summary = useMemo(
    () =>
      buildConfronto({
        rows,
        fromDate,
        toDate,
        analistaIdFilter: analistaId || null,
        regraLabel,
        analistaLabel: (id) => (id ? analistaNomeById[id] || id : 'Sem analista'),
      }),
    [rows, fromDate, toDate, analistaId, regraLabel, analistaNomeById]
  )

  const revisar = async (r: TempoAdicionalRow, status: 'aprovado' | 'rejeitado') => {
    let comentario: string | undefined
    if (status === 'rejeitado') {
      const txt = window.prompt('Motivo da rejeição (opcional):') 
      if (txt === null) return
      comentario = txt.trim() || undefined
    }
    setBusyId(r.id)
    try {
      await revisarTempoAdicional(r.id, status, comentario)
      onChanged()
    } catch (e: any) {
      window.alert(e?.message ?? 'Erro ao revisar o lançamento.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', mt: 3 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Previsto × realizado
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Tempos adicionais lançados nos chamados no período. Realizado = previsto da regra + adicionais não
          rejeitados. Só os aprovados entram na produção oficial acima.
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Kpi
              title="Chamados com adicional"
              value={String(summary.chamadosComAdicional)}
              subtitle={`${summary.totalLancamentos} lançamento(s)`}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <Kpi title="Horas adicionais" value={fmtHoras(summary.adicionalSeconds)} subtitle="Aprovadas + pendentes" />
          </Grid>
          <Grid item xs={6} md={3}>
            <Kpi
              title="Desvio sobre o previsto"
              value={fmtPct(summary.desvioPct)}
              subtitle={`Previsto desses chamados: ${fmtHoras(summary.previstoSeconds)}`}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <Kpi title="Aguardando aprovação" value={String(summary.pendentes)} subtitle="Lançamentos pendentes" />
          </Grid>
        </Grid>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Por regra" sx={{ textTransform: 'none' }} />
        <Tab label="Por analista" sx={{ textTransform: 'none' }} />
        <Tab label="Por motivo" sx={{ textTransform: 'none' }} />
        <Tab label={`Lançamentos (${summary.totalLancamentos})`} sx={{ textTransform: 'none' }} />
      </Tabs>

      {tab === 0 ? <GrupoTable grupos={summary.porRegra} titulo="Regra (página · tipos)" /> : null}
      {tab === 1 ? <GrupoTable grupos={summary.porAnalista} titulo="Analista" /> : null}
      {tab === 2 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Motivo</TableCell>
                <TableCell align="right">Lançamentos</TableCell>
                <TableCell align="right">Horas adicionais</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.porMotivo.map((m) => (
                <TableRow key={m.motivo} hover>
                  <TableCell>{getMotivoLabel(m.motivo)}</TableCell>
                  <TableCell align="right">{m.lancamentos}</TableCell>
                  <TableCell align="right">{fmtHoras(m.adicionalSeconds)}</TableCell>
                </TableRow>
              ))}
              {summary.porMotivo.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                      Nenhum tempo adicional lançado no período.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
      {tab === 3 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Analista</TableCell>
                <TableCell>Regra</TableCell>
                <TableCell align="right">Previsto</TableCell>
                <TableCell align="right">Adicional</TableCell>
                <TableCell>Motivo / justificativa</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.lancamentos.map((r) => {
                const base = DETAIL_BASE[r.pageKey]
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {base ? (
                        <Link component={RouterLink} to={`/${base}/${encodeURIComponent(r.entityId)}`} underline="hover">
                          {r.ticket || 'Abrir chamado'}
                        </Link>
                      ) : (
                        r.ticket || '—'
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {new Date(r.createdAt).toLocaleDateString('pt-BR')} · {r.userNome || 'Usuário'}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.analistaId ? analistaNomeById[r.analistaId] || r.analistaId : '—'}</TableCell>
                    <TableCell>{regraLabel(r.regraProdutividadeId)}</TableCell>
                    <TableCell align="right">{r.tempoPrevistoSeconds ? fmtHoras(r.tempoPrevistoSeconds) : '—'}</TableCell>
                    <TableCell align="right">+{fmtHoras(r.adicionalSeconds)}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                        {getMotivoLabel(r.motivo)}
                      </Typography>
                      <Tooltip title={r.justificativa}>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {r.justificativa}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS_COLOR[r.status]} label={TEMPO_ADICIONAL_STATUS_LABEL[r.status]} />
                      {r.comentarioRevisao ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {r.comentarioRevisao}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">
                      {r.status === 'pendente' ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            color="success"
                            variant="outlined"
                            disabled={busyId === r.id}
                            onClick={() => revisar(r, 'aprovado')}
                            sx={{ textTransform: 'none' }}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={busyId === r.id}
                            onClick={() => revisar(r, 'rejeitado')}
                            sx={{ textTransform: 'none' }}
                          >
                            Rejeitar
                          </Button>
                        </Stack>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
              {summary.lancamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                      Nenhum tempo adicional lançado no período.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Paper>
  )
}
