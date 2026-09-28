import { useEffect, useMemo, useState } from 'react'
import { Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { Timer } from 'lucide-react'
import {
  isItemCancelado,
  isItemConcluidoProducao,
} from '../../types/dashboardIndicators'
import {
  getDataReferenciaConclusao,
  getExecutionEndDate,
  getExecutionStartDate,
} from '../../utils/dashboardFilters'
import {
  evaluateTicketProdutividade,
  type ProdutividadeRegraRow,
  type TicketProdutividadeDims,
} from '../../pages/produtividadeMatching'
import {
  evaluateTicketSla,
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
  formatSlaStatusLabel,
  type ChamadoSlaResult,
  type SlaRegraRow,
} from '../../pages/slaMatching'
import { SLA_STATUS_PAUSA_LABEL, type SlaStatusEvent } from '../../pages/slaCalendar'
import {
  loadProdutividadeRegras,
  loadSlaRegras,
  loadStatusEventsForTicket,
  type SlaTicketPageKey,
} from '../../pages/slaData'
import { getSlaImpactoColor, getSlaImpactoLabel } from '../../pages/slaImpact'
import { JORNADA_UTIL_SEGUNDOS } from '../../pages/produtividadeJornada'
import { TempoAdicionalSection } from './TempoAdicionalSection'

const EXTRACT: Record<SlaTicketPageKey, (item: any) => TicketProdutividadeDims> = {
  demandas: extractDemandaDims,
  manutencoes: extractManutencaoDims,
  atendimentos: extractAtendimentoDims,
  validacoes: extractValidacaoDims,
  reajustes: extractReajusteDims,
  analytics: extractAnalyticsDims,
}

type Props = {
  pageKey: SlaTicketPageKey
  item: any
  embedded?: boolean
}

function fmtHoras(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

function fmtDuracaoUtil(seconds: number): string {
  if (seconds < JORNADA_UTIL_SEGUNDOS) return fmtHoras(seconds)
  const dias = Math.round((seconds / JORNADA_UTIL_SEGUNDOS) * 100) / 100
  const diasLabel = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(dias)
  return `${diasLabel} ${dias === 1 ? 'dia útil' : 'dias úteis'} (${fmtHoras(seconds)})`
}

function fmtDataHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusColor(
  status: ChamadoSlaResult['status']
): 'success' | 'error' | 'warning' | 'info' | 'default' {
  if (status === 'dentro' || status === 'no_prazo') return 'success'
  if (status === 'fora' || status === 'atrasado') return 'error'
  if (status === 'pausado') return 'info'
  if (status === 'sem_execucao') return 'warning'
  return 'default'
}

function statusDetalhe(r: ChamadoSlaResult, statusChamado: unknown): string | null {
  const saldo = r.saldoSeconds
  if (saldo == null) return null
  switch (r.status) {
    case 'pausado': {
      const motivo = `Relógio parado enquanto o chamado está em "${String(statusChamado ?? '').trim()}"`
      return saldo >= 0
        ? `${motivo}. Restam ${fmtHoras(saldo)} úteis.`
        : `${motivo}. Prazo já excedido em ${fmtHoras(Math.abs(saldo))} úteis.`
    }
    case 'no_prazo':
      return `Vence em ${fmtHoras(Math.max(0, saldo))} úteis`
    case 'atrasado':
      return `Atrasado há ${fmtHoras(Math.abs(Math.min(0, saldo)))} úteis`
    case 'fora':
      return saldo < 0 ? `Excedeu ${fmtHoras(Math.abs(saldo))} úteis` : 'Concluído após a data limite'
    case 'dentro':
      return saldo > 0 ? `Folga de ${fmtHoras(saldo)} úteis` : 'Concluído até a data limite'
    default:
      return null
  }
}

function Linha({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right', minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

export function SlaChamadoCard({ pageKey, item, embedded }: Props) {
  const [slaRules, setSlaRules] = useState<SlaRegraRow[] | null>(null)
  const [prodRules, setProdRules] = useState<ProdutividadeRegraRow[]>([])
  const [events, setEvents] = useState<SlaStatusEvent[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => new Date())

  const itemId = item?.id ? String(item.id) : ''
  const itemStatus = item?.status

  useEffect(() => {
    let alive = true
    Promise.all([loadSlaRegras(), loadProdutividadeRegras().catch(() => [])])
      .then(([sla, prod]) => {
        if (!alive) return
        setSlaRules(sla)
        setProdRules(prod)
      })
      .catch((e) => alive && setErro(e?.message ?? 'Erro ao carregar regras de SLA'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!itemId) return
    let alive = true
    loadStatusEventsForTicket(pageKey, itemId)
      .then((ev) => alive && setEvents(ev))
      .catch(() => alive && setEvents([]))
    return () => {
      alive = false
    }
  }, [pageKey, itemId, itemStatus])

  const cancelado = item ? isItemCancelado(pageKey, item) : false
  const concluido = item ? isItemConcluidoProducao(pageKey, item) : false

  useEffect(() => {
    if (concluido || cancelado) return
    const t = window.setInterval(() => setAgora(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [concluido, cancelado])

  const calc = useMemo(() => {
    if (!item || !slaRules || events == null) return null
    const dims = EXTRACT[pageKey](item)
    const dataInicio = getExecutionStartDate(pageKey, item) || null
    const dataFinal = getExecutionEndDate(pageKey, item) || null
    const dataConclusao = getDataReferenciaConclusao(pageKey, item) || ''
    const sla = evaluateTicketSla({
      item,
      dims,
      rules: slaRules,
      dataConclusao,
      dataInicio,
      dataFinal,
      concluido,
      statusEvents: events,
      agora,
    })
    const prod = evaluateTicketProdutividade({
      item,
      dims,
      rules: prodRules,
      dataConclusao,
      dataInicio,
      dataFinal,
    })
    return { sla, prod }
  }, [item, slaRules, prodRules, events, pageKey, concluido, agora])

  const header = (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f766e',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <Timer size={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          SLA e prazo
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Horas úteis (seg–sex, 09h–17h); pausa em {SLA_STATUS_PAUSA_LABEL}
        </Typography>
      </Box>
    </Stack>
  )

  let body: React.ReactNode
  if (erro) {
    body = (
      <Typography variant="body2" color="error">
        {erro}
      </Typography>
    )
  } else if (cancelado) {
    body = <Chip size="small" label="Chamado cancelado/transferido — SLA não se aplica" />
  } else if (!calc) {
    body = <LinearProgress />
  } else {
    const { sla, prod } = calc
    const detalhe = statusDetalhe(sla, item?.status)
    const previsto = prod.matched && prod.tempoPrevistoSeconds > 0 ? prod.tempoPrevistoSeconds : null
    const decorrido = sla.tempoExecutadoSeconds
    const diffPrevisto =
      previsto && decorrido != null ? Math.round(((decorrido - previsto) / previsto) * 100) : null
    const pct = sla.pctConsumido
    const barColor =
      sla.status === 'fora' || sla.status === 'atrasado'
        ? 'error'
        : sla.status === 'pausado'
          ? 'info'
          : pct != null && pct >= 80 && !sla.concluido
            ? 'warning'
            : 'success'

    body = (
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            color={statusColor(sla.status)}
            label={
              sla.concluido && (sla.status === 'dentro' || sla.status === 'fora')
                ? `Concluído ${sla.status === 'dentro' ? 'dentro' : 'fora'} do prazo`
                : formatSlaStatusLabel(sla.status)
            }
          />
          {sla.impacto ? (
            <Chip
              size="small"
              variant="outlined"
              color={getSlaImpactoColor(sla.impacto) === 'default' ? undefined : (getSlaImpactoColor(sla.impacto) as any)}
              label={getSlaImpactoLabel(sla.impacto)}
            />
          ) : null}
        </Stack>
        {detalhe ? (
          <Typography variant="body2" color="text.secondary">
            {detalhe}
          </Typography>
        ) : null}

        {sla.status === 'sem_regra' ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum SLA definido para este tipo de chamado.
          </Typography>
        ) : (
          <>
            <Linha label="SLA" value={fmtDuracaoUtil(sla.prazoSlaSeconds)} />
            <Linha label="Data limite" value={fmtDataHora(sla.prazoLimite)} />
            {pct != null ? (
              <Tooltip title={`${String(pct).replace('.', ',')}% do prazo consumido`}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, pct)}
                  color={barColor}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Tooltip>
            ) : null}
          </>
        )}

        <TempoAdicionalSection
          pageKey={pageKey}
          item={item}
          tempoPrevistoSeconds={previsto}
          regraProdutividadeId={prod.regraId}
          fmtHoras={fmtHoras}
        />
        <Linha
          label={sla.concluido ? 'Tempo decorrido' : 'Decorrido até agora'}
          value={decorrido != null ? fmtHoras(decorrido) : '—'}
          hint={
            diffPrevisto != null
              ? `${diffPrevisto > 0 ? '+' : ''}${diffPrevisto}% em relação ao previsto`
              : sla.status === 'sem_execucao'
                ? 'Informe a data de início para calcular'
                : undefined
          }
        />
        {sla.tempoPausadoSeconds > 0 ? (
          <Linha label="Pausado (terceiros)" value={fmtHoras(sla.tempoPausadoSeconds)} />
        ) : null}
        {!sla.temHistoricoStatus ? (
          <Typography variant="caption" color="text.secondary">
            Sem histórico de status registrado: pausas não descontadas.
          </Typography>
        ) : null}
      </Stack>
    )
  }

  const content = (
    <>
      {header}
      {body}
    </>
  )

  if (embedded) return <Box>{content}</Box>

  return (
    <Box
      component="aside"
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.5,
        boxShadow: 1,
      }}
    >
      {content}
    </Box>
  )
}
