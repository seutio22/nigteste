import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import BusinessIcon from '@mui/icons-material/Business'
import DescriptionIcon from '@mui/icons-material/Description'
import ListAltIcon from '@mui/icons-material/ListAlt'
import HomeWorkIcon from '@mui/icons-material/HomeWork'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import { api, getPortalApiBaseDisplay } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const DRAWER = 280

type Section = 'visao' | 'grupos' | 'estipulantes' | 'apolices' | 'itens'

type ApoliceProduto = 'SAUDE' | 'ODONTO' | 'VIDA_GRUPO' | 'OUTROS'
type ItemTipo = 'COBERTURA' | 'SERVICO' | 'CLAUSULA' | 'OUTRO'

const PRODUTO_LABEL: Record<ApoliceProduto, string> = {
  SAUDE: 'Saúde',
  ODONTO: 'Odonto',
  VIDA_GRUPO: 'Vida em grupo',
  OUTROS: 'Outros',
}

const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  COBERTURA: 'Cobertura',
  SERVICO: 'Serviço',
  CLAUSULA: 'Cláusula',
  OUTRO: 'Outro',
}

type Grupo = {
  id: string
  nome: string
  cnpj: string | null
  observacoes: string | null
  active: boolean
  _count?: { estipulantes: number }
}

/** Uma linha por empresa (cliente Nexus), com nome do grupo econômico repetido quando há várias empresas no mesmo grupo. */
type NexusEmpresaView = {
  nexusClienteId: string
  grupoEconomicoNome: string
  razaoSocial: string
  cnpj: string
  status: string
}

type Estipulante = {
  id: string
  grupoEconomicoId: string | null
  grupoEconomicoNome: string
  nexusClienteId: string | null
  razaoSocial: string
  cnpj: string
  nomeFantasia: string | null
  observacoes: string | null
  active: boolean
  grupo?: { id: string; nome: string } | null
  _count?: { apolices: number }
}

type NexusContratoOpcao = {
  nexusContratoId: string
  numero: string
  codigo: string
  grupoEconomico: string
  clienteId: string
  status: string
}

type Apolice = {
  id: string
  estipulanteId: string
  nexusContratoId: string | null
  numeroApolice: string
  produto: ApoliceProduto
  fornecedor: string
  subestipulante: string
  plano: string | null
  coberturas: string | null
  vigenciaInicio: string | null
  vigenciaFim: string | null
  observacoes: string | null
  active: boolean
  estipulante?: {
    id: string
    razaoSocial: string
    grupoEconomicoNome?: string
    grupo?: { id: string; nome: string } | null
  }
  _count?: { itens: number }
}

type ApoliceLista = {
  id: string
  numeroApolice: string
  produto: ApoliceProduto
  estipulante: {
    id: string
    razaoSocial: string
    grupoEconomicoNome: string
    grupo?: { id: string; nome: string } | null
  }
}

type ApoliceItem = {
  id: string
  apoliceId: string
  tipo: ItemTipo
  descricao: string
  detalhes: string | null
  sortOrder: number
  active: boolean
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('pt-BR')
}

function normCnpjDigits(s: string) {
  return (s || '').replace(/\D/g, '')
}

/**
 * CNPJ com pelo menos 8 dígitos para cadastrar estipulante a partir do Nexus.
 * Quando o snapshot traz "—" ou sem documento, usa o id do cliente ou um valor derivado (14 dígitos)
 * para não bloquear apólices e respeitar o unique (grupo + CNPJ) no portal.
 */
function cnpjParaCadastroEstipulanteNexus(em: Pick<NexusEmpresaView, 'nexusClienteId' | 'cnpj'>): string {
  const d = normCnpjDigits(em.cnpj)
  if (d.length >= 8) return d.length > 20 ? d.slice(0, 20) : d
  const fromId = normCnpjDigits(em.nexusClienteId)
  if (fromId.length >= 8) return fromId.length > 20 ? fromId.slice(0, 20) : fromId
  let h = 0
  for (let i = 0; i < em.nexusClienteId.length; i++) h = (h * 31 + em.nexusClienteId.charCodeAt(i)) >>> 0
  const n = 10000000000000 + (h % 8999999999999)
  return String(n).padStart(14, '0').slice(0, 14)
}

/** Linha da tabela: cadastro no portal ou empresa ainda só no Nexus (para o mesmo grupo). */
type EstipulanteTabelaRow =
  | { kind: 'portal'; e: Estipulante }
  | { kind: 'nexus'; em: NexusEmpresaView }

function mergeEstipulantesComNexus(portal: Estipulante[], nexus: NexusEmpresaView[]): EstipulanteTabelaRow[] {
  const consumedPortal = new Set<string>()
  const byClienteId = new Map<string, Estipulante>()
  for (const e of portal) {
    const id = e.nexusClienteId?.trim()
    if (id) byClienteId.set(id, e)
  }
  const out: EstipulanteTabelaRow[] = []
  for (const em of nexus) {
    const byId = em.nexusClienteId?.trim() ? byClienteId.get(em.nexusClienteId.trim()) : undefined
    const dEm = normCnpjDigits(em.cnpj)
    const byCnpj =
      !byId && dEm.length >= 8
        ? portal.find((p) => !consumedPortal.has(p.id) && normCnpjDigits(p.cnpj) === dEm)
        : undefined
    const p = byId ?? byCnpj
    if (p && !consumedPortal.has(p.id)) {
      consumedPortal.add(p.id)
      out.push({ kind: 'portal', e: p })
    } else if (!p) {
      out.push({ kind: 'nexus', em })
    }
  }
  for (const e of portal) {
    if (!consumedPortal.has(e.id)) out.push({ kind: 'portal', e })
  }
  out.sort((a, b) => {
    const ra = a.kind === 'portal' ? a.e.razaoSocial : a.em.razaoSocial
    const rb = b.kind === 'portal' ? b.e.razaoSocial : b.em.razaoSocial
    return ra.localeCompare(rb, 'pt-BR', { sensitivity: 'base' })
  })
  return out
}

/** Linha da tabela de apólices: cadastro no portal ou contrato ainda só no Nexus (mesmo estipulante / grupo). */
type ApoliceTabelaRow =
  | { kind: 'portal'; a: Apolice }
  | { kind: 'nexus'; c: NexusContratoOpcao }

function normNumeroApolice(s: string) {
  return (s || '').trim().toLowerCase()
}

function mergeApolicesComNexus(portal: Apolice[], contratos: NexusContratoOpcao[]): ApoliceTabelaRow[] {
  const consumed = new Set<string>()
  const byNexusContratoId = new Map<string, Apolice>()
  for (const a of portal) {
    const nid = a.nexusContratoId?.trim()
    if (nid) byNexusContratoId.set(nid, a)
  }
  const out: ApoliceTabelaRow[] = []
  for (const c of contratos) {
    const byId = byNexusContratoId.get(c.nexusContratoId)
    const byNum =
      !byId
        ? portal.find(
            (p) =>
              !consumed.has(p.id) &&
              !p.nexusContratoId?.trim() &&
              normNumeroApolice(p.numeroApolice) === normNumeroApolice(c.numero),
          )
        : undefined
    const p = byId ?? byNum
    if (p && !consumed.has(p.id)) {
      consumed.add(p.id)
      out.push({ kind: 'portal', a: p })
    } else if (!p) {
      out.push({ kind: 'nexus', c })
    }
  }
  for (const a of portal) {
    if (!consumed.has(a.id)) out.push({ kind: 'portal', a })
  }
  out.sort((x, y) => {
    const nx = x.kind === 'portal' ? x.a.numeroApolice : x.c.numero
    const ny = y.kind === 'portal' ? y.a.numeroApolice : y.c.numero
    return nx.localeCompare(ny, 'pt-BR', { numeric: true, sensitivity: 'base' })
  })
  return out
}

