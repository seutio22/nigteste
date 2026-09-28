import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FolderKanban,
  Maximize2,
  Minimize2,
  RefreshCw,
  Ticket,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useDemandStore } from '../../store/demandStore'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useValidationStore } from '../../store/validationStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useReportStore } from '../../store/reportStore'
import { useProjectStore } from '../../store/projectStore'
import { resolveLinkedAnalistaId } from '../../utils/dashboardUserScope'
import { resolveProjectAnalistaValue } from '../../utils/dashboardFilters'
import { getProjectStatusLabel } from '../../utils/projectStatusLabels'
import {
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
  formatSlaStatusLabel,
  type SlaRegraRow,
} from '../../pages/slaMatching'
import { loadSlaRegras, loadStatusEventsByPage, type SlaTicketPageKey } from '../../pages/slaData'
import type { SlaStatusEvent } from '../../pages/slaCalendar'
import {
  FILA_COLUNAS,
  buildProjectFilaItems,
  buildTicketFilaItems,
  classifyPrazo,
  dayKey,
  sortFila,
  type FilaColuna,
  type FilaItem,
  type ProjetoResponsavelMatcher,
} from '../../pages/fila/filaData'

const TICKET_PAGES: SlaTicketPageKey[] = ['demandas', 'manutencoes', 'atendimentos', 'validacoes', 'reajustes', 'analytics']
const TODOS = '__todos__'
const LIMITE_COLUNA = 40

const COLUNA_COR: Record<FilaColuna, string> = {
  atrasado: '#DA3832',
  hoje: '#E5B800',
  semana: '#009FDF',
  proximas: '#00A649',
  sem_prazo: '#6b7a80',
}

const KIND_LABEL: Record<FilaItem['kind'], string> = {
  chamado: 'Chamado',
  projeto: 'Projeto',
  tarefa: 'Tarefa',
  subtarefa: 'Subtarefa',
}

function fmtPrazo(item: FilaItem): string {
  if (!item.prazo) return item.prazoFonte
  return item.prazoDiaInteiro
    ? format(item.prazo, "dd/MM/yyyy", { locale: ptBR })
    : format(item.prazo, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function statusLabel(item: FilaItem): string {
  return item.kind === 'chamado' ? item.status : getProjectStatusLabel(item.status)
}

function FilaCard({ item, cor, onOpen }: { item: FilaItem; cor: string; onOpen: (i: FilaItem) => void }) {
  const Icon = item.kind === 'chamado' ? Ticket : FolderKanban
  return (
    <Paper
      variant="outlined"
      onClick={() => onOpen(item)}
      sx={{
        p: 1.25,
        cursor: 'pointer',
        borderLeft: `4px solid ${cor}`,
        borderRadius: 1.5,
        '&:hover': { boxShadow: 2 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Icon size={14} />
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {KIND_LABEL[item.kind]} · {item.origemLabel}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
        {item.titulo}
      </Typography>
      {item.subtitulo ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }} noWrap>
          {item.subtitulo}
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75, alignItems: 'center' }}>
        <Chip size="small" variant="outlined" label={statusLabel(item)} sx={{ height: 20, fontSize: 11 }} />
        {item.slaStatus === 'pausado' || item.slaStatus === 'atrasado' ? (
          <Chip
            size="small"
            color={item.slaStatus === 'atrasado' ? 'error' : 'info'}
            label={formatSlaStatusLabel(item.slaStatus)}
            sx={{ height: 20, fontSize: 11 }}
          />
        ) : null}
      </Box>
      <Tooltip title={item.prazoFonte}>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }} color={item.prazo ? 'text.primary' : 'text.secondary'}>
          {item.prazo ? `Prazo: ${fmtPrazo(item)}` : item.prazoFonte}
        </Typography>
      </Tooltip>
    </Paper>
  )
}

