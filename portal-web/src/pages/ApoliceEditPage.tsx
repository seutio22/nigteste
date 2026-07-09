import { useCallback, useEffect, useMemo, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormHelperText,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  type SelectChangeEvent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PageScaffold from '../components/PageScaffold'

const APOLICE_NUMERO_MANUAL = '__manual__'

const FAIXAS = [
  '0-18',
  '19-23',
  '24-28',
  '29-33',
  '34-38',
  '39-43',
  '44-48',
  '49-53',
  '54-58',
  '59+',
] as const

type ApoliceProduto = 'SAUDE' | 'ODONTO' | 'VIDA_GRUPO' | 'OUTROS'
type ModeloDados = 'PLANO' | 'COBERTURA'
type SubStatus = 'ATIVO' | 'CANCELADO'

type NexusContratoOpcao = {
  nexusContratoId: string
  numero: string
  codigo: string
}

type EstRow = { id: string; razaoSocial: string }

type LinhaApi = {
  id: string
  sortOrder: number
  codigoPlano: string
  tipoCusto: 'CUSTO_MEDIO' | 'FAIXA_ETARIA'
  custoMedio: number | null
  valoresPorFaixa: Record<string, number | null> | null
}

type FaturaMesApi = {
  id: string
  competenciaAno: number
  competenciaMes: number
  vidas: number
  valorFatura: number
  observacoes: string | null
}

type TipoFinanceiro = 'comissionamento' | 'fee' | 'comissionamento_fee'

type ComissionamentoApi = {
  id: string
  apoliceId: string
  temCorretorParceiro: boolean | null
  valorAgenciamentoContrato: number | null
  valorVitalicioContrato: number | null
  agenciamentoConsultoria: number[] | null
  vitalicioConsultoria: number[] | null
  agenciamentoCorretor: number[] | null
  vitalicioCorretor: number[] | null
}

type FeeApi = {
  id: string
  apoliceId: string
  valorFeeMensal: number | null
  feeConsultoria: number | null
  feeCorretorParceiro: number | null
}

function parcelasZeros12(): number[] {
  return Array.from({ length: 12 }, () => 0)
}

function parcelasFromApi(a: number[] | null | undefined): number[] {
  if (a && Array.isArray(a) && a.length === 12) {
    return a.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0))
  }
  return parcelasZeros12()
}

/** Mês de competência da parcela: sempre a partir da vigência início; sem vigência válida → «zerado» (—). */
function mesReferenciaParcela(vigIniIso: string, parcelIndex: number): string {
  const t = vigIniIso.trim()
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = d.getMonth()
  const tm = m + parcelIndex
  const dt = new Date(y + Math.floor(tm / 12), tm % 12, 1)
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function comissionamentoHasData(c: ComissionamentoApi | null | undefined): boolean {
  if (!c) return false
  if (c.temCorretorParceiro) return true
  if (c.valorAgenciamentoContrato != null && c.valorAgenciamentoContrato > 0) return true
  if (c.valorVitalicioContrato != null && c.valorVitalicioContrato > 0) return true
  const nz = (arr: number[] | null | undefined) => (arr ?? []).some((x) => x !== 0)
  return nz(c.agenciamentoConsultoria) || nz(c.vitalicioConsultoria) || nz(c.agenciamentoCorretor) || nz(c.vitalicioCorretor)
}

function feeHasData(f: FeeApi | null | undefined): boolean {
  if (!f) return false
  return [f.valorFeeMensal, f.feeConsultoria, f.feeCorretorParceiro].some((x) => x != null && x > 0)
}

type SubApi = {
  id: string
  sortOrder: number
  razaoSocial: string
  cnpj: string
  codigoSub: string
  status: SubStatus
}

type ApoliceDetalhe = {
  id: string
  estipulanteId: string
  nexusContratoId: string | null
  numeroApolice: string
  produto: ApoliceProduto
  operadoraId: string | null
  operadora: { id: string; nome: string } | null
  fornecedor: string
  subestipulante: string | null
  plano: string | null
  coberturas: string | null
  vigenciaInicio: string | null
  vigenciaFim: string | null
  observacoes: string | null
  active: boolean
  modeloDadosSeguro: ModeloDados | null
  comissionamento: ComissionamentoApi | null
  fee: FeeApi | null
  trCone: 'NORTE' | 'SUL' | null
  trDiretoria: string | null
  trSuperintendente: string | null
  trGerente: string | null
  trExecutivoConsultor: string | null
  trAnalista: string | null
  estipulante: {
    id: string
    razaoSocial: string
    grupoEconomicoNome: string
    grupo: { id: string; nome: string } | null
  }
  planoLinhas: LinhaApi[]
  subestipulantes: SubApi[]
  faturasMensais: FaturaMesApi[]
}

type OperadoraOpt = { id: string; nome: string; sortOrder?: number }

type FaturaFormRow = {
  competenciaAno: string
  competenciaMes: string
  vidasStr: string
  valorFaturaStr: string
  observacoes: string
}

function faturaFormVazia(): FaturaFormRow {
  return {
    competenciaAno: String(new Date().getFullYear()),
    competenciaMes: String(new Date().getMonth() + 1),
    vidasStr: '',
    valorFaturaStr: '',
    observacoes: '',
  }
}

function faturasDeApi(rows: FaturaMesApi[]): FaturaFormRow[] {
  if (rows.length === 0) return [faturaFormVazia()]
  return rows.map((f) => ({
    competenciaAno: String(f.competenciaAno),
    competenciaMes: String(f.competenciaMes),
    vidasStr: String(f.vidas),
    valorFaturaStr: f.valorFatura != null ? String(f.valorFatura) : '',
    observacoes: f.observacoes ?? '',
  }))
}

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null
  return <Box sx={{ pt: 2.5, width: '100%', maxWidth: '100%' }}>{children}</Box>
}

type LinhaForm = {
  codigoPlano: string
  tipoCusto: 'CUSTO_MEDIO' | 'FAIXA_ETARIA'
  custoMedioStr: string
  faixas: Record<(typeof FAIXAS)[number], string>
}

type SubRowForm = {
  razaoSocial: string
  cnpj: string
  codigoSub: string
  status: SubStatus
}

