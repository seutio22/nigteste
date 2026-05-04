import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
  Stack,
  Tab,
  Table,
  Tabs,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import BusinessIcon from '@mui/icons-material/Business'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DescriptionIcon from '@mui/icons-material/Description'
import HomeWorkIcon from '@mui/icons-material/HomeWork'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import { api, getPortalApiBaseDisplay } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import SegurosBaseImportExportPanel from '../components/SegurosBaseImportExportPanel'

const DRAWER = 280

type Section = 'visao' | 'grupos' | 'estipulantes' | 'apolices'

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

type GrupoClassificacao = 'CLIENTE' | 'PROSPECT'

const GRUPO_CLASSIFICACAO_LABEL: Record<GrupoClassificacao, string> = {
  CLIENTE: 'Cliente',
  PROSPECT: 'Prospect',
}

type Grupo = {
  id: string
  nome: string
  cnpj: string | null
  observacoes: string | null
  classificacao: GrupoClassificacao
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
  cnae: string | null
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

type ApoliceSubestipulanteList = {
  razaoSocial: string
  cnpj: string
  codigoSub: string
  status: 'ATIVO' | 'CANCELADO'
}

type Apolice = {
  id: string
  estipulanteId: string
  nexusContratoId: string | null
  numeroApolice: string
  produto: ApoliceProduto
  operadoraId?: string | null
  operadora?: { id: string; nome: string } | null
  fornecedor: string
  subestipulante: string | null
  subestipulantes?: ApoliceSubestipulanteList[]
  plano: string | null
  coberturas: string | null
  vigenciaInicio: string | null
  vigenciaFim: string | null
  observacoes: string | null
  active: boolean
  modeloDadosSeguro?: 'PLANO' | 'COBERTURA' | null
  estipulante?: {
    id: string
    razaoSocial: string
    grupoEconomicoNome?: string
    grupo?: { id: string; nome: string } | null
  }
  _count?: { itens: number; planoLinhas?: number; subestipulantes?: number }
}

function resumoSubestipulantesEmLista(a: Apolice): string {
  const total = a._count?.subestipulantes ?? 0
  const prev = a.subestipulantes ?? []
  if (prev.length > 0 && total > 0) {
    const first = prev[0].razaoSocial.trim() || '—'
    const hidden = total - prev.length
    if (hidden > 0) return `${first} (+${hidden})`
    if (total > 1) return `${first} (+${total - 1})`
    return first
  }
  const leg = (a.subestipulante ?? '').trim()
  if (leg) return leg
  return '—'
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
  const theme = useTheme()
  const isMd = useMediaQuery(theme.breakpoints.up('md'))
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
          <ListItemText primary="Apólices e itens" secondary="Lista e coberturas por apólice" />
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
          p: { xs: 2, sm: 2.5, md: 3 },
          width: '100%',
          maxWidth: { md: `calc(100vw - ${DRAWER}px)` },
          minWidth: 0,
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
              Na <strong>Visão geral</strong> consulta-se o cadastro por grupo (com paginação). Utilize a <strong>ficha completa</strong> para ver e editar todos os dados de uma apólice. A importação Excel valida contra a base e permite <strong>completar</strong> campos vazios.
            </>
          ) : (
            <>
              Em <strong>Apólices e itens</strong> gere apólices e coberturas no mesmo sítio (separador interno). Nos restantes menus mantém-se a hierarquia grupo → estipulante.
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
          <>
            {isAdmin ? (
              <Box sx={{ mb: 2 }}>
                <SegurosBaseImportExportPanel />
              </Box>
            ) : null}
            <VisaoGeral onError={setErr} onIrParaApolices={() => setSection('apolices')} onIrParaEstipulantes={() => setSection('estipulantes')} />
          </>
        )}
        {section === 'grupos' && <GruposSection grupos={grupos} isAdmin={isAdmin} onRefresh={loadGrupos} onError={setErr} />}
        {section === 'estipulantes' && <EstipulantesSection isAdmin={isAdmin} onError={setErr} />}
        {section === 'apolices' && <ApolicesEItensSection isAdmin={isAdmin} onError={setErr} />}
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

/** Lista da visão geral: dados por apólice; titular aparece no cabeçalho do bloco, não como colunas na tabela. Itens carregam ao abrir o detalhe. */
type CadastroVisaoGeralApolice = {
  id: string
  active: boolean
  numeroApolice: string
  produto: ApoliceProduto
  fornecedor: string
  subestipulante: string | null
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
    cnae: string | null
    nexusClienteId: string | null
    nomeFantasia: string | null
    observacoes: string | null
    grupo: { id: string; nome: string } | null
  }
  _count?: { itens: number }
  itens?: CadastroVisaoGeralItem[]
  /** Linha sintética a partir do snapshot Nexus (sem registo em PortalSeguroApolice). */
  somenteNexus?: boolean
}

/** Lista auxiliar na visão geral quando ainda não há apólices (vem em `/cadastro-visao-geral`, só na 1.ª página). */
type CadastroVisaoEstipulanteRow = {
  id: string
  active: boolean
  razaoSocial: string
  cnpj: string
  cnae: string | null
  grupoEconomicoNome: string
  /** FK opcional para grupo económico local (Portal). Alinha com apólices ligadas por grupo. */
  grupoEconomicoId: string | null
  nexusClienteId: string | null
  nomeFantasia: string | null
  observacoes: string | null
  grupo: { id: string; nome: string } | null
  _count: { apolices: number }
  /** Só snapshot Nexus (sem linha em PortalSeguroEstipulante). */
  somenteNexus?: boolean
}

/**
 * Estipulante que não é empresa real (import legado, placeholder ou linha sintética na vista).
 * Usado para contagem no accordeão e para não listar linha «só estipulante» inútil.
 */