export function FilaTab() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const md = useMasterDataStore()
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const reportStore = useReportStore()
  const projectStore = useProjectStore()

  const [view, setView] = useState<'kanban' | 'calendario'>('kanban')
  const [tipo, setTipo] = useState<'todos' | 'chamados' | 'projetos'>('todos')
  const [busca, setBusca] = useState('')
  const [analistaSel, setAnalistaSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rules, setRules] = useState<SlaRegraRow[]>([])
  const [statusByPage, setStatusByPage] = useState<Partial<Record<SlaTicketPageKey, Map<string, SlaStatusEvent[]>>>>({})
  const [agora, setAgora] = useState(() => new Date())
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({})
  const [mes, setMes] = useState(() => startOfMonth(new Date()))
  const [diaSel, setDiaSel] = useState<string>(() => dayKey(new Date()))
  const [telaCheia, setTelaCheia] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        demandStore.syncFromApi?.(true),
        manutencaoStore.syncFromApi?.(true),
        atendimentoStore.syncFromApi?.(true),
        validationStore.syncFromApi?.({ force: true }),
        reajusteStore.syncFromApi?.(true),
        reportStore.syncFromApi?.(true),
        projectStore.syncFromApi?.(true),
        md.syncFromApi?.({
          force: true,
          entities: ['analistas', 'tiposServico', 'tiposDemanda', 'tiposCadastro', 'padrao', 'relatorios', 'modelos', 'sistemas'] as any,
        }),
      ])
      const [regras, ...maps] = await Promise.all([
        loadSlaRegras(true).catch(() => [] as SlaRegraRow[]),
        ...TICKET_PAGES.map((p) => loadStatusEventsByPage(p).catch(() => new Map<string, SlaStatusEvent[]>())),
      ])
      setRules(regras)
      const next: Partial<Record<SlaTicketPageKey, Map<string, SlaStatusEvent[]>>> = {}
      TICKET_PAGES.forEach((p, i) => {
        next[p] = maps[i]
      })
      setStatusByPage(next)
      setAgora(new Date())
      if (results.every((r) => r.status === 'rejected')) setError('Não foi possível carregar a fila.')
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar a fila.')
    } finally {
      setLoading(false)
    }
  }, [demandStore, manutencaoStore, atendimentoStore, validationStore, reajusteStore, reportStore, projectStore, md])

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const analistas = useMemo(
    () =>
      (md.analistas || [])
        .filter((a: any) => a && a.id != null)
        .map((a: any) => ({ id: String(a.id), nome: a.nome, email: a.email })),
    [md.analistas]
  )
  const meuAnalistaId = useMemo(() => resolveLinkedAnalistaId(user, analistas), [user, analistas])

  /** Analista efetivo: null = todos (só admin). */
  const analistaId: string | null = isAdmin
    ? analistaSel === TODOS
      ? null
      : analistaSel || meuAnalistaId || null
    : meuAnalistaId || ''
  const selectValue = isAdmin ? (analistaSel ?? (meuAnalistaId || TODOS)) : ''

  const itens = useMemo((): FilaItem[] => {
    const out: FilaItem[] = []
    const extract: Record<SlaTicketPageKey, (i: any) => any> = {
      demandas: extractDemandaDims,
      manutencoes: extractManutencaoDims,
      atendimentos: extractAtendimentoDims,
      validacoes: extractValidacaoDims,
      reajustes: extractReajusteDims,
      analytics: extractAnalyticsDims,
    }
    const itemsByPage: Record<SlaTicketPageKey, any[]> = {
      demandas: demandStore.items,
      manutencoes: manutencaoStore.items,
      atendimentos: atendimentoStore.items,
      validacoes: validationStore.items,
      reajustes: reajusteStore.items,
      analytics: reportStore.items,
    }

    if (analistaId !== '') {
      for (const page of TICKET_PAGES) {
        out.push(
          ...buildTicketFilaItems({
            page,
            items: itemsByPage[page],
            extract: extract[page],
            analistaId,
            analistas,
            rules,
            statusMap: statusByPage[page],
            agora,
          })
        )
      }
    }

    let matcher: ProjetoResponsavelMatcher | null = null
    if (analistaId !== null) {
      const analista = analistas.find((a) => a.id === analistaId)
      const proprio = !isAdmin || !analistaId || analistaId === meuAnalistaId
      matcher = {
        nomes: [analista?.nome, analista?.email, ...(proprio ? [user?.name, user?.email] : [])].filter(
          (n): n is string => Boolean(n)
        ),
        isProjetoDoAnalista: (p: any) =>
          (proprio && !!user?.id && (p.managerId === user.id || p.ownerId === user.id)) ||
          (!!analistaId && resolveProjectAnalistaValue(p, analistas as any) === analistaId),
      }
    }
    out.push(...buildProjectFilaItems(projectStore.projects as any[], matcher))
    return out.sort(sortFila)
  }, [
    demandStore.items,
    manutencaoStore.items,
    atendimentoStore.items,
    validationStore.items,
    reajusteStore.items,
    reportStore.items,
    projectStore.projects,
    analistaId,
    analistas,
    rules,
    statusByPage,
    agora,
    isAdmin,
    meuAnalistaId,
    user,
    md.analistas,
  ])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return itens.filter((i) => {
      if (tipo === 'chamados' && i.kind !== 'chamado') return false
      if (tipo === 'projetos' && i.kind === 'chamado') return false
      if (!q) return true
      return [i.titulo, i.subtitulo, i.origemLabel, i.status].some((t) => t && t.toLowerCase().includes(q))
    })
  }, [itens, tipo, busca])

  const porColuna = useMemo(() => {
    const map: Record<FilaColuna, FilaItem[]> = { atrasado: [], hoje: [], semana: [], proximas: [], sem_prazo: [] }
    for (const i of filtrados) map[classifyPrazo(i, agora)].push(i)
    return map
  }, [filtrados, agora])

  const porDia = useMemo(() => {
    const map = new Map<string, FilaItem[]>()
    for (const i of filtrados) {
      if (!i.prazo) continue
      const k = dayKey(i.prazo)
      const list = map.get(k) || []
      list.push(i)
      map.set(k, list)
    }
    return map
  }, [filtrados])

  const abrir = (i: FilaItem) => {
    setTelaCheia(false)
    navigate(i.href, i.navState ? { state: i.navState } : undefined)
  }

  const semVinculo = !isAdmin && !meuAnalistaId && analistas.length > 0

  const diasCalendario = useMemo(() => {
    const start = startOfWeek(startOfMonth(mes), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(mes), { weekStartsOn: 0 })
    const days: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    return days
  }, [mes])

  const hojeKey = dayKey(agora)
  const itensDiaSel = porDia.get(diaSel) || []

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="kanban" sx={{ textTransform: 'none', gap: 0.75 }}>
            <Columns3 size={16} /> Kanban
          </ToggleButton>
          <ToggleButton value="calendario" sx={{ textTransform: 'none', gap: 0.75 }}>
            <CalendarDays size={16} /> Calendário
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as any)} sx={{ minWidth: 190 }}>
          <MenuItem value="todos">Chamados e projetos</MenuItem>
          <MenuItem value="chamados">Só chamados</MenuItem>
          <MenuItem value="projetos">Só projetos e tarefas</MenuItem>
        </TextField>
        {isAdmin ? (
          <TextField
            select
            size="small"
            label="Analista"
            value={selectValue}
            onChange={(e) => setAnalistaSel(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={TODOS}>Todos os analistas</MenuItem>
            {analistas
              .slice()
              .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
              .map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.nome || a.id}
                </MenuItem>
              ))}
          </TextField>
        ) : null}
        <TextField size="small" label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 200, flex: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshCw size={14} />}
          onClick={() => void loadAll()}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          Atualizar
        </Button>
      </Box>

      {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {semVinculo ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Seu usuário não está vinculado a um analista, por isso só aparecem projetos e tarefas em que você é responsável.
        </Alert>
      ) : null}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {filtrados.length} item(ns) em aberto. Chamados usam a data limite do SLA como prazo; projetos e tarefas usam o
        prazo do cronograma.
      </Typography>

      {view === 'kanban' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(220px, 1fr))' },
            gap: 1.5,
            overflowX: 'auto',
            alignItems: 'start',
          }}
        >
          {FILA_COLUNAS.map((c) => {
            const list = porColuna[c.key]
            const mostrarTodos = expandidas[c.key]
            const visiveis = mostrarTodos ? list : list.slice(0, LIMITE_COLUNA)
            return (
              <Paper key={c.key} variant="outlined" sx={{ bgcolor: 'grey.50', borderRadius: 2, borderTop: `3px solid ${COLUNA_COR[c.key]}` }}>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {c.label}
                  </Typography>
                  <Chip size="small" label={list.length} sx={{ height: 20, fontWeight: 700 }} />
                </Box>
                <Box sx={{ px: 1, pb: 1, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '70vh', overflowY: 'auto' }}>
                  {visiveis.map((i) => (
                    <FilaCard key={i.key} item={i} cor={COLUNA_COR[c.key]} onOpen={abrir} />
                  ))}
                  {list.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      Nada por aqui.
                    </Typography>
                  ) : null}
                  {list.length > LIMITE_COLUNA && !mostrarTodos ? (
                    <Button size="small" onClick={() => setExpandidas((s) => ({ ...s, [c.key]: true }))} sx={{ textTransform: 'none' }}>
                      Mostrar mais {list.length - LIMITE_COLUNA}
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            )
          })}
        </Box>
      ) : (
        renderCalendario(false)
      )}

      <Dialog fullScreen open={telaCheia} onClose={() => setTelaCheia(false)}>
        <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          {renderCalendario(true)}
        </Box>
      </Dialog>
    </Box>
  )

  function renderCalendario(cheio: boolean) {
    const semanas = Math.ceil(diasCalendario.length / 7)
    const maxItens = cheio ? 6 : 4
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cheio ? { xs: '1fr', md: '1fr 380px' } : { xs: '1fr', lg: '3fr 1fr' },
          gap: 2,
          alignItems: 'stretch',
          flex: cheio ? 1 : undefined,
          minHeight: 0,
        }}
      >
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <IconButton size="small" onClick={() => setMes((m) => addMonths(m, -1))}>
                <ChevronLeft size={18} />
              </IconButton>
              <Typography variant={cheio ? 'h6' : 'subtitle1'} sx={{ fontWeight: 700, flex: 1, textTransform: 'capitalize' }}>
                {format(mes, 'MMMM yyyy', { locale: ptBR })}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setMes(startOfMonth(new Date()))
                  setDiaSel(dayKey(new Date()))
                }}
                sx={{ textTransform: 'none' }}
              >
                Hoje
              </Button>
              <IconButton size="small" onClick={() => setMes((m) => addMonths(m, 1))}>
                <ChevronRight size={18} />
              </IconButton>
              <Tooltip title={cheio ? 'Sair da tela cheia' : 'Tela cheia'}>
                <IconButton size="small" onClick={() => setTelaCheia(!cheio)}>
                  {cheio ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gridTemplateRows: cheio ? `auto repeat(${semanas}, minmax(0, 1fr))` : undefined,
                flex: 1,
                minHeight: 0,
              }}
            >
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <Typography key={d} variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 0.75, fontWeight: 700 }}>
                  {d}
                </Typography>
              ))}
              {diasCalendario.map((d) => {
                const k = dayKey(d)
                const list = porDia.get(k) || []
                const atrasados = k < hojeKey ? list.length : list.filter((i) => classifyPrazo(i, agora) === 'atrasado').length
                const selecionado = k === diaSel
                return (
                  <Box
                    key={k}
                    onClick={() => setDiaSel(k)}
                    sx={{
                      minHeight: cheio ? 0 : 128,
                      overflow: 'hidden',
                      p: 0.75,
                      borderTop: 1,
                      borderRight: 1,
                      borderColor: 'divider',
                      cursor: 'pointer',
                      bgcolor: selecionado ? 'primary.50' : isSameMonth(d, mes) ? 'background.paper' : 'grey.50',
                      outline: selecionado ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: k === hojeKey ? 800 : 500,
                        color: k === hojeKey ? 'primary.main' : isSameMonth(d, mes) ? 'text.primary' : 'text.disabled',
                      }}
                    >
                      {format(d, 'd')}
                    </Typography>
                    {list.slice(0, maxItens).map((i) => (
                      <Tooltip key={i.key} title={`${i.titulo}${i.subtitulo ? ` — ${i.subtitulo}` : ''}`} placement="top">
                        <Typography
                          variant="caption"
                          noWrap
                          onClick={(e) => {
                            e.stopPropagation()
                            abrir(i)
                          }}
                          sx={{
                            display: 'block',
                            fontSize: 12,
                            px: 0.75,
                            py: 0.25,
                            mt: 0.5,
                            borderRadius: 0.75,
                            bgcolor: i.kind === 'chamado' ? 'rgba(0,159,223,0.12)' : 'rgba(0,166,73,0.12)',
                            color: atrasados && classifyPrazo(i, agora) === 'atrasado' ? 'error.main' : 'text.primary',
                            '&:hover': { filter: 'brightness(0.92)' },
                          }}
                        >
                          {i.titulo}
                        </Typography>
                      </Tooltip>
                    ))}
                    {list.length > maxItens ? (
                      <Typography variant="caption" color="primary" sx={{ fontSize: 12, px: 0.75, fontWeight: 600 }}>
                        +{list.length - maxItens} mais
                      </Typography>
                    ) : null}
                  </Box>
                )
              })}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, overflowY: 'auto', minHeight: 0, maxHeight: cheio ? undefined : 820 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'capitalize' }}>
              {format(new Date(`${diaSel}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {itensDiaSel.map((i) => (
                <FilaCard key={i.key} item={i} cor={COLUNA_COR[classifyPrazo(i, agora)]} onOpen={abrir} />
              ))}
              {itensDiaSel.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Nenhum prazo neste dia.
                </Typography>
              ) : null}
            </Box>
            {porColuna.sem_prazo.length ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                {porColuna.sem_prazo.length} item(ns) sem prazo não aparecem no calendário; veja a coluna "Sem prazo" no Kanban.
              </Typography>
            ) : null}
          </Paper>
      </Box>
    )
  }
}