function linhaFormVazia(): LinhaForm {
  const faixas = {} as LinhaForm['faixas']
  for (const f of FAIXAS) faixas[f] = ''
  return { codigoPlano: '', tipoCusto: 'CUSTO_MEDIO', custoMedioStr: '', faixas }
}

function subRowVazia(): SubRowForm {
  return { razaoSocial: '', cnpj: '', codigoSub: '', status: 'ATIVO' }
}

function linhaDeApi(l: LinhaApi): LinhaForm {
  const faixas = {} as LinhaForm['faixas']
  for (const f of FAIXAS) {
    const v = l.valoresPorFaixa?.[f]
    faixas[f] = v != null && Number.isFinite(v) ? String(v) : ''
  }
  return {
    codigoPlano: l.codigoPlano,
    tipoCusto: l.tipoCusto,
    custoMedioStr: l.custoMedio != null ? String(l.custoMedio) : '',
    faixas,
  }
}

function subsDeApi(rows: SubApi[]): SubRowForm[] {
  if (rows.length === 0) return [subRowVazia()]
  return rows.map((s) => ({
    razaoSocial: s.razaoSocial,
    cnpj: s.cnpj,
    codigoSub: s.codigoSub,
    status: s.status,
  }))
}

function ParcelasComissionamentoBlock({
  titulo,
  valores,
  setValores,
  vigIni,
  disabled,
}: {
  titulo: string
  valores: number[]
  setValores: Dispatch<SetStateAction<number[]>>
  vigIni: string
  disabled: boolean
}) {
  const replicarPrimeiro = () => {
    const firstNonZero = valores.find((x) => x !== 0)
    const first = firstNonZero ?? valores[0] ?? 0
    setValores(Array.from({ length: 12 }, () => first))
  }
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1 }} gap={1}>
        <Typography variant="subtitle2" fontWeight={600}>
          {titulo}
        </Typography>
        <Button size="small" variant="outlined" disabled={disabled} onClick={replicarPrimeiro}>
          Replicar 1.º % preenchido
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Parcela</TableCell>
            <TableCell>Mês (competência)</TableCell>
            <TableCell align="right">% sobre o contrato</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {valores.map((pct, idx) => (
            <TableRow key={idx}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{mesReferenciaParcela(vigIni, idx)}</TableCell>
              <TableCell align="right" sx={{ maxWidth: 140 }}>
                <TextField
                  size="small"
                  value={pct === 0 ? '' : String(pct)}
                  onChange={(e) => {
                    const t = e.target.value.trim().replace(',', '.')
                    const n = t === '' ? 0 : Number(t)
                    setValores((prev) =>
                      prev.map((p, j) => (j === idx ? (Number.isFinite(n) ? n : p) : p)),
                    )
                  }}
                  disabled={disabled}
                  inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                  fullWidth
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}

function parseNumeroPt(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const PRODUTO_LABEL: Record<string, string> = {
  SAUDE: 'Saúde',
  ODONTO: 'Odonto',
  VIDA_GRUPO: 'Vida em grupo',
  OUTROS: 'Outros',
}

function useNexusGruposNomes() {
  const [nomes, setNomes] = useState<string[]>([])
  useEffect(() => {
    void (async () => {
      const r = await api<{ nomes?: string[] }>('/seguros/nexus/grupos-economicos-nomes')
      if (r.ok) setNomes(r.data?.nomes ?? [])
      else setNomes([])
    })()
  }, [])
  return nomes
}

export default function ApoliceEditPage() {
  const { apoliceId } = useParams<{ apoliceId: string }>()
  const { user } = useAuth()
  const isAdmin = user?.role === 'PORTAL_ADMIN'
  const gruposNexusNomes = useNexusGruposNomes()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [operadorasLoadWarn, setOperadorasLoadWarn] = useState<string | null>(null)

  const [cab, setCab] = useState<ApoliceDetalhe | null>(null)
  const [contratosNexus, setContratosNexus] = useState<NexusContratoOpcao[]>([])
  const [needsContratosSync, setNeedsContratosSync] = useState(false)

  const [grupoNomeForEdit, setGrupoNomeForEdit] = useState('')
  const [estipulanteIdEdit, setEstipulanteIdEdit] = useState('')
  const [estOptions, setEstOptions] = useState<EstRow[]>([])

  const [nexusContratoId, setNexusContratoId] = useState('')
  const [numeroApolice, setNumeroApolice] = useState('')
  const [produto, setProduto] = useState<ApoliceProduto>('OUTROS')
  const [subRows, setSubRows] = useState<SubRowForm[]>([subRowVazia()])
  const [plano, setPlano] = useState('')
  const [coberturas, setCoberturas] = useState('')
  const [vigIni, setVigIni] = useState('')
  const [vigFim, setVigFim] = useState('')
  const [obsAp, setObsAp] = useState('')
  const [situacaoApolice, setSituacaoApolice] = useState<'ativa' | 'cancelada'>('ativa')

  const [modelo, setModelo] = useState<ModeloDados>('PLANO')
  const [linhas, setLinhas] = useState<LinhaForm[]>([linhaFormVazia()])

  const [tab, setTab] = useState(0)
  const [operadoras, setOperadoras] = useState<OperadoraOpt[]>([])
  const [operadoraId, setOperadoraId] = useState('')
  const [needsOperadorasSync, setNeedsOperadorasSync] = useState(false)

  const [tipoFinanceiro, setTipoFinanceiro] = useState<TipoFinanceiro>('comissionamento')
  const [temCorretorParceiroFin, setTemCorretorParceiroFin] = useState(false)
  const [valorAgenciamentoStr, setValorAgenciamentoStr] = useState('')
  const [valorVitalicioStr, setValorVitalicioStr] = useState('')
  const [agenciamentoConsultoriaPerc, setAgenciamentoConsultoriaPerc] = useState<number[]>(() => parcelasZeros12())
  const [vitalicioConsultoriaPerc, setVitalicioConsultoriaPerc] = useState<number[]>(() => parcelasZeros12())
  const [agenciamentoCorretorPerc, setAgenciamentoCorretorPerc] = useState<number[]>(() => parcelasZeros12())
  const [vitalicioCorretorPerc, setVitalicioCorretorPerc] = useState<number[]>(() => parcelasZeros12())
  const [feeValorMensalStr, setFeeValorMensalStr] = useState('')
  const [feeConsultoriaStr, setFeeConsultoriaStr] = useState('')
  const [feeCorretorParceiroStr, setFeeCorretorParceiroStr] = useState('')

  const [trCone, setTrCone] = useState<'NORTE' | 'SUL' | ''>('')
  const [trDiretoria, setTrDiretoria] = useState('')
  const [trSuperintendente, setTrSuperintendente] = useState('')
  const [trGerente, setTrGerente] = useState('')
  const [trExecutivoConsultor, setTrExecutivoConsultor] = useState('')
  const [trAnalista, setTrAnalista] = useState('')

  const [faturaRows, setFaturaRows] = useState<FaturaFormRow[]>([faturaFormVazia()])

  const showPlano = produto === 'SAUDE' || produto === 'ODONTO'
  const showCoberturas = produto === 'VIDA_GRUPO'

  /** Inclui valor atual da apólice se ainda não estiver no catálogo (ex.: migração ou id antigo). */
  const operadorasSelectOptions = useMemo(() => {
    const id = operadoraId.trim()
    if (!id || operadoras.some((o) => o.id === id)) return operadoras
    const nome = cab?.fornecedor?.trim()
    const label = nome ? `${nome} (valor atual)` : `${id.slice(0, 8)}… (valor atual)`
    return [{ id, nome: label }, ...operadoras]
  }, [operadoras, operadoraId, cab?.fornecedor])

  const contratoSelectValue = nexusContratoId.trim() || APOLICE_NUMERO_MANUAL
  const numeroOk = nexusContratoId.trim().length > 0 || numeroApolice.trim().length > 0

  function onContratoSelect(v: string) {
    if (v === APOLICE_NUMERO_MANUAL) {
      setNexusContratoId('')
      return
    }
    setNexusContratoId(v)
    const c = contratosNexus.find((x) => x.nexusContratoId === v)
    if (c) setNumeroApolice(c.numero)
  }

  const loadEstipulantesGrupo = useCallback(async (grupoNome: string) => {
    const g = grupoNome.trim()
    if (!g) {
      setEstOptions([])
      return
    }
    const r = await api<{ estipulantes: EstRow[] }>(`/seguros/estipulantes?grupoNome=${encodeURIComponent(g)}`)
    if (r.ok) setEstOptions(r.data?.estipulantes ?? [])
    else setEstOptions([])
  }, [])

  const loadContratos = useCallback(async (estId: string, grupoNome: string) => {
    if (!estId) {
      setContratosNexus([])
      return
    }
    const gq = grupoNome.trim() ? `&grupoNome=${encodeURIComponent(grupoNome.trim())}` : ''
    const rCt = await api<{ ok?: boolean; needsSync?: boolean; contratos?: NexusContratoOpcao[] }>(
      `/seguros/nexus/contratos-opcoes?estipulanteId=${encodeURIComponent(estId)}${gq}`,
    )
    if (rCt.ok) {
      const d = rCt.data
      setNeedsContratosSync(!!d?.needsSync || d?.ok === false)
      setContratosNexus(d?.contratos ?? [])
    } else {
      setContratosNexus([])
      setNeedsContratosSync(true)
    }
  }, [])

  const load = useCallback(async () => {
    if (!apoliceId) {
      setErr('Apólice inválida.')
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    setOperadorasLoadWarn(null)
    const [r, rOp] = await Promise.all([
      api<{ apolice: ApoliceDetalhe }>(`/seguros/apolices/${encodeURIComponent(apoliceId)}`),
      api<{ operadoras: OperadoraOpt[]; needsSync?: boolean }>('/seguros/operadoras'),
    ])
    if (!r.ok) {
      setLoading(false)
      setErr(r.error || 'Erro ao carregar apólice.')
      setCab(null)
      return
    }
    if (rOp.ok) {
      const dOp = rOp.data
      const raw = dOp?.operadoras
      setOperadoras(Array.isArray(raw) ? raw : [])
      setNeedsOperadorasSync(!!dOp?.needsSync)
      setOperadorasLoadWarn(null)
    } else {
      setOperadoras([])
      setNeedsOperadorasSync(true)
      setOperadorasLoadWarn(rOp.error || 'Não foi possível carregar o catálogo de operadoras. A ficha carregou; pode usar a operadora já gravada ou tentar atualizar a página.')
    }
    const ap = r.data!.apolice
    setCab(ap)

    const gNome = ap.estipulante.grupoEconomicoNome || ''
    setGrupoNomeForEdit(gNome)
    setEstipulanteIdEdit(ap.estipulanteId)
    await loadEstipulantesGrupo(gNome)
    await loadContratos(ap.estipulanteId, gNome)

    setNexusContratoId(ap.nexusContratoId ?? '')
    setNumeroApolice(ap.numeroApolice)
    setProduto(ap.produto)
    setOperadoraId(ap.operadoraId ?? '')
    const com = ap.comissionamento
    if (com) {
      setTemCorretorParceiroFin(!!com.temCorretorParceiro)
      setValorAgenciamentoStr(com.valorAgenciamentoContrato != null ? String(com.valorAgenciamentoContrato) : '')
      setValorVitalicioStr(com.valorVitalicioContrato != null ? String(com.valorVitalicioContrato) : '')
      setAgenciamentoConsultoriaPerc(parcelasFromApi(com.agenciamentoConsultoria))
      setVitalicioConsultoriaPerc(parcelasFromApi(com.vitalicioConsultoria))
      setAgenciamentoCorretorPerc(parcelasFromApi(com.agenciamentoCorretor))
      setVitalicioCorretorPerc(parcelasFromApi(com.vitalicioCorretor))
    } else {
      setTemCorretorParceiroFin(false)
      setValorAgenciamentoStr('')
      setValorVitalicioStr('')
      setAgenciamentoConsultoriaPerc(parcelasZeros12())
      setVitalicioConsultoriaPerc(parcelasZeros12())
      setAgenciamentoCorretorPerc(parcelasZeros12())
      setVitalicioCorretorPerc(parcelasZeros12())
    }
    const feeAp = ap.fee
    if (feeAp) {
      setFeeValorMensalStr(feeAp.valorFeeMensal != null ? String(feeAp.valorFeeMensal) : '')
      setFeeConsultoriaStr(feeAp.feeConsultoria != null ? String(feeAp.feeConsultoria) : '')
      setFeeCorretorParceiroStr(feeAp.feeCorretorParceiro != null ? String(feeAp.feeCorretorParceiro) : '')
    } else {
      setFeeValorMensalStr('')
      setFeeConsultoriaStr('')
      setFeeCorretorParceiroStr('')
    }
    const hasC = comissionamentoHasData(com)
    const hasF = feeHasData(feeAp)
    if (hasC && hasF) setTipoFinanceiro('comissionamento_fee')
    else if (hasC) setTipoFinanceiro('comissionamento')
    else if (hasF) setTipoFinanceiro('fee')
    else setTipoFinanceiro('comissionamento')
    setTrCone((ap.trCone as '' | 'NORTE' | 'SUL') ?? '')
    setTrDiretoria(ap.trDiretoria ?? '')
    setTrSuperintendente(ap.trSuperintendente ?? '')
    setTrGerente(ap.trGerente ?? '')
    setTrExecutivoConsultor(ap.trExecutivoConsultor ?? '')
    setTrAnalista(ap.trAnalista ?? '')
    setFaturaRows(faturasDeApi(ap.faturasMensais ?? []))
    setPlano(ap.plano ?? '')
    setCoberturas(ap.coberturas ?? '')
    setVigIni(ap.vigenciaInicio ? String(ap.vigenciaInicio).slice(0, 10) : '')
    setVigFim(ap.vigenciaFim ? String(ap.vigenciaFim).slice(0, 10) : '')
    setObsAp(ap.observacoes ?? '')
    setSituacaoApolice(ap.active ? 'ativa' : 'cancelada')

    setSubRows(subsDeApi(ap.subestipulantes ?? []))

    const mod = ap.modeloDadosSeguro ?? 'PLANO'
    setModelo(mod)
    if (ap.planoLinhas.length > 0) {
      setLinhas(ap.planoLinhas.map(linhaDeApi))
    } else {
      setLinhas(mod === 'PLANO' ? [linhaFormVazia()] : [])
    }

    setLoading(false)
  }, [apoliceId, loadContratos, loadEstipulantesGrupo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (modelo === 'PLANO' && linhas.length === 0) setLinhas([linhaFormVazia()])
  }, [modelo, linhas.length])

  useEffect(() => {
    if (loading || !estipulanteIdEdit) return
    void loadContratos(estipulanteIdEdit, grupoNomeForEdit)
  }, [estipulanteIdEdit, grupoNomeForEdit, loading, loadContratos])

  function buildSubPayload(): { ok: true; rows: SubRowForm[] } | { ok: false; msg: string } {
    const meaningful = subRows.filter(
      (r) => r.razaoSocial.trim() || r.cnpj.trim() || r.codigoSub.trim(),
    )
    for (let i = 0; i < meaningful.length; i++) {
      const r = meaningful[i]
      if (!r.razaoSocial.trim()) {
        return { ok: false, msg: `Subestipulante ${i + 1}: indique a razão social.` }
      }
    }
    return { ok: true, rows: meaningful }
  }

  async function salvar() {
    if (!apoliceId || !isAdmin) return
    setErr(null)

    if (!operadoraId.trim() || !numeroOk || !estipulanteIdEdit) {
      setErr('Selecione a operadora no catálogo, além do estipulante e número da apólice.')
      return
    }

    const subPack = buildSubPayload()
    if (!subPack.ok) {
      setErr(subPack.msg)
      return
    }

    const faturaKey = new Set<string>()
    const faturasMensais: Array<{
      competenciaAno: number
      competenciaMes: number
      vidas: number
      valorFatura: number
      observacoes: string | null
    }> = []
    for (let i = 0; i < faturaRows.length; i++) {
      const fr = faturaRows[i]
      const y = parseInt(fr.competenciaAno, 10)
      const m = parseInt(fr.competenciaMes, 10)
      const linhaPreenchida =
        fr.vidasStr.trim() !== '' ||
        fr.valorFaturaStr.trim() !== '' ||
        fr.observacoes.trim() !== ''
      if (!linhaPreenchida) continue
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        setErr(`Faturas: competência inválida na linha ${i + 1}.`)
        return
      }
      const k = `${y}-${m}`
      if (faturaKey.has(k)) {
        setErr(`Faturas: competência ${m}/${y} duplicada.`)
        return
      }
      faturaKey.add(k)
      const vidas = parseInt(fr.vidasStr, 10)
      const vf = parseNumeroPt(fr.valorFaturaStr)
      if (!Number.isFinite(vidas) || vidas < 0) {
        setErr(`Faturas (linha ${i + 1}): vidas inválidas.`)
        return
      }
      if (vf == null) {
        setErr(`Faturas (linha ${i + 1}): valor de fatura inválido.`)
        return
      }
      faturasMensais.push({
        competenciaAno: y,
        competenciaMes: m,
        vidas,
        valorFatura: vf,
        observacoes: fr.observacoes.trim() || null,
      })
    }

    const planoLinhas: Array<{
      codigoPlano: string
      tipoCusto: 'CUSTO_MEDIO' | 'FAIXA_ETARIA'
      custoMedio: number | null
      valoresPorFaixa?: Record<string, number | null>
    }> = []

    if (modelo === 'PLANO') {
      for (let i = 0; i < linhas.length; i++) {
        const L = linhas[i]
        const cod = L.codigoPlano.trim()
        if (!cod) {
          setErr(`Plano ${i + 1}: indique o código do plano.`)
          return
        }
        if (L.tipoCusto === 'CUSTO_MEDIO') {
          const v = parseNumeroPt(L.custoMedioStr)
          if (v == null) {
            setErr(`Plano ${i + 1}: custo médio inválido ou vazio.`)
            return
          }
          planoLinhas.push({ codigoPlano: cod, tipoCusto: 'CUSTO_MEDIO', custoMedio: v })
        } else {
          const valoresPorFaixa: Record<string, number | null> = {}
          let algum = false
          for (const f of FAIXAS) {
            const raw = L.faixas[f].trim()
            if (!raw) {
              valoresPorFaixa[f] = null
              continue
            }
            const n = parseNumeroPt(raw)
            if (n == null) {
              setErr(`Plano ${i + 1}, faixa ${f}: valor inválido.`)
              return
            }
            valoresPorFaixa[f] = n
            algum = true
          }
          if (!algum) {
            setErr(`Plano ${i + 1}: preencha pelo menos uma faixa etária com valor.`)
            return
          }
          planoLinhas.push({
            codigoPlano: cod,
            tipoCusto: 'FAIXA_ETARIA',
            custoMedio: null,
            valoresPorFaixa,
          })
        }
      }
    }

    if (showCoberturas && !coberturas.trim()) {
      setErr('Coberturas são obrigatórias para Vida em grupo.')
      return
    }

    const nex = nexusContratoId.trim()
    const patchBody: Record<string, unknown> = {
      estipulanteId: estipulanteIdEdit,
      produto,
      subestipulantes: subPack.rows.map((r) => ({
        razaoSocial: r.razaoSocial.trim(),
        cnpj: r.cnpj.trim(),
        codigoSub: r.codigoSub.trim(),
        status: r.status,
      })),
      faturasMensais,
      plano: showPlano ? plano.trim() || null : null,
      coberturas: showCoberturas ? coberturas.trim() || null : null,
      vigenciaInicio: vigIni.trim() || null,
      vigenciaFim: vigFim.trim() || null,
      observacoes: obsAp.trim() || null,
      nexusContratoId: nex || null,
      numeroApolice: numeroApolice.trim(),
      trCone: trCone || null,
      trDiretoria: trDiretoria.trim() || null,
      trSuperintendente: trSuperintendente.trim() || null,
      trGerente: trGerente.trim() || null,
      trExecutivoConsultor: trExecutivoConsultor.trim() || null,
      trAnalista: trAnalista.trim() || null,
      operadoraId: operadoraId.trim(),
      active: situacaoApolice === 'ativa',
    }
    setSaving(true)
    const rPatch = await api(`/seguros/apolices/${encodeURIComponent(apoliceId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    })
    if (!rPatch.ok) {
      setSaving(false)
      setErr(rPatch.error || 'Erro ao guardar dados gerais.')
      return
    }

    const rPut = await api(`/seguros/apolices/${encodeURIComponent(apoliceId)}/dados-seguro`, {
      method: 'PUT',
      body: JSON.stringify({ modeloDadosSeguro: modelo, planoLinhas }),
    })
    if (!rPut.ok) {
      setSaving(false)
      setErr(rPut.error || 'Dados gerais guardados, mas falhou ao guardar planos/coberturas estruturados.')
      return
    }

    if (tipoFinanceiro === 'comissionamento' || tipoFinanceiro === 'comissionamento_fee') {
      const rC = await api<{ comissionamento: ComissionamentoApi | null }>(
        `/seguros/apolices/${encodeURIComponent(apoliceId)}/comissionamento`,
        {
          method: 'PUT',
          body: JSON.stringify({
            temCorretorParceiro: temCorretorParceiroFin,
            valorAgenciamentoContrato: valorAgenciamentoStr.trim() ? parseNumeroPt(valorAgenciamentoStr) : null,
            valorVitalicioContrato: valorVitalicioStr.trim() ? parseNumeroPt(valorVitalicioStr) : null,
            agenciamentoConsultoria: agenciamentoConsultoriaPerc,
            vitalicioConsultoria: vitalicioConsultoriaPerc,
            agenciamentoCorretor: agenciamentoCorretorPerc,
            vitalicioCorretor: vitalicioCorretorPerc,
          }),
        },
      )
      if (!rC.ok) {
        setSaving(false)
        setErr(rC.error || 'Erro ao guardar comissionamento.')
        return
      }
    }

    if (tipoFinanceiro === 'fee' || tipoFinanceiro === 'comissionamento_fee') {
      const rF = await api<{ fee: FeeApi | null }>(`/seguros/apolices/${encodeURIComponent(apoliceId)}/fee`, {
        method: 'PUT',
        body: JSON.stringify({
          valorFeeMensal: feeValorMensalStr.trim() ? parseNumeroPt(feeValorMensalStr) : null,
          feeConsultoria: feeConsultoriaStr.trim() ? parseNumeroPt(feeConsultoriaStr) : null,
          feeCorretorParceiro: feeCorretorParceiroStr.trim() ? parseNumeroPt(feeCorretorParceiroStr) : null,
        }),
      })
      if (!rF.ok) {
        setSaving(false)
        setErr(rF.error || 'Erro ao guardar fee.')
        return
      }
    }

    setSaving(false)
    void load()
  }

  if (!apoliceId) {
    return (
      <PageScaffold>
        <Alert severity="error">ID da apólice em falta.</Alert>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold>
      <Button component={RouterLink} to="/apolice" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Voltar aos cadastros de seguros
      </Button>

      <Typography variant="h6" fontWeight={700} gutterBottom>
        Editar apólice
      </Typography>
      {cab ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {cab.estipulante.razaoSocial} — N.º <strong>{cab.numeroApolice}</strong> (
          {PRODUTO_LABEL[cab.produto] ?? cab.produto})
        </Typography>
      ) : null}

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      ) : null}
      {operadorasLoadWarn && !err ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setOperadorasLoadWarn(null)}>
          {operadorasLoadWarn}
        </Alert>
      ) : null}

      {loading ? (
        <Typography color="text.secondary">A carregar…</Typography>
      ) : !cab ? null : (
        <>
          {!isAdmin ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Só administradores podem alterar apólices. Esta página está em modo consulta.
            </Alert>
          ) : null}

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 0, width: '100%' }}
          >
            <Tab label="Geral e subestipulantes" />
            <Tab label="Plano / coberturas" />
            <Tab label="Financeiro" />
            <Tab label="Time de relacionamento" />
            <Tab label="Faturas mensais" />
          </Tabs>

          <TabPanel value={tab} index={0}>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}>
            <Stack spacing={2}>
              {needsContratosSync ? (
                <Alert severity="info">
                  A lista de contratos da base administrativa pode estar indisponível. Pode editar o número livremente ou
                  sincronizar contratos em Banco de dados.
                </Alert>
              ) : null}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, minmax(0, 1fr))' },
                  gap: { xs: 2, md: 2.5 },
                }}
              >
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel id="grupo-ap-edit">Grupo económico</InputLabel>
                  <Select
                    labelId="grupo-ap-edit"
                    label="Grupo económico"
                    value={grupoNomeForEdit}
                    onChange={(e: SelectChangeEvent) => {
                      const v = e.target.value
                      setGrupoNomeForEdit(v)
                      setEstipulanteIdEdit('')
                      void loadEstipulantesGrupo(v)
                    }}
                  >
                    <MenuItem value="">
                      <em>Selecione…</em>
                    </MenuItem>
                    {gruposNexusNomes.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" disabled={!isAdmin || !grupoNomeForEdit}>
                  <InputLabel id="est-ap-edit">Estipulante</InputLabel>
                  <Select
                    labelId="est-ap-edit"
                    label="Estipulante"
                    value={estipulanteIdEdit}
                    onChange={(e: SelectChangeEvent) => setEstipulanteIdEdit(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Selecione…</em>
                    </MenuItem>
                    {estOptions.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.razaoSocial}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel id="ctr-nx-edit">Número / contrato (referência)</InputLabel>
                  <Select
                    labelId="ctr-nx-edit"
                    label="Número / contrato (referência)"
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
                  required
                  label="Número da apólice"
                  value={numeroApolice}
                  onChange={(e) => setNumeroApolice(e.target.value)}
                  fullWidth
                  disabled={!isAdmin}
                  size="small"
                  helperText="Editável mesmo com contrato de referência vinculado; o valor enviado ao servidor é o deste campo."
                />
                <FormControl fullWidth required size="small" disabled={!isAdmin}>
                  <InputLabel>Produto</InputLabel>
                  <Select label="Produto" value={produto} onChange={(e) => setProduto(e.target.value as ApoliceProduto)}>
                    <MenuItem value="SAUDE">Saúde</MenuItem>
                    <MenuItem value="ODONTO">Odonto</MenuItem>
                    <MenuItem value="VIDA_GRUPO">Vida em grupo</MenuItem>
                    <MenuItem value="OUTROS">Outros</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth required size="small" disabled={!isAdmin}>
                  <InputLabel id="op-ap">Operadora</InputLabel>
                  <Select
                    labelId="op-ap"
                    label="Operadora"
                    value={operadoraId}
                    onChange={(e: SelectChangeEvent) => setOperadoraId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Selecione…</em>
                    </MenuItem>
                    {operadorasSelectOptions.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.nome}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {needsOperadorasSync && operadoras.length === 0
                      ? 'Sem lista de operadoras: verifique a sincronização em «Banco de dados» ou peça suporte técnico. Com a base atualizada, a lista volta a carregar.'
                      : 'Lista de seguradoras / operadoras mantida pela corretora (sincronização periódica).'}
                  </FormHelperText>
                </FormControl>
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel id="sit-ap">Situação da apólice</InputLabel>
                  <Select
                    labelId="sit-ap"
                    label="Situação da apólice"
                    value={situacaoApolice}
                    onChange={(e: SelectChangeEvent) =>
                      setSituacaoApolice(e.target.value as 'ativa' | 'cancelada')
                    }
                  >
                    <MenuItem value="ativa">Ativa</MenuItem>
                    <MenuItem value="cancelada">Cancelada</MenuItem>
                  </Select>
                  <FormHelperText>«Cancelada» grava o indicador de apólice inativa na base (não renovada, rescindida, etc.).</FormHelperText>
                </FormControl>
                {showPlano ? (
                  <TextField
                    label="Plano (texto livre)"
                    value={plano}
                    onChange={(e) => setPlano(e.target.value)}
                    disabled={!isAdmin}
                    fullWidth
                    size="small"
                    sx={{ gridColumn: { sm: 'span 2', lg: 'span 3' } }}
                    helperText="Complemento opcional; os planos estruturados ficam na secção abaixo."
                  />
                ) : null}
                {showCoberturas ? (
                  <TextField
                    required
                    label="Coberturas"
                    value={coberturas}
                    onChange={(e) => setCoberturas(e.target.value)}
                    disabled={!isAdmin}
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    sx={{ gridColumn: { sm: 'span 2', lg: 'span 3' } }}
                  />
                ) : null}
                <TextField
                  label="Vigência início"
                  type="date"
                  value={vigIni}
                  onChange={(e) => setVigIni(e.target.value)}
                  disabled={!isAdmin}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Vigência fim"
                  type="date"
                  value={vigFim}
                  onChange={(e) => setVigFim(e.target.value)}
                  disabled={!isAdmin}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Observações"
                  value={obsAp}
                  onChange={(e) => setObsAp(e.target.value)}
                  disabled={!isAdmin}
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  sx={{ gridColumn: { sm: 'span 2' } }}
                />
              </Box>
            </Stack>
          </Paper>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Empresas subestipulantes (guarda-chuva)
          </Typography>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Vinculadas à apólice. Remova linhas vazias ou adicione mais empresas com o botão abaixo.
            </Typography>
            <Stack spacing={2}>
              {subRows.map((sr, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField
                      label="Razão social"
                      value={sr.razaoSocial}
                      onChange={(e) =>
                        setSubRows((prev) =>
                          prev.map((r, j) => (j === idx ? { ...r, razaoSocial: e.target.value } : r)),
                        )
                      }
                      size="small"
                      sx={{ flex: '2 1 200px', minWidth: 180 }}
                      disabled={!isAdmin}
                    />
                    <TextField
                      label="CNPJ"
                      value={sr.cnpj}
                      onChange={(e) =>
                        setSubRows((prev) => prev.map((r, j) => (j === idx ? { ...r, cnpj: e.target.value } : r)))
                      }
                      size="small"
                      sx={{ flex: '1 1 140px', minWidth: 120 }}
                      disabled={!isAdmin}
                    />
                    <TextField
                      label="Código SUB"
                      value={sr.codigoSub}
                      onChange={(e) =>
                        setSubRows((prev) =>
                          prev.map((r, j) => (j === idx ? { ...r, codigoSub: e.target.value } : r)),
                        )
                      }
                      size="small"
                      sx={{ flex: '1 1 120px', minWidth: 100 }}
                      disabled={!isAdmin}
                    />
                    <FormControl size="small" sx={{ flex: '0 1 140px', minWidth: 120 }} disabled={!isAdmin}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={sr.status}
                        onChange={(e) =>
                          setSubRows((prev) =>
                            prev.map((r, j) =>
                              j === idx ? { ...r, status: e.target.value as SubStatus } : r,
                            ),
                          )
                        }
                      >
                        <MenuItem value="ATIVO">Ativo</MenuItem>
                        <MenuItem value="CANCELADO">Cancelado</MenuItem>
                      </Select>
                    </FormControl>
                    {isAdmin && subRows.length > 1 ? (
                      <IconButton aria-label="Remover" onClick={() => setSubRows((prev) => prev.filter((_, j) => j !== idx))}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    ) : null}
                  </Box>
                </Paper>
              ))}
              {isAdmin ? (
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setSubRows((p) => [...p, subRowVazia()])}>
                  Adicionar subestipulante
                </Button>
              ) : null}
            </Stack>
          </Paper>
          </TabPanel>

          <TabPanel value={tab} index={1}>
          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Modelo do seguro (plano estruturado ou coberturas)
          </Typography>

          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}>
            <FormControl component="fieldset" variant="standard" sx={{ width: '100%' }}>
              <FormLabel component="legend">Modelo de cadastro</FormLabel>
              <RadioGroup
                row
                value={modelo}
                onChange={(e) => {
                  const v = e.target.value as ModeloDados
                  setModelo(v)
                  if (v === 'COBERTURA') setLinhas([])
                }}
              >
                <FormControlLabel
                  value="PLANO"
                  control={<Radio />}
                  label="Plano (código + custo médio ou faixas etárias)"
                  disabled={!isAdmin}
                />
                <FormControlLabel value="COBERTURA" control={<Radio />} label="Coberturas" disabled={!isAdmin} />
              </RadioGroup>
            </FormControl>
          </Paper>

          {modelo === 'COBERTURA' ? (
            <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}>
              <Alert severity="info">
                O cadastro estruturado de coberturas será definido mais tarde. Use o campo «Coberturas» acima (Vida em grupo),
                o separador Itens ou observações.
              </Alert>
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ mb: 2 }}>
              {linhas.map((L, idx) => (
                <Paper key={idx} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Plano {idx + 1}
                    </Typography>
                    {isAdmin && linhas.length > 1 ? (
                      <IconButton
                        size="small"
                        aria-label="Remover plano"
                        onClick={() => setLinhas((prev) => prev.filter((_, j) => j !== idx))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Box>
                  <Stack spacing={2}>
                    <TextField
                      label="Código do plano"
                      value={L.codigoPlano}
                      onChange={(e) =>
                        setLinhas((prev) =>
                          prev.map((row, j) => (j === idx ? { ...row, codigoPlano: e.target.value } : row)),
                        )
                      }
                      fullWidth
                      size="small"
                      disabled={!isAdmin}
                    />
                    <FormControl size="small" disabled={!isAdmin}>
                      <InputLabel>Tipo de custo</InputLabel>
                      <Select
                        label="Tipo de custo"
                        value={L.tipoCusto}
                        onChange={(e) =>
                          setLinhas((prev) =>
                            prev.map((row, j) =>
                              j === idx ? { ...row, tipoCusto: e.target.value as LinhaForm['tipoCusto'] } : row,
                            ),
                          )
                        }
                      >
                        <MenuItem value="CUSTO_MEDIO">Custo médio</MenuItem>
                        <MenuItem value="FAIXA_ETARIA">Custo por faixa etária</MenuItem>
                      </Select>
                    </FormControl>
                    {L.tipoCusto === 'CUSTO_MEDIO' ? (
                      <TextField
                        label="Custo médio"
                        value={L.custoMedioStr}
                        onChange={(e) =>
                          setLinhas((prev) =>
                            prev.map((row, j) =>
                              j === idx ? { ...row, custoMedioStr: e.target.value } : row,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                        disabled={!isAdmin}
                        inputProps={{ inputMode: 'decimal' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                          gap: 1,
                        }}
                      >
                        {FAIXAS.map((f) => (
                          <TextField
                            key={f}
                            label={f}
                            value={L.faixas[f]}
                            onChange={(e) =>
                              setLinhas((prev) =>
                                prev.map((row, j) =>
                                  j === idx
                                    ? { ...row, faixas: { ...row.faixas, [f]: e.target.value } }
                                    : row,
                                ),
                              )
                            }
                            size="small"
                            disabled={!isAdmin}
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Stack>
                </Paper>
              ))}
              {isAdmin ? (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setLinhas((prev) => [...prev, linhaFormVazia()])}
                  variant="outlined"
                >
                  Adicionar outro plano
                </Button>
              ) : null}
            </Stack>
          )}
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Paper
              sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}
              variant="outlined"
            >
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Financeiro — comissionamento (12 parcelas) e fee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  O mês de competência da <strong>1.ª parcela</strong> é sempre o mês da <strong>vigência início</strong> (aba Geral); as
                  seguintes avançam mês a mês. Se a vigência não estiver preenchida (ou for inválida), o mês de competência fica em branco
                  (—). Os percentuais aplicam-se sobre o contrato. Use «Guardar tudo» para persistir.
                </Typography>
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel id="tipo-fin">O que pretende tratar nesta apólice</InputLabel>
                  <Select
                    labelId="tipo-fin"
                    label="O que pretende tratar nesta apólice"
                    value={tipoFinanceiro}
                    onChange={(e) => setTipoFinanceiro(e.target.value as TipoFinanceiro)}
                  >
                    <MenuItem value="comissionamento">Só comissionamento (parcelas %)</MenuItem>
                    <MenuItem value="fee">Só fee</MenuItem>
                    <MenuItem value="comissionamento_fee">Comissionamento + fee</MenuItem>
                  </Select>
                </FormControl>

                {(tipoFinanceiro === 'comissionamento' || tipoFinanceiro === 'comissionamento_fee') && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" color="primary">
                      Comissionamento
                    </Typography>
                    <TextField
                      size="small"
                      label="Valor agenciamento (contrato)"
                      value={valorAgenciamentoStr}
                      onChange={(e) => setValorAgenciamentoStr(e.target.value)}
                      disabled={!isAdmin}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                      size="small"
                      label="Valor vitalício (contrato)"
                      value={valorVitalicioStr}
                      onChange={(e) => setValorVitalicioStr(e.target.value)}
                      disabled={!isAdmin}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={temCorretorParceiroFin}
                          onChange={(e) => setTemCorretorParceiroFin(e.target.checked)}
                          disabled={!isAdmin}
                        />
                      }
                      label="Há corretor parceiro (colunas «Corretor» nas tabelas)"
                    />
                    <ParcelasComissionamentoBlock
                      titulo="Agenciamento — Consultoria"
                      valores={agenciamentoConsultoriaPerc}
                      setValores={setAgenciamentoConsultoriaPerc}
                      vigIni={vigIni}
                      disabled={!isAdmin}
                    />
                    <ParcelasComissionamentoBlock
                      titulo="Vitalício — Consultoria"
                      valores={vitalicioConsultoriaPerc}
                      setValores={setVitalicioConsultoriaPerc}
                      vigIni={vigIni}
                      disabled={!isAdmin}
                    />
                    <ParcelasComissionamentoBlock
                      titulo="Agenciamento — Corretor"
                      valores={agenciamentoCorretorPerc}
                      setValores={setAgenciamentoCorretorPerc}
                      vigIni={vigIni}
                      disabled={!isAdmin}
                    />
                    <ParcelasComissionamentoBlock
                      titulo="Vitalício — Corretor"
                      valores={vitalicioCorretorPerc}
                      setValores={setVitalicioCorretorPerc}
                      vigIni={vigIni}
                      disabled={!isAdmin}
                    />
                  </>
                )}

                {(tipoFinanceiro === 'fee' || tipoFinanceiro === 'comissionamento_fee') && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" color="primary">
                      Fee
                    </Typography>
                    <TextField
                      size="small"
                      label="Valor fee mensal"
                      value={feeValorMensalStr}
                      onChange={(e) => setFeeValorMensalStr(e.target.value)}
                      disabled={!isAdmin}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                      size="small"
                      label="Fee consultoria"
                      value={feeConsultoriaStr}
                      onChange={(e) => setFeeConsultoriaStr(e.target.value)}
                      disabled={!isAdmin}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                      size="small"
                      label="Fee corretor parceiro"
                      value={feeCorretorParceiroStr}
                      onChange={(e) => setFeeCorretorParceiroStr(e.target.value)}
                      disabled={!isAdmin}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                  </>
                )}
              </Stack>
            </Paper>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Paper
              sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}
              variant="outlined"
            >
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Time de relacionamento
                </Typography>
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel>Cone</InputLabel>
                  <Select label="Cone" value={trCone} onChange={(e) => setTrCone(e.target.value as typeof trCone)}>
                    <MenuItem value="">
                      <em>Não informado</em>
                    </MenuItem>
                    <MenuItem value="NORTE">Norte</MenuItem>
                    <MenuItem value="SUL">Sul</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Diretoria" value={trDiretoria} onChange={(e) => setTrDiretoria(e.target.value)} disabled={!isAdmin} size="small" />
                <TextField
                  label="Superintendente"
                  value={trSuperintendente}
                  onChange={(e) => setTrSuperintendente(e.target.value)}
                  disabled={!isAdmin}
                  size="small"
                />
                <TextField label="Gerente" value={trGerente} onChange={(e) => setTrGerente(e.target.value)} disabled={!isAdmin} size="small" />
                <TextField
                  label="Executivo / consultor"
                  value={trExecutivoConsultor}
                  onChange={(e) => setTrExecutivoConsultor(e.target.value)}
                  disabled={!isAdmin}
                  size="small"
                />
                <TextField label="Analista" value={trAnalista} onChange={(e) => setTrAnalista(e.target.value)} disabled={!isAdmin} size="small" />
              </Stack>
            </Paper>
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <Paper
              sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, width: '100%', boxSizing: 'border-box' }}
              variant="outlined"
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Vidas e fatura por competência (mensal)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Uma linha por mês de competência. Linhas vazias são ignoradas ao guardar.
              </Typography>
              <Stack spacing={2}>
                {faturaRows.map((fr, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <TextField
                        label="Ano"
                        size="small"
                        value={fr.competenciaAno}
                        onChange={(e) =>
                          setFaturaRows((prev) =>
                            prev.map((r, j) => (j === idx ? { ...r, competenciaAno: e.target.value } : r)),
                          )
                        }
                        disabled={!isAdmin}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        label="Mês"
                        size="small"
                        value={fr.competenciaMes}
                        onChange={(e) =>
                          setFaturaRows((prev) =>
                            prev.map((r, j) => (j === idx ? { ...r, competenciaMes: e.target.value } : r)),
                          )
                        }
                        disabled={!isAdmin}
                        sx={{ width: 96 }}
                      />
                      <TextField
                        label="Vidas"
                        size="small"
                        value={fr.vidasStr}
                        onChange={(e) =>
                          setFaturaRows((prev) => prev.map((r, j) => (j === idx ? { ...r, vidasStr: e.target.value } : r)))
                        }
                        disabled={!isAdmin}
                        sx={{ width: 120 }}
                      />
                      <TextField
                        label="Valor fatura"
                        size="small"
                        value={fr.valorFaturaStr}
                        onChange={(e) =>
                          setFaturaRows((prev) =>
                            prev.map((r, j) => (j === idx ? { ...r, valorFaturaStr: e.target.value } : r)),
                          )
                        }
                        disabled={!isAdmin}
                        sx={{ flex: '1 1 140px', minWidth: 120 }}
                        inputProps={{ inputMode: 'decimal' }}
                      />
                      <TextField
                        label="Obs."
                        size="small"
                        value={fr.observacoes}
                        onChange={(e) =>
                          setFaturaRows((prev) =>
                            prev.map((r, j) => (j === idx ? { ...r, observacoes: e.target.value } : r)),
                          )
                        }
                        disabled={!isAdmin}
                        sx={{ flex: '2 1 200px', minWidth: 160 }}
                      />
                      {isAdmin && faturaRows.length > 1 ? (
                        <IconButton aria-label="Remover" onClick={() => setFaturaRows((prev) => prev.filter((_, j) => j !== idx))}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      ) : null}
                    </Box>
                  </Paper>
                ))}
                {isAdmin ? (
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setFaturaRows((p) => [...p, faturaFormVazia()])}>
                    Adicionar competência
                  </Button>
                ) : null}
              </Stack>
            </Paper>
          </TabPanel>

          {isAdmin ? (
            <Button variant="contained" onClick={() => void salvar()} disabled={saving || loading}>
              Guardar tudo
            </Button>
          ) : null}
        </>
      )}
    </PageScaffold>
  )
}