function estipulanteEVicioContagemVisao(e: CadastroVisaoEstipulanteRow): boolean {
  const rs = (e.razaoSocial || '').trim()
  if (/^\s*Contrato\s*\(/i.test(rs)) return true
  if (e.id.startsWith('__nexus_orf_est__')) return true
  if (e.somenteNexus === true && /^Cliente Nexus\s*\(/i.test(rs)) return true
  if (e.somenteNexus === true && /^Estipulante —/i.test(rs)) return true
  return false
}

function contarEstipulantesReaisGrupo(g: VisaoGrupoBloco): number {
  return g.estipulantes.filter((e) => !estipulanteEVicioContagemVisao(e)).length
}

/** Um titular e as apólices deste grupo que lhe pertencem (cabeçalho + tabela sem colunas estipulante/CNPJ). */
type BlocoEstipulanteVisao = {
  chaveEst: string
  cabecalho: {
    razaoSocial: string
    cnpj: string
    cnae: string | null
    nomeFantasia: string | null
    active: boolean
  }
  apolices: CadastroVisaoGeralApolice[]
}

function blocosPorEstipulanteVisaoGrupo(g: VisaoGrupoBloco): BlocoEstipulanteVisao[] {
  const byEst = new Map<string, CadastroVisaoGeralApolice[]>()
  for (const a of g.apolices) {
    const id = a.estipulante.id
    let arr = byEst.get(id)
    if (!arr) {
      arr = []
      byEst.set(id, arr)
    }
    arr.push(a)
  }

  const candidatos = new Set<string>([...byEst.keys()])
  for (const e of g.estipulantes) {
    if (!estipulanteEVicioContagemVisao(e)) candidatos.add(e.id)
  }

  const ordenado = [...candidatos].sort((idA, idB) => {
    const ea = g.estipulantes.find((x) => x.id === idA)
    const eb = g.estipulantes.find((x) => x.id === idB)
    const ra = ea?.razaoSocial ?? byEst.get(idA)?.[0]?.estipulante.razaoSocial ?? ''
    const rb = eb?.razaoSocial ?? byEst.get(idB)?.[0]?.estipulante.razaoSocial ?? ''
    return ra.localeCompare(rb, 'pt-BR', { sensitivity: 'base' })
  })

  const blocos: BlocoEstipulanteVisao[] = []
  for (const estId of ordenado) {
    const eRow = g.estipulantes.find((x) => x.id === estId)
    const apsRaw = byEst.get(estId) ?? []
    if (!eRow && apsRaw.length === 0) continue
    const src = eRow ?? apsRaw[0]!.estipulante
    const aps = sortVisaoApolices(apsRaw)
    blocos.push({
      chaveEst: estId,
      cabecalho: {
        razaoSocial: src.razaoSocial,
        cnpj: src.cnpj,
        cnae: eRow?.cnae ?? aps[0]?.estipulante.cnae ?? null,
        nomeFantasia: eRow?.nomeFantasia ?? aps[0]?.estipulante.nomeFantasia ?? null,
        active: eRow?.active ?? true,
      },
      apolices: aps,
    })
  }
  return blocos
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

/** Compara nomes de grupo Nexus vs portal (tolera «1 TELECOM» vs «1TELECOM»). */
function normGrupoChaveContratoVisao(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}

/** Alinha com `filterContratosForEstipulante` na API (grupo + opcional cliente Nexus); aceita também o nome do grupo local. */
function contratoLigaEstVisao(c: NexusContratoOpcao, e: CadastroVisaoEstipulanteRow): boolean {
  const cg = normGrupoChaveContratoVisao(c.grupoEconomico)
  if (!cg) return false
  const gEst = normGrupoChaveContratoVisao(e.grupoEconomicoNome)
  const gPortal = normGrupoChaveContratoVisao(e.grupo?.nome ?? '')
  if (cg !== gEst && cg !== gPortal) return false
  const estCli = e.nexusClienteId?.trim()
  const cCli = c.clienteId?.trim()
  if (estCli && cCli) return estCli.toLowerCase() === cCli.toLowerCase()
  return true
}

/**
 * Antes gerava linhas «só Nexus» por contrato quando já havia estipulante no portal.
 * Regra actual: **sem apólice vinculada na base** → não mostrar linha de apólice sintética;
 * o utilizador vê só o estipulante com campos da apólice vazios («—»), até cadastrar/importar.
 */
function syntheticNexusApolicesParaVisao(
  _ests: CadastroVisaoEstipulanteRow[],
  _portal: CadastroVisaoGeralApolice[],
  _contratos: NexusContratoOpcao[],
): CadastroVisaoGeralApolice[] {
  return []
}

function contratoJaAbsorvidoVisao(
  c: NexusContratoOpcao,
  ests: CadastroVisaoEstipulanteRow[],
  portal: CadastroVisaoGeralApolice[],
  synComEst: CadastroVisaoGeralApolice[],
): boolean {
  if (portal.some((a) => (a.nexusContratoId?.trim() ?? '') === c.nexusContratoId)) return true
  if (synComEst.some((a) => a.nexusContratoId === c.nexusContratoId)) return true
  const estMatches = ests.filter((e) => contratoLigaEstVisao(c, e))
  if (estMatches.length === 0) return false
  return portal.some((a) => {
    if (a.nexusContratoId?.trim()) return false
    if (normNumeroApolice(a.numeroApolice) !== normNumeroApolice(c.numero)) return false
    return estMatches.some((e) => e.id === a.estipulante.id)
  })
}

/**
 * Contratos Nexus cujo grupo/cliente não tem estipulante no portal — criam estipulante + apólice sintéticos
 * para o grupo económico aparecer na visão geral (soma com estipulantes vindos da API).
 */
function syntheticNexusOrfaosVisao(
  ests: CadastroVisaoEstipulanteRow[],
  portal: CadastroVisaoGeralApolice[],
  contratos: NexusContratoOpcao[],
  synComEst: CadastroVisaoGeralApolice[],
): { estExtras: CadastroVisaoEstipulanteRow[]; aps: CadastroVisaoGeralApolice[] } {
  const estByKey = new Map<string, CadastroVisaoEstipulanteRow>()
  const aps: CadastroVisaoGeralApolice[] = []

  for (const c of contratos) {
    if (contratoJaAbsorvidoVisao(c, ests, portal, synComEst)) continue

    const estMatches = ests.filter((e) => contratoLigaEstVisao(c, e))
    /** Já existe estipulante no portal: não criar linha de apólice Nexus (fica vazio até haver apólice na base). */
    if (estMatches.length > 0) continue

    const gRaw = (c.grupoEconomico || '').trim() || '— (grupo não informado no snapshot)'
    const gk =
      normGrupoChaveContratoVisao(c.grupoEconomico) ||
      `__sem_grupo__${c.nexusContratoId.replace(/[^a-z0-9-]/gi, '_')}`

    const cliRaw = (c.clienteId || '').trim()
    const clientKey = cliRaw ? cliRaw.toLowerCase() : `sem_cli_grupo_${gk}`

    const ek = `${gk}|${clientKey}`

    let est = estByKey.get(ek)
    if (!est) {
      const safeEk = ek.replace(/[^a-z0-9|_-]/gi, '_').slice(0, 96)
      est = {
        id: `__nexus_orf_est__${safeEk}`,
        active: true,
        razaoSocial: cliRaw
          ? `Cliente Nexus (${cliRaw})`
          : `Estipulante — ${gRaw} (sem cliente no snapshot; completar no portal)`,
        cnpj: '—',
        cnae: null,
        grupoEconomicoNome: gRaw || '—',
        grupoEconomicoId: null,
        nexusClienteId: cliRaw || null,
        nomeFantasia: null,
        observacoes: 'Sem estipulante cadastrado no portal para este grupo/cliente; apenas snapshot Nexus.',
        grupo: null,
        _count: { apolices: 0 },
        somenteNexus: true,
      }
      estByKey.set(ek, est)
    }

    aps.push({
      id: `__nexus_contrato__${c.nexusContratoId}`,
      active: true,
      numeroApolice: c.numero,
      produto: 'OUTROS',
      fornecedor: '—',
      subestipulante: '—',
      plano: null,
      coberturas: null,
      vigenciaInicio: null,
      vigenciaFim: null,
      nexusContratoId: c.nexusContratoId,
      observacoes: `Contrato Nexus (sem estipulante no portal). Estado no snapshot: ${c.status}.`,
      estipulante: {
        id: est.id,
        razaoSocial: est.razaoSocial,
        grupoEconomicoNome: est.grupoEconomicoNome,
        grupoEconomicoId: est.grupoEconomicoId,
        cnpj: est.cnpj,
        cnae: est.cnae,
        nexusClienteId: est.nexusClienteId,
        nomeFantasia: est.nomeFantasia,
        observacoes: est.observacoes,
        grupo: est.grupo,
      },
      _count: { itens: 0 },
      somenteNexus: true,
    })
  }

  return { estExtras: [...estByKey.values()], aps }
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
  const nextEstOffsetRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [gruposEconomicosCount, setGruposEconomicosCount] = useState<number | null>(null)
  const [estipulantesCount, setEstipulantesCount] = useState<number | null>(null)
  const [apolicesTotalCount, setApolicesTotalCount] = useState<number | null>(null)
  const [apolices, setApolices] = useState<CadastroVisaoGeralApolice[]>([])
  const [estipulantesVisao, setEstipulantesVisao] = useState<CadastroVisaoEstipulanteRow[]>([])
  /** Snapshot `contratos` Nexus — só após pedido explícito (evita carregar milhares de linhas logo ao abrir). */
  const [contratosNexusVisao, setContratosNexusVisao] = useState<NexusContratoOpcao[]>([])
  const [nexusContratosCarregados, setNexusContratosCarregados] = useState(false)
  const [nexusContratosLoading, setNexusContratosLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [detailAp, setDetailAp] = useState<CadastroVisaoGeralApolice | null>(null)
  const [detailItensLoading, setDetailItensLoading] = useState(false)
  /** `true` só após JSON válido com `apolices` array (evita mensagem “base vazia” quando a API falhou). */
  const [visaoLoadOk, setVisaoLoadOk] = useState(false)
  const [loadHint, setLoadHint] = useState<string | null>(null)
  const [visaoApolicesTruncated, setVisaoApolicesTruncated] = useState(false)
  /** Espelha `visaoMeta.carga` da API (hierarquia = estipulantes primeiro, depois apólices). */
  const [visaoMetaCarga, setVisaoMetaCarga] = useState<'hierarquia' | 'apolices_recent'>('hierarquia')
  const [healthBusy, setHealthBusy] = useState(false)
  const [healthHint, setHealthHint] = useState<string | null>(null)
  /** Há mais titulares para pedir com `offset` (modo hierarquia). */
  const [hasMoreEstipulantes, setHasMoreEstipulantes] = useState(false)

  const VISAO_PAGE_SIZE = 400
  const NEXUS_CONTRATOS_VISAO_LIMIT = 1500

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

  const load = useCallback(
    async (append: boolean) => {
      if (!append) {
        setLoading(true)
        nextEstOffsetRef.current = 0
        setVisaoLoadOk(false)
        setLoadHint(null)
        setVisaoApolicesTruncated(false)
        setContratosNexusVisao([])
        setNexusContratosCarregados(false)
        onError(null)
      } else {
        setLoadingMore(true)
        onError(null)
      }
      try {
        const offset = append ? nextEstOffsetRef.current : 0
        const r = await api<{
          gruposEconomicosCount: number
          estipulantesCount: number
          apolicesTotalCount: number
          apolices: CadastroVisaoGeralApolice[]
          estipulantes?: CadastroVisaoEstipulanteRow[]
          visaoMeta?: {
            carga?: string
            limit: number
            offset: number
            returned: number
            returnedEstipulantes?: number
            sort?: string
            apolicesTruncated?: boolean
          }
        }>(
          `/seguros/cadastro-visao-geral?carga=hierarquia&limit=${VISAO_PAGE_SIZE}&offset=${offset}&sort=recent`,
        )

        if (!r.ok) {
          onError(r.error || 'Erro ao carregar visão geral do cadastro.')
          if (!append) {
            setApolices([])
            setEstipulantesVisao([])
            setGruposEconomicosCount(null)
            setEstipulantesCount(null)
            setApolicesTotalCount(null)
          }
          return
        }
        if (!r.data || typeof r.data !== 'object') {
          onError('Resposta vazia ou inválida da API.')
          if (!append) {
            setApolices([])
            setEstipulantesVisao([])
            setGruposEconomicosCount(null)
            setEstipulantesCount(null)
            setApolicesTotalCount(null)
          }
          return
        }
        const d = r.data
        if (!Array.isArray(d.apolices)) {
          onError(
            'A API devolveu um formato anómalo (sem lista de apólices). Confirme o deploy da API portal-colaborador no Railway e a variável VITE_API_URL no Vercel (URL da API, não do site).',
          )
          if (!append) {
            setApolices([])
            setEstipulantesVisao([])
            setGruposEconomicosCount(null)
            setEstipulantesCount(null)
            setApolicesTotalCount(null)
          }
          return
        }

        const gruposEconomicosCountLocal = d.gruposEconomicosCount ?? 0
        const estipulantesCountLocal = d.estipulantesCount ?? 0
        const apolicesTotalCountLocal = d.apolicesTotalCount ?? 0
        const estipulantesDaApi = Array.isArray(d.estipulantes) ? d.estipulantes : []
        const retEst = d.visaoMeta?.returnedEstipulantes ?? estipulantesDaApi.length

        setLoadHint(null)
        setVisaoLoadOk(true)
        setVisaoMetaCarga(d.visaoMeta?.carga === 'apolices_recent' ? 'apolices_recent' : 'hierarquia')
        setGruposEconomicosCount(gruposEconomicosCountLocal)
        setEstipulantesCount(estipulantesCountLocal)
        setApolicesTotalCount(apolicesTotalCountLocal)
        setVisaoApolicesTruncated(d.visaoMeta?.apolicesTruncated === true)
        setHasMoreEstipulantes(d.visaoMeta?.apolicesTruncated === true)

        if (append) {
          setApolices((prev) => sortVisaoApolices([...prev, ...d.apolices]))
          setEstipulantesVisao((prev) => [...prev, ...estipulantesDaApi])
        } else {
          setEstipulantesVisao(estipulantesDaApi)
          setApolices(sortVisaoApolices(d.apolices))
        }
        nextEstOffsetRef.current = offset + retEst
      } finally {
        if (!append) setLoading(false)
        else setLoadingMore(false)
        setLoadHint(null)
      }
    },
    [onError],
  )

  const carregarContratosNexusOpcional = useCallback(async () => {
    setNexusContratosLoading(true)
    onError(null)
    const rCt = await api<{
      ok?: boolean
      needsSync?: boolean
      contratos?: NexusContratoOpcao[]
      contratosMeta?: { limit: number; returned: number }
    }>(`/seguros/nexus/contratos-opcoes?limit=${NEXUS_CONTRATOS_VISAO_LIMIT}`)
    setNexusContratosLoading(false)
    if (rCt.ok && Array.isArray(rCt.data?.contratos)) {
      setContratosNexusVisao(rCt.data!.contratos!)
      setNexusContratosCarregados(true)
    } else {
      setContratosNexusVisao([])
      setNexusContratosCarregados(false)
    }
  }, [onError])

  useEffect(() => {
    void load(false)
  }, [load])

  const { apolicesVisaoComNexus, estipulantesVisaoComNexus, somenteNexusNaVisaoCount } = useMemo(() => {
    const syn = syntheticNexusApolicesParaVisao(estipulantesVisao, apolices, contratosNexusVisao)
    const orf = syntheticNexusOrfaosVisao(estipulantesVisao, apolices, contratosNexusVisao, syn)
    const todasSyn = [...syn, ...orf.aps]
    return {
      apolicesVisaoComNexus: sortVisaoApolices([...apolices, ...todasSyn]),
      estipulantesVisaoComNexus: [...estipulantesVisao, ...orf.estExtras],
      somenteNexusNaVisaoCount: todasSyn.length,
    }
  }, [apolices, contratosNexusVisao, estipulantesVisao])

  const openDetail = useCallback(
    (a: CadastroVisaoGeralApolice) => {
      setDetailAp({ ...a, itens: [] })
      if (a.somenteNexus || a.id.startsWith('__nexus_contrato__')) {
        setDetailItensLoading(false)
        return
      }
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
    if (!searchTerm.trim()) return apolicesVisaoComNexus
    return apolicesVisaoComNexus.filter((a) =>
      visaoMatchesQuery(searchTerm, [
        a.numeroApolice,
        PRODUTO_LABEL[a.produto],
        a.fornecedor,
        a.subestipulante ?? '',
        a.plano,
        a.coberturas,
        a.nexusContratoId,
        a.observacoes,
        a.estipulante.razaoSocial,
        a.estipulante.cnpj,
        a.estipulante.cnae,
        a.estipulante.grupoEconomicoNome,
        a.estipulante.nomeFantasia,
        a.estipulante.observacoes,
        a.estipulante.nexusClienteId,
        labelGrupoEconomico(a.estipulante),
        a.somenteNexus ? 'só nexus snapshot contrato' : null,
      ]),
    )
  }, [apolicesVisaoComNexus, searchTerm])

  const filterEst = useMemo(() => {
    if (!searchTerm.trim()) return estipulantesVisaoComNexus
    return estipulantesVisaoComNexus.filter((e) =>
      visaoMatchesQuery(searchTerm, [
        e.razaoSocial,
        e.cnpj,
        e.cnae,
        e.grupoEconomicoNome,
        e.nexusClienteId,
        e.nomeFantasia,
        e.observacoes,
        labelGrupoEconomico(e),
        e.somenteNexus ? 'só nexus snapshot estipulante sintético' : null,
      ]),
    )
  }, [estipulantesVisaoComNexus, searchTerm])

  const filterEstReaisCount = useMemo(
    () => filterEst.filter((e) => !estipulanteEVicioContagemVisao(e)).length,
    [filterEst],
  )

  const semApolicesComEstipulantes =
    visaoLoadOk &&
    (apolicesTotalCount ?? 0) === 0 &&
    somenteNexusNaVisaoCount === 0 &&
    estipulantesVisaoComNexus.length > 0

  const gruposVisao = useMemo(
    () => agruparVisaoPorGrupo(filterEst, filterAp),
    [filterEst, filterAp],
  )
  const temConteudoVisao = gruposVisao.length > 0

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        <Accordion defaultExpanded={false} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>Como funciona esta vista</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Agrupamento por <strong>grupo económico</strong> (accordeões). Dentro: <strong>titular</strong> e tabela de{' '}
              <strong>apólices</strong> (uma linha por apólice). Dados gravados em PostgreSQL podem abrir a{' '}
              <strong>ficha completa</strong>; contratos apenas no snapshot Nexus ficam como «Só Nexus» até cadastrar no portal. A
              primeira carga é limitada; use <strong>Carregar mais titulares</strong> e, se precisar, <strong>Mostrar contratos só Nexus</strong>.
            </Typography>
          </AccordionDetails>
        </Accordion>

        {visaoLoadOk && visaoApolicesTruncated ? (
          visaoMetaCarga === 'hierarquia' ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <strong>Desempenho: lista parcial por titular.</strong> Cada pedido traz até <strong>{VISAO_PAGE_SIZE}</strong> estipulantes e as apólices
              ligadas. Clique em <strong>Carregar mais titulares</strong> para continuar a paginação.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <strong>Modo legado: lista parcial por apólice.</strong> Foram carregadas as apólices{' '}
              <strong>mais recentemente alteradas</strong> (até <strong>{VISAO_PAGE_SIZE}</strong> linhas por pedido). O
              total na base é <strong>{apolicesTotalCount ?? '—'}</strong> — linhas mais antigas não aparecem nesta vista
              até aumentar <code>limit</code> em <code>GET /seguros/cadastro-visao-geral</code> ou adicionar «carregar mais»
              no portal.
            </Alert>
          )
        ) : null}

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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button size="small" variant="outlined" disabled={loading || loadingMore} onClick={() => void load(false)}>
            Recarregar vista
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={loadingMore || !hasMoreEstipulantes || loading || !visaoLoadOk}
            onClick={() => void load(true)}
          >
            {loadingMore ? 'A carregar…' : 'Carregar mais titulares'}
          </Button>
          <Button
            size="small"
            variant={nexusContratosCarregados ? 'outlined' : 'contained'}
            color="secondary"
            disabled={nexusContratosLoading || loading}
            onClick={() => void carregarContratosNexusOpcional()}
          >
            {nexusContratosLoading
              ? 'A carregar Nexus…'
              : nexusContratosCarregados
                ? 'Atualizar contratos Nexus'
                : 'Mostrar contratos só Nexus (opcional)'}
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Na base: <strong>{loading ? '…' : (gruposEconomicosCount ?? '—')}</strong> grupos (cadastro local){' · '}
            <strong>{loading ? '…' : (estipulantesCount ?? '—')}</strong> estipulantes ·{' '}
            <strong>{loading ? '…' : (apolicesTotalCount ?? '—')}</strong> apólices na base do portal (total)
            {visaoLoadOk && somenteNexusNaVisaoCount > 0 ? (
              <>
                {' · '}
                <strong>{somenteNexusNaVisaoCount}</strong> contrato(s) só Nexus na vista (snapshot)
              </>
            ) : null}
            {' · '}
            <strong>{loading ? '…' : filterAp.length}</strong> apólice(s) no filtro ·{' '}
            <strong>{loading ? '…' : filterEstReaisCount}</strong> estipulante(s) no filtro ·{' '}
            <strong>{loading ? '…' : gruposVisao.length}</strong> grupo(s) distinto(s) na vista
            {visaoLoadOk ? (
              <>
                {' · '}
                <strong>{estipulantesVisao.length}</strong> titular(es) carregado(s) nesta vista · <strong>{apolices.length}</strong> apólice(s) em memória
              </>
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
            ) : (estipulantesVisaoComNexus.length ?? 0) === 0 && (apolicesTotalCount ?? 0) === 0 && contratosNexusVisao.length === 0 ? (
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
                  portal não tem o que vincular: crie apólices no menu <strong>Apólices</strong> (ou fluxo que grave na <strong>mesma</strong> API). Contratos só no Nexus aparecem na visão geral como linhas <strong>«Só Nexus»</strong> até
                  serem complementados. Se o teste abaixo der certo e o
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

            {(apolicesTotalCount ?? 0) === 0 && somenteNexusNaVisaoCount > 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                A tabela <strong>PortalSeguroApolice</strong> está vazia nesta API, mas o snapshot Nexus devolveu{' '}
                <strong>{somenteNexusNaVisaoCount}</strong> contrato(s) ligados aos estipulantes abaixo. Essas linhas aparecem como <strong>«Só Nexus»</strong> (igual no menu Apólices); use <strong>Complementar / cadastrar</strong> para
                gravar no portal.
              </Alert>
            ) : null}

            {gruposVisao.map((g) => (
              <Accordion
                key={g.key}
                defaultExpanded={false}
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
                    <Chip size="small" label={`${contarEstipulantesReaisGrupo(g)} estipulante(s)`} variant="outlined" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.estipulantes.length > 0 || g.apolices.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
                        Por titular: razão social, CNPJ e CNAE acima das apólices que lhe pertencem neste grupo.
                      </Typography>
                      {blocosPorEstipulanteVisaoGrupo(g).map((bloco) => (
                        <Box key={bloco.chaveEst} sx={{ mb: 2 }}>
                          <Paper
                            variant="outlined"
                            sx={{
                              mx: 2,
                              mb: 1,
                              px: 2,
                              py: 1.5,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                              {bloco.cabecalho.razaoSocial}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              CNPJ: {bloco.cabecalho.cnpj}
                              {bloco.cabecalho.cnae ? ` · CNAE: ${bloco.cabecalho.cnae}` : ''}
                              {bloco.cabecalho.nomeFantasia
                                ? ` · Nome fantasia: ${bloco.cabecalho.nomeFantasia}`
                                : ''}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={bloco.cabecalho.active ? 'Estipulante ativo' : 'Estipulante inativo'}
                                color={bloco.cabecalho.active ? 'success' : 'default'}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`${bloco.apolices.length} apólice(s) neste titular`}
                                variant={bloco.apolices.length === 0 ? 'outlined' : 'filled'}
                                color={bloco.apolices.length === 0 ? 'default' : 'primary'}
                              />
                            </Box>
                          </Paper>
                          {bloco.apolices.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
                              Sem apólices nesta vista para este titular.
                            </Typography>
                          ) : (
                            <TableContainer sx={{ maxHeight: 360 }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Situação</TableCell>
                                    <TableCell>Nº apólice</TableCell>
                                    <TableCell>Produto</TableCell>
                                    <TableCell>Fornecedor</TableCell>
                                    <TableCell>Vigência</TableCell>
                                    <TableCell align="center">Itens</TableCell>
                                    <TableCell align="right">Ficha</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {bloco.apolices.map((a) => {
                                    const nx = a.somenteNexus || a.id.startsWith('__nexus_contrato__')
                                    return (
                                      <TableRow
                                        key={`ap-${a.id}`}
                                        hover
                                        onClick={() => openDetail(a)}
                                        sx={{
                                          cursor: 'pointer',
                                          opacity: a.active ? 1 : 0.78,
                                          bgcolor: a.active ? 'inherit' : 'action.hover',
                                          '&:hover': { bgcolor: 'action.selected' },
                                        }}
                                      >
                                        <TableCell sx={{ verticalAlign: 'middle' }}>
                                          {nx ? (
                                            <Chip size="small" label="Só Nexus" color="info" variant="outlined" />
                                          ) : (
                                            <Chip
                                              size="small"
                                              label={a.active ? 'Apólice ativa' : 'Apólice inativa'}
                                              color={a.active ? 'success' : 'default'}
                                              variant="outlined"
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top', fontWeight: 600 }}>{a.numeroApolice}</TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>{PRODUTO_LABEL[a.produto]}</TableCell>
                                        <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>{a.fornecedor}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                          {fmtDate(a.vigenciaInicio)} — {fmtDate(a.vigenciaFim)}
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                          <Chip size="small" label={`${visaoItensCount(a)}`} variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                                          {!nx ? (
                                            <Button
                                              component={RouterLink}
                                              size="small"
                                              variant="outlined"
                                              to={`/apolice/editar/${a.id}`}
                                            >
                                              Ficha completa
                                            </Button>
                                          ) : (
                                            <Typography variant="caption" color="text.secondary">
                                              —
                                            </Typography>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Box>
                      ))}
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
                {detailAp.somenteNexus || detailAp.id.startsWith('__nexus_contrato__') ? (
                  <Chip size="small" sx={{ mt: 0.5, display: 'block', width: 'fit-content' }} label="Só Nexus (snapshot)" color="info" variant="outlined" />
                ) : (
                  <Chip
                    size="small"
                    sx={{ mt: 0.5 }}
                    label={detailAp.active ? 'Ativa' : 'Inativa'}
                    color={detailAp.active ? 'success' : 'default'}
                    variant="outlined"
                  />
                )}
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
              CNAE: {detailAp.estipulante.cnae ?? '—'}
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
              Subestipulante: {detailAp.subestipulante?.trim() ? detailAp.subestipulante : '—'}
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
                {detailAp.somenteNexus || detailAp.id.startsWith('__nexus_contrato__')
                  ? 'Sem itens no portal: esta linha existe só no snapshot Nexus. Abra o menu Apólices e use Complementar / cadastrar para criar a apólice na base.'
                  : 'Sem itens cadastrados.'}
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

            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {!detailAp.somenteNexus && !detailAp.id.startsWith('__nexus_contrato__') ? (
                <Button component={RouterLink} variant="contained" fullWidth to={`/apolice/editar/${detailAp.id}`}>
                  Abrir ficha completa (todas as abas)
                </Button>
              ) : null}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setDetailAp(null)
                  setDetailItensLoading(false)
                }}
              >
                Fechar pré-visualização
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
  const [classificacao, setClassificacao] = useState<GrupoClassificacao>('CLIENTE')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEdit(null)
    setNome('')
    setCnpj('')
    setObservacoes('')
    setClassificacao('CLIENTE')
    setOpen(true)
  }

  function openRow(g: Grupo) {
    setEdit(g)
    setNome(g.nome)
    setCnpj(g.cnpj ?? '')
    setObservacoes(g.observacoes ?? '')
    setClassificacao(g.classificacao === 'PROSPECT' ? 'PROSPECT' : 'CLIENTE')
    setOpen(true)
  }

  async function save() {
    onError(null)
    setSaving(true)
    if (edit) {
      const r = await api<{ grupo: Grupo }>(`/seguros/grupos-economicos/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome,
          cnpj: cnpj.trim() || null,
          observacoes: observacoes.trim() || null,
          classificacao,
        }),
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
        body: JSON.stringify({
          nome,
          cnpj: cnpj.trim() || null,
          observacoes: observacoes.trim() || null,
          classificacao,
        }),
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
    if (
      !window.confirm(
        'Remover este grupo local? Os estipulantes deixam de apontar para este registo (não são apagados).',
      )
    )
      return
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
          <Typography variant="caption" color="text.secondary" component="span" display="block">
            Usados para vínculos com <strong>estipulantes</strong> e <strong>apólices</strong> neste módulo (cadastro interno). O quadro acima reflete apenas o Nexus. Marque{' '}
            <strong>Prospect</strong> para grupos apenas como possíveis clientes futuros; registos existentes no portal entram como <strong>Cliente</strong>.
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
              <TableCell>Tipo</TableCell>
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
                <TableCell>
                  <Chip
                    size="small"
                    label={GRUPO_CLASSIFICACAO_LABEL[g.classificacao === 'PROSPECT' ? 'PROSPECT' : 'CLIENTE']}
                    color={g.classificacao === 'PROSPECT' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
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
          <FormControl fullWidth>
            <InputLabel id="grupo-classificacao-label">Classificação</InputLabel>
            <Select<GrupoClassificacao>
              labelId="grupo-classificacao-label"
              label="Classificação"
              value={classificacao}
              onChange={(e) => setClassificacao(e.target.value as GrupoClassificacao)}
            >
              <MenuItem value="CLIENTE">Cliente (já cliente ou consolidado)</MenuItem>
              <MenuItem value="PROSPECT">Prospect (possível cliente futuro)</MenuItem>
            </Select>
          </FormControl>
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
  const [cnae, setCnae] = useState('')
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
    setCnae('')
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
    setCnae('')
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
    setCnae(e.cnae ?? '')
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
          cnae: cnae.trim() || null,
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
          cnae: cnae.trim() || null,
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
                <TableCell>CNAE</TableCell>
                <TableCell>Nome fantasia</TableCell>
                <TableCell>Cliente Nexus</TableCell>
                <TableCell>Apólices</TableCell>
                {isAdmin ? <TableCell align="right">Ações</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} sx={{ py: 2, color: 'text.secondary' }}>
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
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.e.cnae ?? '—'}</TableCell>
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
          <TextField
            label="CNAE"
            value={cnae}
            onChange={(e) => setCnae(e.target.value)}
            fullWidth
            placeholder="ex.: 6201-5/00"
            helperText="Classificação Nacional de Atividades Económicas (opcional)."
          />
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

type NovaApoliceSubRow = {
  razaoSocial: string
  cnpj: string
  codigoSub: string
  status: 'ATIVO' | 'CANCELADO'
}

function novaApoliceSubRowVazia(): NovaApoliceSubRow {
  return { razaoSocial: '', cnpj: '', codigoSub: '', status: 'ATIVO' }
}

function ApolicesSection({ isAdmin, onError }: { isAdmin: boolean; onError: (s: string | null) => void }) {
  const navigate = useNavigate()
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
  const [nexusContratoId, setNexusContratoId] = useState('')
  const [numeroApolice, setNumeroApolice] = useState('')
  const [produto, setProduto] = useState<ApoliceProduto>('OUTROS')
  const [fornecedor, setFornecedor] = useState('')
  const [operadoraIdNova, setOperadoraIdNova] = useState('')
  const [operadorasCat, setOperadorasCat] = useState<{ id: string; nome: string }[]>([])
  const [novaOperadoraNome, setNovaOperadoraNome] = useState('')
  const [salvandoOperadora, setSalvandoOperadora] = useState(false)
  const [subRows, setSubRows] = useState<NovaApoliceSubRow[]>([novaApoliceSubRowVazia()])
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

  useEffect(() => {
    void (async () => {
      const r = await api<{ operadoras: { id: string; nome: string }[] }>('/seguros/operadoras')
      if (r.ok) setOperadorasCat(r.data?.operadoras ?? [])
    })()
  }, [])

  async function criarOperadoraCatalogo() {
    const nome = novaOperadoraNome.trim()
    if (!nome) return
    if (!isAdmin) {
      onError('Apenas administradores podem adicionar operadoras ao catálogo.')
      return
    }
    setSalvandoOperadora(true)
    onError(null)
    const r = await api<{ operadora: { id: string; nome: string } }>('/seguros/operadoras', {
      method: 'POST',
      body: JSON.stringify({ nome }),
    })
    setSalvandoOperadora(false)
    if (!r.ok) {
      onError(r.error || 'Não foi possível criar a operadora.')
      return
    }
    const created = r.data?.operadora
    if (created) {
      setOperadorasCat((prev) => [...prev.filter((o) => o.id !== created.id), { id: created.id, nome: created.nome }].sort((a, b) => a.nome.localeCompare(b.nome)))
      setOperadoraIdNova(created.id)
      setFornecedor(created.nome)
      setNovaOperadoraNome('')
    }
  }

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
    setNexusContratoId('')
    setNumeroApolice('')
    setProduto('OUTROS')
    setFornecedor('')
    setOperadoraIdNova('')
    setNovaOperadoraNome('')
    setSubRows([novaApoliceSubRowVazia()])
    setPlano('')
    setCoberturas('')
    setVigIni('')
    setVigFim('')
    setObsAp('')
    setOpen(true)
  }

  function openCadastrarDesdeContratoNexus(c: NexusContratoOpcao) {
    if (!estipulanteId) return
    setNexusContratoId(c.nexusContratoId)
    setNumeroApolice(c.numero)
    setProduto('OUTROS')
    setFornecedor('')
    setOperadoraIdNova('')
    setNovaOperadoraNome('')
    setSubRows([novaApoliceSubRowVazia()])
    setPlano('')
    setCoberturas('')
    setVigIni('')
    setVigFim('')
    setObsAp('')
    setOpen(true)
  }

  async function saveNew() {
    onError(null)
    setSaving(true)
    const subPayload = subRows
      .map((r) => ({
        razaoSocial: r.razaoSocial.trim(),
        cnpj: r.cnpj.trim(),
        codigoSub: r.codigoSub.trim(),
        status: r.status,
      }))
      .filter((r) => r.razaoSocial.length > 0)

    if (!operadoraIdNova.trim() && !fornecedor.trim()) {
      setSaving(false)
      onError('Selecione a operadora no catálogo ou informe o fornecedor em texto.')
      return
    }

    const base: Record<string, unknown> = {
      produto,
      ...(operadoraIdNova.trim() ? { operadoraId: operadoraIdNova.trim() } : { fornecedor: fornecedor.trim() }),
      ...(subPayload.length > 0 ? { subestipulantes: subPayload } : {}),
      plano: showPlano ? plano.trim() : null,
      coberturas: showCoberturas ? coberturas.trim() : null,
      vigenciaInicio: vigIni.trim() || null,
      vigenciaFim: vigFim.trim() || null,
      observacoes: obsAp.trim() || null,
    }
    const nex = nexusContratoId.trim()
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
                <TableCell>Subestipulantes</TableCell>
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
                    <TableCell>{row.a.operadora?.nome ?? row.a.fornecedor}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{resumoSubestipulantesEmLista(row.a)}</TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>{row.a.plano ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{row.a.coberturas ?? '—'}</TableCell>
                    <TableCell>
                      {fmtDate(row.a.vigenciaInicio)} — {fmtDate(row.a.vigenciaFim)}
                    </TableCell>
                    <TableCell>{row.a._count?.itens ?? '—'}</TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Button size="small" onClick={() => navigate(`/apolice/editar/${row.a.id}`)}>
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
        <DialogTitle>Nova apólice</DialogTitle>
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
            <FormControl fullWidth size="small">
              <InputLabel id="op-nova-ap">Operadora (catálogo)</InputLabel>
              <Select
                labelId="op-nova-ap"
                label="Operadora (catálogo)"
                value={operadoraIdNova}
                onChange={(e: SelectChangeEvent) => {
                  const v = e.target.value
                  setOperadoraIdNova(v)
                  const op = operadorasCat.find((o) => o.id === v)
                  if (op) setFornecedor(op.nome)
                }}
              >
                <MenuItem value="">
                  <em>Outra — usar texto livre abaixo</em>
                </MenuItem>
                {operadorasCat.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={operadoraIdNova ? 'Fornecedor (catálogo)' : 'Fornecedor (texto livre)'}
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              fullWidth
              disabled={!!operadoraIdNova}
              required={!operadoraIdNova}
              sx={{ gridColumn: { sm: 'span 2' } }}
              helperText={
                operadoraIdNova
                  ? 'Sincronizado com a operadora selecionada.'
                  : 'Quando não existir no catálogo, preencha aqui ou peça a um administrador para adicionar ao catálogo.'
              }
            />
            {isAdmin ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                sx={{ gridColumn: { sm: 'span 2' } }}
              >
                <TextField
                  size="small"
                  label="Nome para nova operadora"
                  value={novaOperadoraNome}
                  onChange={(e) => setNovaOperadoraNome(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  disabled={!novaOperadoraNome.trim() || salvandoOperadora}
                  onClick={() => void criarOperadoraCatalogo()}
                >
                  Adicionar ao catálogo
                </Button>
              </Stack>
            ) : null}
            <Typography variant="subtitle2" sx={{ gridColumn: { sm: 'span 2' }, mt: 0.5 }}>
              Empresas subestipulantes (opcional)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ gridColumn: { sm: 'span 2' }, display: 'block', mt: -0.5 }}>
              Razão social obrigatória por linha guardada. CNPJ, código SUB e status Ativo/Cancelado são opcionais.
            </Typography>
            <Stack spacing={1.5} sx={{ gridColumn: { sm: 'span 2' } }}>
              {subRows.map((sr, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField
                      label="Razão social"
                      value={sr.razaoSocial}
                      onChange={(e) =>
                        setSubRows((prev) => prev.map((r, j) => (j === idx ? { ...r, razaoSocial: e.target.value } : r)))
                      }
                      size="small"
                      sx={{ flex: '2 1 200px', minWidth: 180 }}
                    />
                    <TextField
                      label="CNPJ"
                      value={sr.cnpj}
                      onChange={(e) =>
                        setSubRows((prev) => prev.map((r, j) => (j === idx ? { ...r, cnpj: e.target.value } : r)))
                      }
                      size="small"
                      sx={{ flex: '1 1 140px', minWidth: 120 }}
                    />
                    <TextField
                      label="Código SUB"
                      value={sr.codigoSub}
                      onChange={(e) =>
                        setSubRows((prev) => prev.map((r, j) => (j === idx ? { ...r, codigoSub: e.target.value } : r)))
                      }
                      size="small"
                      sx={{ flex: '1 1 120px', minWidth: 100 }}
                    />
                    <FormControl size="small" sx={{ flex: '0 1 140px', minWidth: 120 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={sr.status}
                        onChange={(e) =>
                          setSubRows((prev) =>
                            prev.map((r, j) =>
                              j === idx ? { ...r, status: e.target.value as NovaApoliceSubRow['status'] } : r,
                            ),
                          )
                        }
                      >
                        <MenuItem value="ATIVO">Ativo</MenuItem>
                        <MenuItem value="CANCELADO">Cancelado</MenuItem>
                      </Select>
                    </FormControl>
                    {subRows.length > 1 ? (
                      <IconButton aria-label="Remover linha" onClick={() => setSubRows((prev) => prev.filter((_, j) => j !== idx))}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    ) : null}
                  </Box>
                </Paper>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setSubRows((prev) => [...prev, novaApoliceSubRowVazia()])}
              >
                Adicionar subestipulante
              </Button>
            </Stack>
            {showPlano ? (
              <TextField
                label="Plano (texto livre)"
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
                fullWidth
                sx={{ gridColumn: { sm: 'span 2' } }}
                helperText="Opcional se usar «Dados do seguro» com planos estruturados (vários códigos / faixas etárias)."
              />
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
            disabled={saving || !numeroOk || !fornecedor.trim()}
            onClick={() => void saveNew()}
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

function ApolicesEItensSection({ isAdmin, onError }: { isAdmin: boolean; onError: (s: string | null) => void }) {
  const [tab, setTab] = useState<'apolices' | 'itens'>('apolices')
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as 'apolices' | 'itens')}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab value="apolices" label="Apólices" />
        <Tab value="itens" label="Itens (por apólice)" />
      </Tabs>
      {tab === 'apolices' ? <ApolicesSection isAdmin={isAdmin} onError={onError} /> : <ItensSection isAdmin={isAdmin} onError={onError} />}
    </Box>
  )
}