/** Nomes de grupo econômico vindos do snapshot Nexus `clientes` (vários CNPJs por grupo). */
function useNexusGruposEconomicosNomes() {
  const [nomes, setNomes] = useState<string[]>([])
  const [needsSync, setNeedsSync] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const load = useCallback(async () => {
    const r = await api<{ ok?: boolean; needsSync?: boolean; nomes?: string[]; message?: string }>(
      '/seguros/nexus/grupos-economicos-nomes',
    )
    if (!r.ok) {
      setNomes([])
      setNeedsSync(true)
      setSyncMessage(r.error ?? null)
      return
    }
    const d = r.data
    setNomes(d?.nomes ?? [])
    setNeedsSync(!!d?.needsSync || d?.ok === false)
    setSyncMessage(d?.message ?? null)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  return { nomes, needsSync, syncMessage, reloadNomes: load }
}

export default function ApolicePage() {
  const isMd = useMediaQuery((t) => t.breakpoints.up('md'))
  const { user } = useAuth()
  const isAdmin = user?.role === 'PORTAL_ADMIN'

  const [section, setSection] = useState<Section>('visao')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])

  const loadGrupos = useCallback(async () => {
    const r = await api<{ grupos: Grupo[] }>('/seguros/grupos-economicos')
    if (!r.ok) {
      setErr(r.error || 'Erro ao carregar grupos econômicos.')
      return
    }
    setGrupos(r.data?.grupos ?? [])
  }, [])

  useEffect(() => {
    void loadGrupos()
  }, [loadGrupos])

  const drawer = (
    <Box sx={{ py: 1 }}>
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
        Cadastros de seguros
      </Typography>
      <List dense sx={{ pb: 0 }}>
        <ListItemButton
          component={RouterLink}
          to="/"
          onClick={() => setMobileOpen(false)}
          sx={{ borderRadius: 1, mx: 0.5, mb: 0.5, bgcolor: 'action.hover' }}
        >
          <ArrowBackIcon sx={{ mr: 1, fontSize: 20 }} />
          <ListItemText primary="Voltar ao menu principal" secondary="Início do portal" />
        </ListItemButton>
      </List>
      <Divider sx={{ mx: 1, mb: 1 }} />
      <List dense>
        <ListItemButton selected={section === 'visao'} onClick={() => { setSection('visao'); setMobileOpen(false) }}>
          <HomeWorkIcon sx={{ mr: 1, fontSize: 20, opacity: 0.8 }} />
          <ListItemText primary="Visão geral" secondary="Consulta unificada" />
        </ListItemButton>
        <ListItemButton selected={section === 'grupos'} onClick={() => { setSection('grupos'); setMobileOpen(false) }}>
          <AccountTreeIcon sx={{ mr: 1, fontSize: 20, opacity: 0.8 }} />
          <ListItemText primary="Grupos econômicos" secondary="Incluir / editar" />
        </ListItemButton>
        <ListItemButton
          selected={section === 'estipulantes'}
          onClick={() => { setSection('estipulantes'); setMobileOpen(false) }}
        >
          <BusinessIcon sx={{ mr: 1, fontSize: 20, opacity: 0.8 }} />
          <ListItemText primary="Estipulantes" secondary="Incluir / editar" />
        </ListItemButton>
        <ListItemButton selected={section === 'apolices'} onClick={() => { setSection('apolices'); setMobileOpen(false) }}>
          <DescriptionIcon sx={{ mr: 1, fontSize: 20, opacity: 0.8 }} />
          <ListItemText primary="Apólices" secondary="Incluir / editar" />
        </ListItemButton>
        <ListItemButton selected={section === 'itens'} onClick={() => { setSection('itens'); setMobileOpen(false) }}>
          <ListAltIcon sx={{ mr: 1, fontSize: 20, opacity: 0.8 }} />
          <ListItemText primary="Itens da apólice" secondary="Incluir / editar" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {isMd ? (
        <Drawer variant="permanent" sx={{ width: DRAWER, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: DRAWER, boxSizing: 'border-box' } }}>
          {drawer}
        </Drawer>
      ) : (
        <>
          <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
            <Box sx={{ width: DRAWER }}>{drawer}</Box>
          </Drawer>
        </>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          maxWidth: { md: `calc(100% - ${DRAWER}px)` },
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button component={RouterLink} to="/" variant="outlined" size="small" startIcon={<ArrowBackIcon />}>
            Voltar ao menu principal
          </Button>
          {!isMd ? (
            <Button size="small" variant="contained" color="inherit" onClick={() => setMobileOpen(true)}>
              Menu cadastros (secções)
            </Button>
          ) : null}
        </Box>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Apólice — base cadastral
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {section === 'visao' ? (
            <>
              Na <strong>Visão geral</strong> consulta-se todo o cadastro (grupo → estipulante → apólice → itens) de forma unificada, com pesquisa e
              detalhe ao clicar numa apólice. Nas outras secções do menu incluem-se ou editam-se os dados.
            </>
          ) : (
            <>
              Estrutura em camadas para uso nas <strong>solicitações</strong>: cadastre primeiro o <strong>grupo econômico</strong>, depois o{' '}
              <strong>estipulante</strong>, em seguida a <strong>apólice</strong> e, por fim, os <strong>itens</strong> (coberturas, serviços, cláusulas).
            </>
          )}
        </Typography>

        {!isAdmin && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Apenas utilizadores com perfil <strong>administrador do portal</strong> podem incluir, editar ou excluir cadastros. Os demais podem
            consultar esta base ao abrir solicitações.
          </Alert>
        )}

        {err && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
            {err}
          </Alert>
        )}

        {section === 'visao' && (
          <VisaoGeral onError={setErr} onIrParaApolices={() => setSection('apolices')} onIrParaEstipulantes={() => setSection('estipulantes')} />
        )}
        {section === 'grupos' && <GruposSection grupos={grupos} isAdmin={isAdmin} onRefresh={loadGrupos} onError={setErr} />}
        {section === 'estipulantes' && <EstipulantesSection isAdmin={isAdmin} onError={setErr} />}
        {section === 'apolices' && <ApolicesSection isAdmin={isAdmin} onError={setErr} />}
        {section === 'itens' && <ItensSection isAdmin={isAdmin} onError={setErr} />}
      </Box>
    </Box>
  )
}

type CadastroVisaoGeralItem = {
  id: string
  tipo: ItemTipo
  descricao: string
  detalhes: string | null
  sortOrder: number
  active: boolean
}

/** Lista da visão geral: uma linha por apólice (grupo + estipulante embutidos). Itens carregam ao abrir o detalhe. */
type CadastroVisaoGeralApolice = {
  id: string
  active: boolean
  numeroApolice: string
  produto: ApoliceProduto
  fornecedor: string
  subestipulante: string
  plano: string | null
  coberturas: string | null
  vigenciaInicio: string | null
  vigenciaFim: string | null
  nexusContratoId: string | null
  observacoes: string | null
  /** ISO (para ordenar no cliente após carregar todas as páginas). */
  updatedAt?: string
  estipulante: {
    id: string
    razaoSocial: string
    grupoEconomicoNome: string
    grupoEconomicoId: string | null
    cnpj: string
    nexusClienteId: string | null
    nomeFantasia: string | null
    observacoes: string | null
    grupo: { id: string; nome: string } | null
  }
  _count?: { itens: number }
  itens?: CadastroVisaoGeralItem[]
}

/** Lista auxiliar na visão geral quando ainda não há apólices (vem em `/cadastro-visao-geral`, só na 1.ª página). */
type CadastroVisaoEstipulanteRow = {
  id: string
  active: boolean
  razaoSocial: string
  cnpj: string
  grupoEconomicoNome: string
  /** FK opcional para grupo económico local (Portal). Alinha com apólices ligadas por grupo. */
  grupoEconomicoId: string | null
  nexusClienteId: string | null
  nomeFantasia: string | null
  observacoes: string | null
  grupo: { id: string; nome: string } | null
  _count: { apolices: number }
}

function labelGrupoEconomico(e: {
  grupoEconomicoNome: string
  grupo: { id: string; nome: string } | null
}): string {
  const n = e.grupo?.nome?.trim()
  const g = e.grupoEconomicoNome?.trim()
  if (n && g && n.localeCompare(g, 'pt-BR', { sensitivity: 'base' }) !== 0) return `${g} (${n})`
  return n || g || '—'
}

function normGrupoNomeSeg(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

class UnionFindVisao {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i])
    return this.parent[i]
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
}

/** Liga linhas que partilham FK local, nome Nexus, nome do grupo portal ou CNPJ (duplicados). Mesma ideia que na API `cadastro-visao-geral`. */
function acumularLabelsGrupoVisao(
  idToLabels: Map<string, Set<string>>,
  e: {
    id: string
    grupoEconomicoNome: string
    grupoEconomicoId?: string | null
    grupo: { id: string; nome: string } | null
    cnpj: string
  },
): void {
  let set = idToLabels.get(e.id)
  if (!set) {
    set = new Set()
    idToLabels.set(e.id, set)
  }
  const geid = (e.grupoEconomicoId ?? e.grupo?.id ?? '').trim()
  if (geid) set.add(`local:${geid}`)
  const nx1 = normGrupoNomeSeg(e.grupoEconomicoNome)
  if (nx1) set.add(`nx:${nx1}`)
  const nx2 = normGrupoNomeSeg(e.grupo?.nome ?? '')
  if (nx2) set.add(`nx:${nx2}`)
  const d = normCnpjDigits(e.cnpj)
  if (d.length >= 12) set.add(`cnpj:${d}`)
}

type VisaoGrupoBloco = {
  key: string
  titulo: string
  estipulantes: CadastroVisaoEstipulanteRow[]
  apolices: CadastroVisaoGeralApolice[]
}

function agruparVisaoPorGrupo(ests: CadastroVisaoEstipulanteRow[], aps: CadastroVisaoGeralApolice[]): VisaoGrupoBloco[] {
  const idToLabels = new Map<string, Set<string>>()
  for (const e of ests) acumularLabelsGrupoVisao(idToLabels, e)
  for (const a of aps) acumularLabelsGrupoVisao(idToLabels, a.estipulante)

  const ids = [...idToLabels.keys()]
  const idToIdx = new Map(ids.map((id, i) => [id, i]))
  const uf = new UnionFindVisao(ids.length)
  const labelBuckets = new Map<string, number[]>()

  for (const [id, labels] of idToLabels) {
    const idx = idToIdx.get(id)!
    for (const lab of labels) {
      let arr = labelBuckets.get(lab)
      if (!arr) {
        arr = []
        labelBuckets.set(lab, arr)
      }
      arr.push(idx)
    }
  }
  for (const indices of labelBuckets.values()) {
    if (indices.length < 2) continue
    const head = indices[0]
    for (let k = 1; k < indices.length; k++) uf.union(head, indices[k])
  }

  const keyParaId = (id: string) => {
    const idx = idToIdx.get(id)
    if (idx === undefined) return `solo:${id}`
    return `comp:${uf.find(idx)}`
  }

  const map = new Map<string, VisaoGrupoBloco>()
  function bucket(key: string, titulo: string): VisaoGrupoBloco {
    let b = map.get(key)
    if (!b) {
      b = { key, titulo, estipulantes: [], apolices: [] }
      map.set(key, b)
    }
    return b
  }
  for (const e of ests) {
    const key = keyParaId(e.id)
    bucket(key, labelGrupoEconomico(e)).estipulantes.push(e)
  }
  for (const a of aps) {
    const key = keyParaId(a.estipulante.id)
    bucket(key, labelGrupoEconomico(a.estipulante)).apolices.push(a)
  }
  return [...map.values()].sort((x, y) => x.titulo.localeCompare(y.titulo, 'pt-BR', { sensitivity: 'base' }))
}

/** Linhas para tabela única: cada apólice = 1 linha; estipulantes sem apólice no portal = 1 linha com «—». */
type VisaoLinhaUnificada =
  | { kind: 'apolice'; a: CadastroVisaoGeralApolice }
  | { kind: 'soEstipulante'; e: CadastroVisaoEstipulanteRow }

function linhasUnificadasGrupo(g: VisaoGrupoBloco): VisaoLinhaUnificada[] {
  const comAp = new Set(g.apolices.map((x) => x.estipulante.id))
  const semPol: VisaoLinhaUnificada[] = g.estipulantes
    .filter((e) => !comAp.has(e.id))
    .map((e) => ({ kind: 'soEstipulante', e }))
  const comPol: VisaoLinhaUnificada[] = g.apolices.map((a) => ({ kind: 'apolice', a }))
  const merged = [...semPol, ...comPol]
  merged.sort((u, v) => {
    const ra = u.kind === 'apolice' ? u.a.estipulante.razaoSocial : u.e.razaoSocial
    const rb = v.kind === 'apolice' ? v.a.estipulante.razaoSocial : v.e.razaoSocial
    const c = ra.localeCompare(rb, 'pt-BR', { sensitivity: 'base' })
    if (c !== 0) return c
    if (u.kind === 'apolice' && v.kind === 'apolice') {
      return u.a.numeroApolice.localeCompare(v.a.numeroApolice, 'pt-BR')
    }
    if (u.kind === 'apolice') return -1
    if (v.kind === 'apolice') return 1
    return u.e.id.localeCompare(v.e.id)
  })
  return merged
}

function visaoMatchesQuery(q: string, parts: Array<string | null | undefined>): boolean {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return parts.some((p) => p != null && String(p).toLowerCase().includes(t))
}

/** Ordenação de apresentação após juntar páginas (ativas primeiro, depois por atualização). */
function sortVisaoApolices(rows: CadastroVisaoGeralApolice[]): CadastroVisaoGeralApolice[] {
  return [...rows].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    const ta = new Date(a.updatedAt ?? 0).getTime()
    const tb = new Date(b.updatedAt ?? 0).getTime()
    if (tb !== ta) return tb - ta
    return a.id.localeCompare(b.id)
  })
}

function visaoItensCount(a: CadastroVisaoGeralApolice): number {
  return a._count?.itens ?? a.itens?.length ?? 0
}

function VisaoGeral({
  onError,
  onIrParaApolices,
  onIrParaEstipulantes,
}: {
  onError: (s: string | null) => void
  onIrParaApolices: () => void
  onIrParaEstipulantes: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [gruposEconomicosCount, setGruposEconomicosCount] = useState<number | null>(null)
  const [estipulantesCount, setEstipulantesCount] = useState<number | null>(null)
  const [apolicesTotalCount, setApolicesTotalCount] = useState<number | null>(null)
  const [apolices, setApolices] = useState<CadastroVisaoGeralApolice[]>([])
  const [estipulantesVisao, setEstipulantesVisao] = useState<CadastroVisaoEstipulanteRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [detailAp, setDetailAp] = useState<CadastroVisaoGeralApolice | null>(null)
  const [detailItensLoading, setDetailItensLoading] = useState(false)
  /** `true` só após JSON válido com `apolices` array (evita mensagem “base vazia” quando a API falhou). */
  const [visaoLoadOk, setVisaoLoadOk] = useState(false)
  const [loadHint, setLoadHint] = useState<string | null>(null)
  const [healthBusy, setHealthBusy] = useState(false)
  const [healthHint, setHealthHint] = useState<string | null>(null)

  const VISAO_PAGE = 8000

  const testApiHealth = useCallback(async () => {
    setHealthBusy(true)
    setHealthHint(null)
    const r = await api<{ status?: string; service?: string }>('/health')
    setHealthBusy(false)
    if (r.ok && r.data?.service) {
      setHealthHint(`Ligação OK — ${r.data.service} (${r.data.status ?? 'ok'})`)
    } else if (r.ok) {
      setHealthHint('Ligação OK — /health respondeu.')
    } else {
      setHealthHint(r.error || `Falhou (HTTP ${r.status})`)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setVisaoLoadOk(false)
    setLoadHint(null)
    onError(null)
    try {
      let offset = 0
      const merged: CadastroVisaoGeralApolice[] = []
      let estipulantesDaApi: CadastroVisaoEstipulanteRow[] = []
      let gruposEconomicosCount = 0
      let estipulantesCount = 0
      let apolicesTotalCount = 0

      while (true) {
        if (offset > 0) {
          setLoadHint(`A carregar todas as apólices… ${merged.length} recebidas até agora`)
        }
        const r = await api<{
          gruposEconomicosCount: number
          estipulantesCount: number
          apolicesTotalCount: number
          apolices: CadastroVisaoGeralApolice[]
          estipulantes?: CadastroVisaoEstipulanteRow[]
          visaoMeta?: { limit: number; offset: number; returned: number }
        }>(`/seguros/cadastro-visao-geral?limit=${VISAO_PAGE}&offset=${offset}`)

        if (!r.ok) {
          onError(r.error || 'Erro ao carregar visão geral do cadastro.')
          setApolices([])
          setEstipulantesVisao([])
          setGruposEconomicosCount(null)
          setEstipulantesCount(null)
          setApolicesTotalCount(null)
          return
        }
        if (!r.data || typeof r.data !== 'object') {
          onError('Resposta vazia ou inválida da API.')
          setApolices([])
          setEstipulantesVisao([])
          setGruposEconomicosCount(null)
          setEstipulantesCount(null)
          setApolicesTotalCount(null)
          return
        }
        const d = r.data
        if (!Array.isArray(d.apolices)) {
          onError(
            'A API devolveu um formato anómalo (sem lista de apólices). Confirme o deploy da API portal-colaborador no Railway e a variável VITE_API_URL no Vercel (URL da API, não do site).',
          )
          setApolices([])
          setEstipulantesVisao([])
          setGruposEconomicosCount(null)
          setEstipulantesCount(null)
          setApolicesTotalCount(null)
          return
        }
        gruposEconomicosCount = d.gruposEconomicosCount ?? 0
        estipulantesCount = d.estipulantesCount ?? 0
        apolicesTotalCount = d.apolicesTotalCount ?? 0
        if (offset === 0 && Array.isArray(d.estipulantes)) {
          estipulantesDaApi = d.estipulantes
        }
        merged.push(...d.apolices)

        const chunk = d.apolices.length
        if (chunk < VISAO_PAGE || merged.length >= apolicesTotalCount) break
        offset += VISAO_PAGE
        if (offset > 2_000_000) {
          onError('Limite interno de paginação atingido.')
          break
        }
      }

      setLoadHint(null)
      setVisaoLoadOk(true)
      setGruposEconomicosCount(gruposEconomicosCount)
      setEstipulantesCount(estipulantesCount)
      setApolicesTotalCount(apolicesTotalCount)
      setEstipulantesVisao(estipulantesDaApi)
      setApolices(sortVisaoApolices(merged))
    } finally {
      setLoading(false)
      setLoadHint(null)
    }
  }, [onError])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = useCallback(
    (a: CadastroVisaoGeralApolice) => {
      setDetailAp({ ...a, itens: [] })
      setDetailItensLoading(true)
      onError(null)
      void (async () => {
        const r = await api<{ itens: CadastroVisaoGeralItem[] }>(`/seguros/apolices/${a.id}/itens`)
        setDetailItensLoading(false)
        if (!r.ok) {
          onError(r.error || 'Erro ao carregar itens da apólice.')
          setDetailAp((prev) => (prev && prev.id === a.id ? { ...prev, itens: [] } : prev))
          return
        }
        const list = r.data?.itens ?? []
        setDetailAp((prev) => (prev && prev.id === a.id ? { ...prev, itens: list } : prev))
      })()
    },
    [onError],
  )

  const filterAp = useMemo(() => {
    if (!searchTerm.trim()) return apolices
    return apolices.filter((a) =>
      visaoMatchesQuery(searchTerm, [
        a.numeroApolice,
        PRODUTO_LABEL[a.produto],
        a.fornecedor,
        a.subestipulante,
        a.plano,
        a.coberturas,
        a.nexusContratoId,
        a.observacoes,
        a.estipulante.razaoSocial,
        a.estipulante.cnpj,
        a.estipulante.grupoEconomicoNome,
        a.estipulante.nomeFantasia,
        a.estipulante.observacoes,
        a.estipulante.nexusClienteId,
        labelGrupoEconomico(a.estipulante),
      ]),
    )
  }, [apolices, searchTerm])

  const filterEst = useMemo(() => {
    if (!searchTerm.trim()) return estipulantesVisao
    return estipulantesVisao.filter((e) =>
      visaoMatchesQuery(searchTerm, [
        e.razaoSocial,
        e.cnpj,
        e.grupoEconomicoNome,
        e.nexusClienteId,
        e.nomeFantasia,
        e.observacoes,
        labelGrupoEconomico(e),
      ]),
    )
  }, [estipulantesVisao, searchTerm])

  const semApolicesComEstipulantes =
    visaoLoadOk && (apolicesTotalCount ?? 0) === 0 && estipulantesVisao.length > 0

  /** Se a base tem pelo menos uma apólice, um grupo com 0 pode indicar desalinhamento de chave; se o total global é 0, os zeros são esperados (sem cor de alerta nas linhas). */
  const existeAlgumaApoliceNaBase = (apolicesTotalCount ?? 0) > 0

  const gruposVisao = useMemo(
    () => agruparVisaoPorGrupo(filterEst, filterAp),
    [filterEst, filterAp],
  )
  const temConteudoVisao = gruposVisao.length > 0

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <strong>Visão por grupo económico.</strong> Na tabela abaixo,{' '}
          <strong>cada linha liga grupo + estipulante + apólice</strong> (quando não há apólice na base do portal para aquele estipulante, o nº e dados do seguro aparecem como «—»). Os números no cabeçalho do accordeão são totais
          naquele grupo. Na base PostgreSQL, as apólices vivem em <strong>PortalSeguroApolice</strong>, ligadas ao estipulante; contratos só no Nexus não aparecem até serem cadastrados aqui (menu Apólices).
        </Alert>

        <TextField
          fullWidth
          size="small"
          placeholder="Pesquisar por grupo, estipulante, CNPJ, nº apólice, produto, fornecedor…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Na base: <strong>{loading ? '…' : (gruposEconomicosCount ?? '—')}</strong> grupos (cadastro local){' · '}
            <strong>{loading ? '…' : (estipulantesCount ?? '—')}</strong> estipulantes ·{' '}
            <strong>{loading ? '…' : (apolicesTotalCount ?? '—')}</strong> apólices na base do portal (total)
            {' · '}
            <strong>{loading ? '…' : filterAp.length}</strong> apólice(s) no filtro ·{' '}
            <strong>{loading ? '…' : filterEst.length}</strong> estipulante(s) no filtro ·{' '}
            <strong>{loading ? '…' : gruposVisao.length}</strong> grupo(s) distinto(s) na vista
            {visaoLoadOk && apolicesTotalCount != null && apolices.length === apolicesTotalCount && apolicesTotalCount > 0 ? (
              <span> · apólices carregadas: {apolices.length}</span>
            ) : null}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            «Grupos (cadastro local)» é só a tabela PortalGrupoEconomico; o agrupamento na vista usa sempre o vínculo do estipulante (UUID do grupo local ou nome Nexus).
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
            API em uso neste browser:{' '}
            <Box component="span" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {getPortalApiBaseDisplay()}
            </Box>
          </Typography>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography color="text.secondary">A carregar cadastro…</Typography>
            {loadHint ? (
              <Typography variant="body2" color="text.secondary">
                {loadHint}
              </Typography>
            ) : null}
          </Box>
        ) : !temConteudoVisao ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!visaoLoadOk ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">
                  Não foi possível carregar a lista. Veja o alerta de erro acima (URL da API, deploy ou sessão).
                </Typography>
              </Paper>
            ) : searchTerm.trim() ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">
                  Nenhum grupo, estipulante ou apólice corresponde ao filtro «{searchTerm.trim()}».
                </Typography>
              </Paper>
            ) : (apolicesTotalCount ?? 0) > 0 && apolices.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">
                  O total na base indica apólices, mas a lista veio vazia. Recarregue a página; se persistir, verifique o deploy da API.
                </Typography>
              </Paper>
            ) : (estipulantesVisao.length ?? 0) === 0 && (apolicesTotalCount ?? 0) === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">
                  Ainda não há estipulantes nem apólices nesta base. No menu, cadastre grupo económico → estipulante → apólice (perfil administrador).
                </Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">Sem dados para mostrar neste estado.</Typography>
              </Paper>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {semApolicesComEstipulantes ? (
              <>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <strong>Total de apólices nesta API = 0</strong> (tabela <strong>PortalSeguroApolice</strong> vazia nesta base PostgreSQL). Grupos e estipulantes podem existir no cadastro, mas sem linhas de apólice o
                  portal não tem o que vincular: crie apólices no menu <strong>Apólices</strong> (ou fluxo que grave na <strong>mesma</strong> API). Contratos só no Nexus não aparecem aqui. Se o teste abaixo der certo e o
                  total continuar 0, esta API realmente não tem apólices — não é só o URL errado.
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" component="div">
                      <strong>URL da API neste browser:</strong>{' '}
                      <Box component="code" sx={{ display: 'block', wordBreak: 'break-all', mt: 0.5, fontSize: '0.85rem' }}>
                        {getPortalApiBaseDisplay()}
                      </Box>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                      <Button variant="outlined" size="small" disabled={healthBusy} onClick={() => void testApiHealth()}>
                        {healthBusy ? 'A testar…' : 'Testar GET /health'}
                      </Button>
                      {healthHint ? (
                        <Typography variant="body2" color={healthHint.startsWith('Ligação OK') ? 'success.main' : 'error.main'}>
                          {healthHint}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Em produção, <code>VITE_API_URL</code> define essa URL no <strong>build</strong> (Vercel → variáveis → redeploy do portal). Não pode ser o domínio do site nem a API do Nexus.
                    </Typography>
                  </Box>
                </Alert>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="contained" size="small" onClick={onIrParaApolices}>
                    Ir para Apólices
                  </Button>
                  <Button variant="outlined" size="small" onClick={onIrParaEstipulantes}>
                    Ir para Estipulantes
                  </Button>
                </Box>
              </>
            ) : null}

            {gruposVisao.map((g) => (
              <Accordion
                key={g.key}
                defaultExpanded
                disableGutters
                elevation={0}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', py: 0.5 }}>
                    <Typography fontWeight={800}>{g.titulo}</Typography>
                    <Chip
                      size="small"
                      label={`${g.apolices.length} apólice(s)`}
                      variant={g.apolices.length === 0 ? 'outlined' : 'filled'}
                      color={g.apolices.length === 0 ? 'default' : 'primary'}
                    />
                    <Chip size="small" label={`${g.estipulantes.length} estipulante(s)`} variant="outlined" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.estipulantes.length > 0 || g.apolices.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
                        Grupo · estipulante · apólice (uma linha)
                      </Typography>
                      <TableContainer sx={{ maxHeight: 420 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Grupo económico</TableCell>
                              <TableCell>Situação</TableCell>
                              <TableCell>Estipulante</TableCell>
                              <TableCell>CNPJ</TableCell>
                              <TableCell>Nº apólice</TableCell>
                              <TableCell>Produto</TableCell>
                              <TableCell>Fornecedor</TableCell>
                              <TableCell>Vigência</TableCell>
                              <TableCell align="center">Apólices no grupo</TableCell>
                              <TableCell align="center">Itens</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {linhasUnificadasGrupo(g).map((row) => {
                              if (row.kind === 'apolice') {
                                const estRow = g.estipulantes.find((x) => x.id === row.a.estipulante.id)
                                const cntGrupo = estRow?._count.apolices ?? 0
                                return (
                                <TableRow
                                  key={`ap-${row.a.id}`}
                                  hover
                                  onClick={() => openDetail(row.a)}
                                  sx={{
                                    cursor: 'pointer',
                                    opacity: row.a.active ? 1 : 0.78,
                                    bgcolor: row.a.active ? 'inherit' : 'action.hover',
                                    '&:hover': { bgcolor: 'action.selected' },
                                  }}
                                >
                                  <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                    <Typography variant="body2">{g.titulo}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ verticalAlign: 'middle' }}>
                                    <Chip
                                      size="small"
                                      label={row.a.active ? 'Apólice ativa' : 'Apólice inativa'}
                                      color={row.a.active ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 220, verticalAlign: 'top' }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {row.a.estipulante.razaoSocial}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ verticalAlign: 'top' }}>{row.a.estipulante.cnpj}</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top', fontWeight: 600 }}>{row.a.numeroApolice}</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top' }}>{PRODUTO_LABEL[row.a.produto]}</TableCell>
                                  <TableCell sx={{ maxWidth: 120, verticalAlign: 'top' }}>{row.a.fornecedor}</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                    {fmtDate(row.a.vigenciaInicio)} — {fmtDate(row.a.vigenciaFim)}
                                  </TableCell>
                                  <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                    <Chip
                                      size="small"
                                      label={cntGrupo}
                                      variant="outlined"
                                      color={
                                        existeAlgumaApoliceNaBase && cntGrupo === 0 ? 'warning' : 'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                    <Chip size="small" label={`${visaoItensCount(row.a)}`} variant="outlined" />
                                  </TableCell>
                                </TableRow>
                              )
                              }
                              return (
                                <TableRow
                                  key={`est-${row.e.id}`}
                                  hover
                                  sx={{ bgcolor: 'action.hover', opacity: 0.95 }}
                                >
                                  <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                    <Typography variant="body2">{g.titulo}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={row.e.active ? 'Estipulante ativo' : 'Estipulante inativo'}
                                      color={row.e.active ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 220, verticalAlign: 'top' }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {row.e.razaoSocial}
                                    </Typography>
                                    {row.e.nomeFantasia ? (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {row.e.nomeFantasia}
                                      </Typography>
                                    ) : null}
                                  </TableCell>
                                  <TableCell sx={{ verticalAlign: 'top' }}>{row.e.cnpj}</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>—</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>—</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>—</TableCell>
                                  <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>—</TableCell>
                                  <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                    <Chip
                                      size="small"
                                      label={row.e._count.apolices}
                                      variant="outlined"
                                      color={
                                        existeAlgumaApoliceNaBase && row.e._count.apolices === 0 ? 'warning' : 'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ verticalAlign: 'top', color: 'text.secondary' }}>
                                    —
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ) : null}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Box>

      <Drawer
        anchor="right"
        open={detailAp != null}
        onClose={() => {
          setDetailAp(null)
          setDetailItensLoading(false)
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520, md: 580 }, maxWidth: '100%' } }}
      >
        {detailAp ? (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Apólice {detailAp.numeroApolice}
                </Typography>
                <Chip
                  size="small"
                  sx={{ mt: 0.5 }}
                  label={detailAp.active ? 'Ativa' : 'Inativa'}
                  color={detailAp.active ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>
              <IconButton
                aria-label="Fechar"
                onClick={() => {
                  setDetailAp(null)
                  setDetailItensLoading(false)
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Grupo económico
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {labelGrupoEconomico(detailAp.estipulante)}
              {detailAp.estipulante.grupo?.nome ? (
                <>
                  <br />
                  <Typography component="span" variant="caption" color="text.secondary">
                    Grupo local (Portal): {detailAp.estipulante.grupo.nome}
                  </Typography>
                </>
              ) : null}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Estipulante
            </Typography>
            <Typography variant="body2">
              <strong>{detailAp.estipulante.razaoSocial}</strong>
              <br />
              CNPJ: {detailAp.estipulante.cnpj}
              <br />
              Cliente Nexus: {detailAp.estipulante.nexusClienteId ?? '—'}
              <br />
              Nome fantasia: {detailAp.estipulante.nomeFantasia ?? '—'}
              <br />
              Observações: {detailAp.estipulante.observacoes ?? '—'}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Apólice
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Produto: {PRODUTO_LABEL[detailAp.produto]}
              <br />
              Fornecedor: {detailAp.fornecedor}
              <br />
              Subestipulante: {detailAp.subestipulante}
              <br />
              Plano: {detailAp.plano ?? '—'}
              <br />
              Coberturas: {detailAp.coberturas ?? '—'}
              <br />
              Vigência: {fmtDate(detailAp.vigenciaInicio)} — {fmtDate(detailAp.vigenciaFim)}
              <br />
              Contrato Nexus: {detailAp.nexusContratoId ?? '—'}
              <br />
              Observações: {detailAp.observacoes ?? '—'}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Itens ({detailItensLoading ? '…' : (detailAp.itens?.length ?? visaoItensCount(detailAp))})
            </Typography>
            {detailItensLoading ? (
              <Typography variant="body2" color="text.secondary">
                A carregar itens…
              </Typography>
            ) : (detailAp.itens?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem itens cadastrados.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Detalhes</TableCell>
                    <TableCell>Situação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailAp.itens ?? []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{ITEM_TIPO_LABEL[it.tipo]}</TableCell>
                      <TableCell>{it.descricao}</TableCell>
                      <TableCell>{it.detalhes ?? '—'}</TableCell>
                      <TableCell>{it.active ? 'Ativo' : 'Inativo'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setDetailAp(null)
                  setDetailItensLoading(false)
                }}
              >
                Fechar
              </Button>
            </Box>
          </Box>
        ) : null}
      </Drawer>
    </>
  )
}

function GruposSection({
  grupos,
  isAdmin,
  onRefresh,
  onError,
}: {
  grupos: Grupo[]
  isAdmin: boolean
  onRefresh: () => void
  onError: (s: string | null) => void
}) {
  const [nexusLoading, setNexusLoading] = useState(true)
  const [nexusEmpresas, setNexusEmpresas] = useState<NexusEmpresaView[]>([])
  const [nexusOk, setNexusOk] = useState(false)
  const [nexusNeedsSync, setNexusNeedsSync] = useState(false)
  const [nexusSyncedAt, setNexusSyncedAt] = useState<string | null>(null)
  const [nexusMsg, setNexusMsg] = useState<string | null>(null)
  const [nexusRowCount, setNexusRowCount] = useState<number | null>(null)

  const loadNexus = useCallback(async () => {
    setNexusLoading(true)
    onError(null)
    const r = await api<{
      ok: boolean
      needsSync?: boolean
      message?: string
      empresas: NexusEmpresaView[]
      syncedAt?: string | null
      rowCount?: number
    }>('/seguros/nexus/grupos-economicos-view')
    setNexusLoading(false)
    if (!r.ok) {
      onError(r.error || 'Erro ao carregar grupos econômicos (Nexus).')
      setNexusEmpresas([])
      setNexusOk(false)
      setNexusNeedsSync(true)
      return
    }
    const d = r.data
    setNexusEmpresas(d?.empresas ?? [])
    setNexusOk(d?.ok === true)
    setNexusNeedsSync(d?.needsSync === true)
    setNexusSyncedAt(d?.syncedAt ?? null)
    setNexusMsg(d?.message ?? null)
    setNexusRowCount(typeof d?.rowCount === 'number' ? d.rowCount : null)
  }, [onError])

  useEffect(() => {
    void loadNexus()
  }, [loadNexus])

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Grupo | null>(null)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEdit(null)
    setNome('')
    setCnpj('')
    setObservacoes('')
    setOpen(true)
  }

  function openRow(g: Grupo) {
    setEdit(g)
    setNome(g.nome)
    setCnpj(g.cnpj ?? '')
    setObservacoes(g.observacoes ?? '')
    setOpen(true)
  }

  async function save() {
    onError(null)
    setSaving(true)
    if (edit) {
      const r = await api<{ grupo: Grupo }>(`/seguros/grupos-economicos/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome, cnpj: cnpj.trim() || null, observacoes: observacoes.trim() || null }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        onRefresh()
      }
    } else {
      const r = await api<{ grupo: Grupo }>('/seguros/grupos-economicos', {
        method: 'POST',
        body: JSON.stringify({ nome, cnpj: cnpj.trim() || null, observacoes: observacoes.trim() || null }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        onRefresh()
      }
    }
  }

  async function del(id: string) {
    if (!window.confirm('Remover este grupo? Estipulantes e apólices associados serão removidos.')) return
    onError(null)
    const r = await api(`/seguros/grupos-economicos/${id}`, { method: 'DELETE' })
    if (!r.ok) onError(r.error || 'Erro ao remover.')
    else onRefresh()
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Grupos econômicos (Nexus)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {nexusSyncedAt ? (
            <Chip size="small" label={`Sincronizado: ${new Date(nexusSyncedAt).toLocaleString('pt-BR')}`} variant="outlined" />
          ) : null}
          {nexusRowCount !== null ? <Chip size="small" label={`${nexusRowCount} cliente(s) no snapshot`} variant="outlined" /> : null}
          <Button size="small" variant="outlined" onClick={() => void loadNexus()} disabled={nexusLoading}>
            Atualizar lista
          </Button>
        </Box>
      </Box>

      {nexusNeedsSync || !nexusOk ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {nexusMsg ||
            'Os clientes do Nexus ainda não foram sincronizados para o portal. Um administrador deve executar a sincronização em «Banco de dados» (Nexus).'}
        </Alert>
      ) : (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Dados obtidos do snapshot <strong>clientes</strong> da API Nexus. Várias linhas com o mesmo grupo indicam várias empresas naquele grupo económico.
        </Typography>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 3 }}>
        {nexusLoading ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            A carregar dados Nexus…
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Grupo econômico</TableCell>
                <TableCell>Razão social</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Status</TableCell>
                <TableCell width={120}>Id Nexus</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nexusEmpresas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" variant="body2">
                      {nexusOk ? 'Nenhuma empresa encontrada no snapshot (ou campos vazios).' : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nexusEmpresas.map((row) => (
                  <TableRow key={row.nexusClienteId} hover>
                    <TableCell>{row.grupoEconomicoNome}</TableCell>
                    <TableCell>{row.razaoSocial}</TableCell>
                    <TableCell>{row.cnpj}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        {row.nexusClienteId}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Grupos locais do portal
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Usados para vínculos com <strong>estipulantes</strong> e <strong>apólices</strong> neste módulo (cadastro interno). O quadro acima reflete apenas o Nexus.
          </Typography>
        </Box>
        {isAdmin ? (
          <Button variant="contained" onClick={openCreate}>
            Novo grupo local
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome (local)</TableCell>
              <TableCell>CNPJ (local)</TableCell>
              <TableCell>Estipulantes</TableCell>
              <TableCell>Ativo</TableCell>
              {isAdmin ? <TableCell align="right">Ações</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {grupos.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell>{g.nome}</TableCell>
                <TableCell>{g.cnpj ?? '—'}</TableCell>
                <TableCell>{g._count?.estipulantes ?? '—'}</TableCell>
                <TableCell>{g.active ? 'Sim' : 'Não'}</TableCell>
                {isAdmin ? (
                  <TableCell align="right">
                    <Button size="small" onClick={() => openRow(g)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => void del(g.id)}>
                      Excluir
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? 'Editar grupo econômico' : 'Novo grupo econômico'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField required label="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth />
          <TextField label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} fullWidth />
          <TextField label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saving || !nome.trim()} onClick={() => void save()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function EstipulantesSection({ isAdmin, onError }: { isAdmin: boolean; onError: (s: string | null) => void }) {
  const { nomes, needsSync, syncMessage } = useNexusGruposEconomicosNomes()
  const [grupoNome, setGrupoNome] = useState('')
  const [portalRows, setPortalRows] = useState<Estipulante[]>([])
  const [nexusGrupoEmpresas, setNexusGrupoEmpresas] = useState<NexusEmpresaView[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Estipulante | null>(null)
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [nexusClienteId, setNexusClienteId] = useState<string | null>(null)
  const [importClienteId, setImportClienteId] = useState('')
  const [saving, setSaving] = useState(false)

  const displayRows = useMemo(
    () => mergeEstipulantesComNexus(portalRows, nexusGrupoEmpresas),
    [portalRows, nexusGrupoEmpresas],
  )

  const load = useCallback(async () => {
    if (!grupoNome) {
      setPortalRows([])
      setNexusGrupoEmpresas([])
      return
    }
    setLoading(true)
    onError(null)
    const [rEst, rNex] = await Promise.all([
      api<{ estipulantes: Estipulante[] }>(`/seguros/estipulantes?grupoNome=${encodeURIComponent(grupoNome)}`),
      api<{ empresas?: NexusEmpresaView[] }>(
        `/seguros/nexus/clientes-do-grupo?grupoNome=${encodeURIComponent(grupoNome)}`,
      ),
    ])
    setLoading(false)
    if (!rEst.ok) {
      onError(rEst.error || 'Erro ao carregar estipulantes do portal.')
      setPortalRows([])
    } else {
      setPortalRows(rEst.data?.estipulantes ?? [])
    }
    if (rNex.ok) setNexusGrupoEmpresas(rNex.data?.empresas ?? [])
    else setNexusGrupoEmpresas([])
  }, [grupoNome, onError])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    if (!grupoNome) return
    setEdit(null)
    setRazaoSocial('')
    setCnpj('')
    setNomeFantasia('')
    setObservacoes('')
    setNexusClienteId(null)
    setImportClienteId('')
    setOpen(true)
  }

  function openCadastrarDesdeNexus(em: NexusEmpresaView) {
    if (!grupoNome) return
    setEdit(null)
    setRazaoSocial(em.razaoSocial)
    setCnpj(normCnpjDigits(em.cnpj).length >= 8 ? normCnpjDigits(em.cnpj) : cnpjParaCadastroEstipulanteNexus(em))
    setNomeFantasia('')
    setObservacoes('')
    setNexusClienteId(em.nexusClienteId)
    setImportClienteId(em.nexusClienteId)
    setOpen(true)
  }

  function openRow(e: Estipulante) {
    setEdit(e)
    setRazaoSocial(e.razaoSocial)
    setCnpj(e.cnpj)
    setNomeFantasia(e.nomeFantasia ?? '')
    setObservacoes(e.observacoes ?? '')
    setNexusClienteId(e.nexusClienteId)
    setImportClienteId('')
    setOpen(true)
  }

  function onImportClienteChange(id: string) {
    setImportClienteId(id)
    if (!id) {
      setNexusClienteId(null)
      return
    }
    const em = nexusGrupoEmpresas.find((x) => x.nexusClienteId === id)
    if (em) {
      setRazaoSocial(em.razaoSocial)
      setCnpj(normCnpjDigits(em.cnpj).length >= 8 ? normCnpjDigits(em.cnpj) : cnpjParaCadastroEstipulanteNexus(em))
      setNexusClienteId(em.nexusClienteId)
    }
  }

  async function save() {
    onError(null)
    setSaving(true)
    if (edit) {
      const r = await api<{ estipulante: Estipulante }>(`/seguros/estipulantes/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          razaoSocial,
          cnpj,
          nomeFantasia: nomeFantasia.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void load()
      }
    } else {
      let cnpjBody = normCnpjDigits(cnpj).length >= 8 ? normCnpjDigits(cnpj).slice(0, 20) : ''
      if (!cnpjBody && nexusClienteId?.trim()) {
        cnpjBody = cnpjParaCadastroEstipulanteNexus({ nexusClienteId: nexusClienteId.trim(), cnpj })
      }
      if (!cnpjBody) {
        setSaving(false)
        onError('Informe um CNPJ válido ou escolha um cliente Nexus na lista.')
        return
      }
      const r = await api<{ estipulante: Estipulante }>('/seguros/estipulantes', {
        method: 'POST',
        body: JSON.stringify({
          grupoEconomicoNome: grupoNome,
          nexusClienteId: nexusClienteId?.trim() || null,
          razaoSocial,
          cnpj: cnpjBody,
          nomeFantasia: nomeFantasia.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void load()
      }
    }
  }

  async function del(id: string) {
    if (!window.confirm('Remover este estipulante? Apólices associadas serão removidas.')) return
    onError(null)
    const r = await api(`/seguros/estipulantes/${id}`, { method: 'DELETE' })
    if (!r.ok) onError(r.error || 'Erro ao remover.')
    else void load()
  }

  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Estipulantes
      </Typography>
      {needsSync ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {syncMessage ||
            'Sincronize os clientes Nexus em Banco de dados para listar os nomes de grupo econômico e pré-preencher CNPJs.'}
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="g-est">Grupo econômico (Nexus)</InputLabel>
          <Select
            labelId="g-est"
            label="Grupo econômico (Nexus)"
            value={grupoNome}
            onChange={(e: SelectChangeEvent) => setGrupoNome(e.target.value)}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {nomes.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        {isAdmin ? (
          <Button variant="contained" disabled={!grupoNome} onClick={openCreate}>
            Novo estipulante
          </Button>
        ) : null}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        {loading ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            A carregar…
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Grupo</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Razão social</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Nome fantasia</TableCell>
                <TableCell>Cliente Nexus</TableCell>
                <TableCell>Apólices</TableCell>
                {isAdmin ? <TableCell align="right">Ações</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} sx={{ py: 2, color: 'text.secondary' }}>
                    {grupoNome
                      ? 'Nenhuma empresa encontrada no Nexus para este grupo. Verifique a sincronização de clientes em Banco de dados.'
                      : 'Selecione um grupo econômico.'}
                  </TableCell>
                </TableRow>
              ) : null}
              {displayRows.map((row) =>
                row.kind === 'portal' ? (
                  <TableRow key={row.e.id} hover>
                    <TableCell sx={{ maxWidth: 160 }}>{row.e.grupoEconomicoNome}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Cadastrado" color="success" variant="outlined" />
                    </TableCell>
                    <TableCell>{row.e.razaoSocial}</TableCell>
                    <TableCell>{row.e.cnpj}</TableCell>
                    <TableCell>{row.e.nomeFantasia ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 120, fontFamily: 'monospace', fontSize: 12 }}>
                      {row.e.nexusClienteId ?? '—'}
                    </TableCell>
                    <TableCell>{row.e._count?.apolices ?? '—'}</TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Button size="small" onClick={() => openRow(row.e)}>
                          Editar
                        </Button>
                        <Button size="small" color="error" onClick={() => void del(row.e.id)}>
                          Excluir
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ) : (
                  <TableRow key={`nexus-${row.em.nexusClienteId}`} hover sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ maxWidth: 160 }}>{row.em.grupoEconomicoNome}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Só Nexus" color="info" variant="outlined" />
                    </TableCell>
                    <TableCell>{row.em.razaoSocial}</TableCell>
                    <TableCell>{row.em.cnpj}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell sx={{ maxWidth: 120, fontFamily: 'monospace', fontSize: 12 }}>{row.em.nexusClienteId}</TableCell>
                    <TableCell>—</TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Button size="small" variant="contained" onClick={() => openCadastrarDesdeNexus(row.em)}>
                          Cadastrar
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? 'Editar estipulante' : 'Novo estipulante'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {!edit && grupoNome ? (
            <FormControl fullWidth size="small">
              <InputLabel id="imp-cli">Pré-preencher a partir do Nexus (opcional)</InputLabel>
              <Select
                labelId="imp-cli"
                label="Pré-preencher a partir do Nexus (opcional)"
                value={importClienteId}
                onChange={(e: SelectChangeEvent) => onImportClienteChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>Nenhum — preencher à mão</em>
                </MenuItem>
                {nexusGrupoEmpresas.map((em) => (
                  <MenuItem key={em.nexusClienteId} value={em.nexusClienteId}>
                    {em.razaoSocial} — {em.cnpj}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          {nexusClienteId ? <Chip size="small" label={`Cliente Nexus: ${nexusClienteId}`} variant="outlined" /> : null}
          <TextField required label="Razão social" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} fullWidth />
          <TextField required label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} fullWidth disabled={!!edit} />
          <TextField label="Nome fantasia" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} fullWidth />
          <TextField label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saving || !razaoSocial.trim() || !cnpj.trim()} onClick={() => void save()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const APOLICE_NUMERO_MANUAL = '__manual__'
/** Valor sintético no Select: escolher cliente Nexus ainda sem estipulante no portal (admin cria via POST). */
const ESTIPULANTE_SEL_NEXUS_PREFIX = '__nx__'

function ApolicesSection({ isAdmin, onError }: { isAdmin: boolean; onError: (s: string | null) => void }) {
  const { nomes, needsSync, syncMessage } = useNexusGruposEconomicosNomes()
  const [grupoNome, setGrupoNome] = useState('')
  const [estipulanteId, setEstipulanteId] = useState('')
  const [portalEstRows, setPortalEstRows] = useState<Estipulante[]>([])
  const [nexusGrupoEmpresas, setNexusGrupoEmpresas] = useState<NexusEmpresaView[]>([])
  const [portalApolices, setPortalApolices] = useState<Apolice[]>([])
  const [loadingEst, setLoadingEst] = useState(false)
  const [loadingAp, setLoadingAp] = useState(false)
  const [contratosNexus, setContratosNexus] = useState<NexusContratoOpcao[]>([])
  const [needsContratosSync, setNeedsContratosSync] = useState(false)

  const displayApRows = useMemo(
    () => mergeApolicesComNexus(portalApolices, contratosNexus),
    [portalApolices, contratosNexus],
  )

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Apolice | null>(null)
  const [nexusContratoId, setNexusContratoId] = useState('')
  const [numeroApolice, setNumeroApolice] = useState('')
  const [produto, setProduto] = useState<ApoliceProduto>('OUTROS')
  const [fornecedor, setFornecedor] = useState('')
  const [subestipulante, setSubestipulante] = useState('')
  const [plano, setPlano] = useState('')
  const [coberturas, setCoberturas] = useState('')
  const [vigIni, setVigIni] = useState('')
  const [vigFim, setVigFim] = useState('')
  const [obsAp, setObsAp] = useState('')
  const [saving, setSaving] = useState(false)

  const showPlano = produto === 'SAUDE' || produto === 'ODONTO'
  const showCoberturas = produto === 'VIDA_GRUPO'

  const mergedEstRows = useMemo(
    () => mergeEstipulantesComNexus(portalEstRows, nexusGrupoEmpresas),
    [portalEstRows, nexusGrupoEmpresas],
  )

  const loadEst = useCallback(async () => {
    if (!grupoNome) {
      setPortalEstRows([])
      setNexusGrupoEmpresas([])
      return
    }
    setLoadingEst(true)
    const [rEst, rNex] = await Promise.all([
      api<{ estipulantes: Estipulante[] }>(`/seguros/estipulantes?grupoNome=${encodeURIComponent(grupoNome)}`),
      api<{ empresas?: NexusEmpresaView[] }>(
        `/seguros/nexus/clientes-do-grupo?grupoNome=${encodeURIComponent(grupoNome)}`,
      ),
    ])
    setLoadingEst(false)
    if (!rEst.ok) {
      onError(rEst.error || 'Erro ao carregar estipulantes do portal.')
      setPortalEstRows([])
    } else {
      setPortalEstRows(rEst.data?.estipulantes ?? [])
    }
    if (rNex.ok) setNexusGrupoEmpresas(rNex.data?.empresas ?? [])
    else setNexusGrupoEmpresas([])
  }, [grupoNome, onError])

  useEffect(() => {
    if (!grupoNome || loadingEst) return
    const apenasPortal = mergedEstRows.filter((r) => r.kind === 'portal')
    if (apenasPortal.length === 1) setEstipulanteId(apenasPortal[0].e.id)
  }, [grupoNome, loadingEst, mergedEstRows])

  const loadApoliceTabela = useCallback(async () => {
    if (!grupoNome.trim() && !estipulanteId) {
      setPortalApolices([])
      setContratosNexus([])
      setNeedsContratosSync(false)
      return
    }
    setLoadingAp(true)
    onError(null)
    /** Só grupo: lista todas as apólices do grupo no portal (vários estipulantes). */
    if (!estipulanteId && grupoNome.trim()) {
      const rAp = await api<{ apolices: Apolice[] }>(
        `/seguros/apolices?grupoNome=${encodeURIComponent(grupoNome.trim())}`,
      )
      setLoadingAp(false)
      if (!rAp.ok) {
        onError(rAp.error || 'Erro ao carregar apólices do grupo.')
        setPortalApolices([])
      } else {
        setPortalApolices(rAp.data?.apolices ?? [])
      }
      setContratosNexus([])
      setNeedsContratosSync(false)
      return
    }
    const gq = grupoNome.trim() ? `&grupoNome=${encodeURIComponent(grupoNome.trim())}` : ''
    const [rAp, rCt] = await Promise.all([
      api<{ apolices: Apolice[] }>(
        `/seguros/apolices?estipulanteId=${encodeURIComponent(estipulanteId)}${gq}`,
      ),
      api<{ ok?: boolean; needsSync?: boolean; contratos?: NexusContratoOpcao[] }>(
        `/seguros/nexus/contratos-opcoes?estipulanteId=${encodeURIComponent(estipulanteId)}${gq}`,
      ),
    ])
    setLoadingAp(false)
    if (!rAp.ok) {
      onError(rAp.error || 'Erro ao carregar apólices do portal.')
      setPortalApolices([])
    } else {
      setPortalApolices(rAp.data?.apolices ?? [])
    }
    if (rCt.ok) {
      const d = rCt.data
      setNeedsContratosSync(!!d?.needsSync || d?.ok === false)
      setContratosNexus(d?.contratos ?? [])
    } else {
      setContratosNexus([])
      setNeedsContratosSync(true)
    }
  }, [estipulanteId, grupoNome, onError])

  useEffect(() => {
    void loadEst()
  }, [loadEst])

  useEffect(() => {
    void loadApoliceTabela()
  }, [loadApoliceTabela])

  async function handleEstipulanteSelect(ev: SelectChangeEvent) {
    const v = ev.target.value
    onError(null)
    if (!v) {
      setEstipulanteId('')
      return
    }
    if (v.startsWith(ESTIPULANTE_SEL_NEXUS_PREFIX)) {
      if (!isAdmin) return
      const nexusClienteId = v.slice(ESTIPULANTE_SEL_NEXUS_PREFIX.length)
      const em = nexusGrupoEmpresas.find((x) => x.nexusClienteId === nexusClienteId)
      if (!em) return
      const cnpjBody = cnpjParaCadastroEstipulanteNexus(em)
      const r = await api<{ estipulante: Estipulante }>('/seguros/estipulantes', {
        method: 'POST',
        body: JSON.stringify({
          grupoEconomicoNome: grupoNome,
          nexusClienteId: em.nexusClienteId,
          razaoSocial: em.razaoSocial,
          cnpj: cnpjBody,
          nomeFantasia: null,
          observacoes: null,
        }),
      })
      if (!r.ok) {
        onError(r.error || 'Não foi possível criar o estipulante.')
        return
      }
      const id = r.data?.estipulante?.id
      if (id) setEstipulanteId(id)
      void loadEst()
      return
    }
    setEstipulanteId(v)
  }

  function onContratoSelect(v: string) {
    if (v === APOLICE_NUMERO_MANUAL) {
      setNexusContratoId('')
      return
    }
    setNexusContratoId(v)
    const c = contratosNexus.find((x) => x.nexusContratoId === v)
    if (c) setNumeroApolice(c.numero)
  }

  function openCreate() {
    if (!estipulanteId) return
    setEdit(null)
    setNexusContratoId('')
    setNumeroApolice('')
    setProduto('OUTROS')
    setFornecedor('')
    setSubestipulante('')
    setPlano('')
    setCoberturas('')
    setVigIni('')
    setVigFim('')
    setObsAp('')
    setOpen(true)
  }

  function openCadastrarDesdeContratoNexus(c: NexusContratoOpcao) {
    if (!estipulanteId) return
    setEdit(null)
    setNexusContratoId(c.nexusContratoId)
    setNumeroApolice(c.numero)
    setProduto('OUTROS')
    setFornecedor('')
    setSubestipulante('')
    setPlano('')
    setCoberturas('')
    setVigIni('')
    setVigFim('')
    setObsAp('')
    setOpen(true)
  }

  function openRow(a: Apolice) {
    setEdit(a)
    setNexusContratoId(a.nexusContratoId ?? '')
    setNumeroApolice(a.numeroApolice)
    setProduto(a.produto)
    setFornecedor(a.fornecedor)
    setSubestipulante(a.subestipulante)
    setPlano(a.plano ?? '')
    setCoberturas(a.coberturas ?? '')
    setVigIni(a.vigenciaInicio ? String(a.vigenciaInicio).slice(0, 10) : '')
    setVigFim(a.vigenciaFim ? String(a.vigenciaFim).slice(0, 10) : '')
    setObsAp(a.observacoes ?? '')
    setOpen(true)
  }

  async function save() {
    onError(null)
    setSaving(true)
    const base = {
      produto,
      fornecedor,
      subestipulante,
      plano: showPlano ? plano.trim() : null,
      coberturas: showCoberturas ? coberturas.trim() : null,
      vigenciaInicio: vigIni.trim() || null,
      vigenciaFim: vigFim.trim() || null,
      observacoes: obsAp.trim() || null,
    }
    const nex = nexusContratoId.trim()
    if (edit) {
      const payload = {
        ...base,
        nexusContratoId: nex || null,
        ...(nex ? {} : { numeroApolice: numeroApolice.trim() }),
      }
      const r = await api<{ apolice: Apolice }>(`/seguros/apolices/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void loadApoliceTabela()
      }
    } else {
      const payload = {
        ...base,
        nexusContratoId: nex || null,
        numeroApolice: nex ? null : numeroApolice.trim(),
      }
      const r = await api<{ apolice: Apolice }>('/seguros/apolices', {
        method: 'POST',
        body: JSON.stringify({ estipulanteId, ...payload }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void loadApoliceTabela()
      }
    }
  }

  async function del(id: string) {
    if (!window.confirm('Remover esta apólice? Itens associados serão removidos.')) return
    onError(null)
    const r = await api(`/seguros/apolices/${id}`, { method: 'DELETE' })
    if (!r.ok) onError(r.error || 'Erro ao remover.')
    else void loadApoliceTabela()
  }

  const numeroOk = nexusContratoId.trim().length > 0 || numeroApolice.trim().length > 0
  const contratoSelectValue = nexusContratoId.trim() || APOLICE_NUMERO_MANUAL

  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Apólices
      </Typography>
      {needsSync ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {syncMessage ||
            'Sincronize os clientes Nexus em Banco de dados para listar os nomes de grupo econômico nesta página.'}
        </Alert>
      ) : null}
      {grupoNome && !loadingEst && portalEstRows.length === 0 && nexusGrupoEmpresas.length > 0 && !isAdmin ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Existem empresas Nexus neste grupo ainda sem estipulante no portal. Peça a um administrador para as cadastrar na
          aba Estipulantes (ou escolha aqui se tiver permissão).
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <FormControl fullWidth size="small">
          <InputLabel id="g-ap">Grupo econômico (Nexus)</InputLabel>
          <Select
            labelId="g-ap"
            label="Grupo econômico (Nexus)"
            value={grupoNome}
            onChange={(e: SelectChangeEvent) => {
              setGrupoNome(e.target.value)
              setEstipulanteId('')
            }}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {nomes.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!grupoNome || loadingEst}>
          <InputLabel id="e-ap">Estipulante</InputLabel>
          <Select
            labelId="e-ap"
            label="Estipulante"
            value={estipulanteId}
            onChange={(e: SelectChangeEvent) => void handleEstipulanteSelect(e)}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {mergedEstRows.map((row) =>
              row.kind === 'portal' ? (
                <MenuItem key={row.e.id} value={row.e.id}>
                  {row.e.razaoSocial}
                </MenuItem>
              ) : (
                <MenuItem
                  key={`nx-est-${row.em.nexusClienteId}`}
                  value={`${ESTIPULANTE_SEL_NEXUS_PREFIX}${row.em.nexusClienteId}`}
                  disabled={!isAdmin}
                >
                  {row.em.razaoSocial} — {row.em.cnpj} (Nexus, pendente no portal)
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        {isAdmin ? (
          <Button variant="contained" disabled={!estipulanteId} onClick={openCreate}>
            Nova apólice
          </Button>
        ) : null}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        {loadingAp ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            A carregar…
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Situação</TableCell>
                <TableCell>Estipulante</TableCell>
                <TableCell>Nº apólice</TableCell>
                <TableCell>Contrato Nexus</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell>Subestipulante</TableCell>
                <TableCell>Plano</TableCell>
                <TableCell>Coberturas</TableCell>
                <TableCell>Vigência</TableCell>
                <TableCell>Itens</TableCell>
                {isAdmin ? <TableCell align="right">Ações</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayApRows.length === 0 && (estipulanteId || grupoNome.trim()) && !loadingAp ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} sx={{ py: 2, color: 'text.secondary' }}>
                    {!estipulanteId && grupoNome.trim() ? (
                      <>
                        Nenhuma apólice no portal para o grupo económico «{grupoNome}». Confirme no administrativo (Railway)
                        que as apólices estão em <strong>PortalSeguroApolice</strong> com estipulante cujo grupo coincide com
                        este nome ou com o grupo local no Portal.
                      </>
                    ) : needsContratosSync ? (
                      'Não há contratos Nexus sincronizados para este estipulante. Sincronize a entidade contratos em Banco de dados ou cadastre a apólice manualmente.'
                    ) : (
                      <>
                        Nenhuma apólice no portal nem contrato Nexus para este estipulante. Se a apólice existir na base
                        mas noutro vínculo, escolha só o <strong>grupo económico</strong> (sem estipulante) para listar
                        todas as apólices do grupo. Em produção, confirme também <strong>VITE_API_URL</strong> na Vercel
                        (API Railway atualizada).
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
              {displayApRows.map((row) =>
                row.kind === 'portal' ? (
                  <TableRow key={row.a.id} hover>
                    <TableCell>
                      <Chip size="small" label="Cadastrado" color="success" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      {row.a.estipulante?.razaoSocial ?? '—'}
                    </TableCell>
                    <TableCell>{row.a.numeroApolice}</TableCell>
                    <TableCell sx={{ maxWidth: 120, fontFamily: 'monospace', fontSize: 12 }}>
                      {row.a.nexusContratoId ?? '—'}
                    </TableCell>
                    <TableCell>{PRODUTO_LABEL[row.a.produto]}</TableCell>
                    <TableCell>{row.a.fornecedor}</TableCell>
                    <TableCell>{row.a.subestipulante}</TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>{row.a.plano ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{row.a.coberturas ?? '—'}</TableCell>
                    <TableCell>
                      {fmtDate(row.a.vigenciaInicio)} — {fmtDate(row.a.vigenciaFim)}
                    </TableCell>
                    <TableCell>{row.a._count?.itens ?? '—'}</TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Button size="small" onClick={() => openRow(row.a)}>
                          Editar
                        </Button>
                        <Button size="small" color="error" onClick={() => void del(row.a.id)}>
                          Excluir
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ) : (
                  <TableRow key={`nexus-ap-${row.c.nexusContratoId}`} hover sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Chip size="small" label="Só Nexus" color="info" variant="outlined" />
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{row.c.numero}</TableCell>
                    <TableCell sx={{ maxWidth: 120, fontFamily: 'monospace', fontSize: 12 }}>{row.c.nexusContratoId}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Button size="small" variant="contained" onClick={() => openCadastrarDesdeContratoNexus(row.c)}>
                          Complementar / cadastrar
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{edit ? 'Editar apólice' : 'Nova apólice'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {needsContratosSync ? (
            <Alert severity="info">
              Contratos Nexus ainda não estão disponíveis (sincronize a entidade <strong>contratos</strong> em Banco de dados).
              Pode continuar indicando o número da apólice manualmente.
            </Alert>
          ) : null}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="ctr-nx">Número / contrato (Nexus)</InputLabel>
              <Select
                labelId="ctr-nx"
                label="Número / contrato (Nexus)"
                value={contratoSelectValue}
                onChange={(e: SelectChangeEvent) => onContratoSelect(e.target.value)}
              >
                <MenuItem value={APOLICE_NUMERO_MANUAL}>
                  <em>Digitar número manualmente</em>
                </MenuItem>
                {contratosNexus.map((c) => (
                  <MenuItem key={c.nexusContratoId} value={c.nexusContratoId}>
                    {c.numero}
                    {c.codigo ? ` — ${c.codigo}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              required={!nexusContratoId.trim()}
              label="Número da apólice"
              value={numeroApolice}
              onChange={(e) => setNumeroApolice(e.target.value)}
              fullWidth
              disabled={!!nexusContratoId.trim()}
              helperText={nexusContratoId.trim() ? 'Preenchido pelo contrato Nexus selecionado.' : 'Obrigatório se não escolher um contrato na lista.'}
            />
            <FormControl fullWidth required size="small">
              <InputLabel>Produto</InputLabel>
              <Select label="Produto" value={produto} onChange={(e) => setProduto(e.target.value as ApoliceProduto)}>
                <MenuItem value="SAUDE">Saúde</MenuItem>
                <MenuItem value="ODONTO">Odonto</MenuItem>
                <MenuItem value="VIDA_GRUPO">Vida em grupo</MenuItem>
                <MenuItem value="OUTROS">Outros</MenuItem>
              </Select>
            </FormControl>
            <TextField required label="Fornecedor (seguradora)" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} fullWidth />
            <TextField required label="Subestipulante" value={subestipulante} onChange={(e) => setSubestipulante(e.target.value)} fullWidth />
            {showPlano ? (
              <TextField required label="Plano" value={plano} onChange={(e) => setPlano(e.target.value)} fullWidth sx={{ gridColumn: { sm: 'span 2' } }} />
            ) : null}
            {showCoberturas ? (
              <TextField
                required
                label="Coberturas"
                value={coberturas}
                onChange={(e) => setCoberturas(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
            ) : null}
            <TextField label="Vigência início" type="date" value={vigIni} onChange={(e) => setVigIni(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Vigência fim" type="date" value={vigFim} onChange={(e) => setVigFim(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField
              label="Observações"
              value={obsAp}
              onChange={(e) => setObsAp(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              sx={{ gridColumn: { sm: 'span 2' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || !numeroOk || !fornecedor.trim() || !subestipulante.trim()}
            onClick={() => void save()}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function ItensSection({ isAdmin, onError }: { isAdmin: boolean; onError: (s: string | null) => void }) {
  const { nomes, needsSync, syncMessage } = useNexusGruposEconomicosNomes()
  const [grupoNome, setGrupoNome] = useState('')
  const [estipulanteId, setEstipulanteId] = useState('')
  const [apoliceId, setApoliceId] = useState('')
  const [portalEstRows, setPortalEstRows] = useState<Estipulante[]>([])
  const [nexusGrupoEmpresas, setNexusGrupoEmpresas] = useState<NexusEmpresaView[]>([])
  const [apLista, setApLista] = useState<ApoliceLista[]>([])
  const [itens, setItens] = useState<ApoliceItem[]>([])
  const [loadingEst, setLoadingEst] = useState(false)
  const [loadingAp, setLoadingAp] = useState(false)
  const [loadingIt, setLoadingIt] = useState(false)

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<ApoliceItem | null>(null)
  const [tipo, setTipo] = useState<ItemTipo>('COBERTURA')
  const [descricao, setDescricao] = useState('')
  const [detalhes, setDetalhes] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)

  const mergedEstRowsIt = useMemo(
    () => mergeEstipulantesComNexus(portalEstRows, nexusGrupoEmpresas),
    [portalEstRows, nexusGrupoEmpresas],
  )

  const loadEst = useCallback(async () => {
    if (!grupoNome) {
      setPortalEstRows([])
      setNexusGrupoEmpresas([])
      return
    }
    setLoadingEst(true)
    const [rEst, rNex] = await Promise.all([
      api<{ estipulantes: Estipulante[] }>(`/seguros/estipulantes?grupoNome=${encodeURIComponent(grupoNome)}`),
      api<{ empresas?: NexusEmpresaView[] }>(
        `/seguros/nexus/clientes-do-grupo?grupoNome=${encodeURIComponent(grupoNome)}`,
      ),
    ])
    setLoadingEst(false)
    if (!rEst.ok) {
      onError(rEst.error || 'Erro ao carregar estipulantes do portal.')
      setPortalEstRows([])
    } else {
      setPortalEstRows(rEst.data?.estipulantes ?? [])
    }
    if (rNex.ok) setNexusGrupoEmpresas(rNex.data?.empresas ?? [])
    else setNexusGrupoEmpresas([])
  }, [grupoNome, onError])

  useEffect(() => {
    if (!grupoNome || loadingEst) return
    const apenasPortal = mergedEstRowsIt.filter((r) => r.kind === 'portal')
    if (apenasPortal.length === 1) setEstipulanteId(apenasPortal[0].e.id)
  }, [grupoNome, loadingEst, mergedEstRowsIt])

  async function handleEstipulanteSelectIt(ev: SelectChangeEvent) {
    const v = ev.target.value
    onError(null)
    if (!v) {
      setEstipulanteId('')
      setApoliceId('')
      return
    }
    if (v.startsWith(ESTIPULANTE_SEL_NEXUS_PREFIX)) {
      if (!isAdmin) return
      const nexusClienteId = v.slice(ESTIPULANTE_SEL_NEXUS_PREFIX.length)
      const em = nexusGrupoEmpresas.find((x) => x.nexusClienteId === nexusClienteId)
      if (!em) return
      const cnpjBody = cnpjParaCadastroEstipulanteNexus(em)
      const r = await api<{ estipulante: Estipulante }>('/seguros/estipulantes', {
        method: 'POST',
        body: JSON.stringify({
          grupoEconomicoNome: grupoNome,
          nexusClienteId: em.nexusClienteId,
          razaoSocial: em.razaoSocial,
          cnpj: cnpjBody,
          nomeFantasia: null,
          observacoes: null,
        }),
      })
      if (!r.ok) {
        onError(r.error || 'Não foi possível criar o estipulante.')
        return
      }
      const id = r.data?.estipulante?.id
      if (id) setEstipulanteId(id)
      setApoliceId('')
      void loadEst()
      return
    }
    setEstipulanteId(v)
    setApoliceId('')
  }

  const loadApLista = useCallback(async () => {
    if (!estipulanteId) {
      setApLista([])
      setApoliceId('')
      return
    }
    setLoadingAp(true)
    onError(null)
    const gq = grupoNome.trim() ? `&grupoNome=${encodeURIComponent(grupoNome.trim())}` : ''
    const r = await api<{ apolices: ApoliceLista[] }>(
      `/seguros/apolices/lista?estipulanteId=${encodeURIComponent(estipulanteId)}${gq}`,
    )
    setLoadingAp(false)
    if (!r.ok) {
      onError(r.error || 'Erro ao carregar apólices.')
      setApLista([])
      return
    }
    setApLista(r.data?.apolices ?? [])
  }, [estipulanteId, grupoNome, onError])

  const loadItens = useCallback(async () => {
    if (!apoliceId) {
      setItens([])
      return
    }
    setLoadingIt(true)
    onError(null)
    const r = await api<{ itens: ApoliceItem[] }>(`/seguros/apolices/${encodeURIComponent(apoliceId)}/itens`)
    setLoadingIt(false)
    if (!r.ok) {
      onError(r.error || 'Erro ao carregar itens.')
      setItens([])
      return
    }
    setItens(r.data?.itens ?? [])
  }, [apoliceId, onError])

  useEffect(() => {
    void loadEst()
  }, [loadEst])

  useEffect(() => {
    void loadApLista()
  }, [loadApLista])

  useEffect(() => {
    void loadItens()
  }, [loadItens])

  function openCreate() {
    if (!apoliceId) return
    setEdit(null)
    setTipo('COBERTURA')
    setDescricao('')
    setDetalhes('')
    setSortOrder('0')
    setOpen(true)
  }

  function openRow(it: ApoliceItem) {
    setEdit(it)
    setTipo(it.tipo)
    setDescricao(it.descricao)
    setDetalhes(it.detalhes ?? '')
    setSortOrder(String(it.sortOrder))
    setOpen(true)
  }

  async function save() {
    onError(null)
    setSaving(true)
    const so = Number.parseInt(sortOrder, 10)
    if (edit) {
      const r = await api<{ item: ApoliceItem }>(`/seguros/apolice-itens/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tipo,
          descricao,
          detalhes: detalhes.trim() || null,
          sortOrder: Number.isFinite(so) ? so : 0,
        }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void loadItens()
      }
    } else {
      const r = await api<{ item: ApoliceItem }>(`/seguros/apolices/${encodeURIComponent(apoliceId)}/itens`, {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          descricao,
          detalhes: detalhes.trim() || null,
          sortOrder: Number.isFinite(so) ? so : 0,
        }),
      })
      setSaving(false)
      if (!r.ok) onError(r.error || 'Erro ao guardar.')
      else {
        setOpen(false)
        void loadItens()
      }
    }
  }

  async function del(id: string) {
    if (!window.confirm('Remover este item?')) return
    onError(null)
    const r = await api(`/seguros/apolice-itens/${id}`, { method: 'DELETE' })
    if (!r.ok) onError(r.error || 'Erro ao remover.')
    else void loadItens()
  }

  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Itens da apólice
      </Typography>
      {needsSync ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {syncMessage ||
            'Sincronize os clientes Nexus em Banco de dados para listar os nomes de grupo econômico nesta página.'}
        </Alert>
      ) : null}
      {grupoNome && !loadingEst && portalEstRows.length === 0 && nexusGrupoEmpresas.length > 0 && !isAdmin ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Existem empresas Nexus neste grupo ainda sem estipulante no portal. Um administrador deve cadastrá-las na aba
          Estipulantes.
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
        <FormControl fullWidth size="small">
          <InputLabel>Grupo econômico (Nexus)</InputLabel>
          <Select
            label="Grupo econômico (Nexus)"
            value={grupoNome}
            onChange={(e: SelectChangeEvent) => {
              setGrupoNome(e.target.value)
              setEstipulanteId('')
              setApoliceId('')
            }}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {nomes.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!grupoNome || loadingEst}>
          <InputLabel>Estipulante</InputLabel>
          <Select
            label="Estipulante"
            value={estipulanteId}
            onChange={(e: SelectChangeEvent) => void handleEstipulanteSelectIt(e)}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {mergedEstRowsIt.map((row) =>
              row.kind === 'portal' ? (
                <MenuItem key={row.e.id} value={row.e.id}>
                  {row.e.razaoSocial}
                </MenuItem>
              ) : (
                <MenuItem
                  key={`nx-it-${row.em.nexusClienteId}`}
                  value={`${ESTIPULANTE_SEL_NEXUS_PREFIX}${row.em.nexusClienteId}`}
                  disabled={!isAdmin}
                >
                  {row.em.razaoSocial} — {row.em.cnpj} (Nexus, pendente no portal)
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!estipulanteId || loadingAp}>
          <InputLabel>Apólice</InputLabel>
          <Select label="Apólice" value={apoliceId} onChange={(e: SelectChangeEvent) => setApoliceId(e.target.value)}>
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {apLista.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.numeroApolice} — {PRODUTO_LABEL[a.produto]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        {isAdmin ? (
          <Button variant="contained" disabled={!apoliceId} onClick={openCreate}>
            Novo item
          </Button>
        ) : null}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        {loadingIt ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            A carregar…
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={80}>Ordem</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Detalhes</TableCell>
                {isAdmin ? <TableCell align="right">Ações</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {itens.map((it) => (
                <TableRow key={it.id} hover>
                  <TableCell>{it.sortOrder}</TableCell>
                  <TableCell>{ITEM_TIPO_LABEL[it.tipo]}</TableCell>
                  <TableCell>{it.descricao}</TableCell>
                  <TableCell sx={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{it.detalhes ?? '—'}</TableCell>
                  {isAdmin ? (
                    <TableCell align="right">
                      <Button size="small" onClick={() => openRow(it)}>
                        Editar
                      </Button>
                      <Button size="small" color="error" onClick={() => void del(it.id)}>
                        Excluir
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? 'Editar item' : 'Novo item'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small" required>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ItemTipo)}>
              <MenuItem value="COBERTURA">Cobertura</MenuItem>
              <MenuItem value="SERVICO">Serviço</MenuItem>
              <MenuItem value="CLAUSULA">Cláusula</MenuItem>
              <MenuItem value="OUTRO">Outro</MenuItem>
            </Select>
          </FormControl>
          <TextField required label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} fullWidth />
          <TextField label="Detalhes" value={detalhes} onChange={(e) => setDetalhes(e.target.value)} fullWidth multiline minRows={3} />
          <TextField label="Ordem de exibição" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} fullWidth type="number" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saving || !descricao.trim()} onClick={() => void save()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
