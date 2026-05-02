import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
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
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

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
  fornecedor: string
  subestipulante: string | null
  plano: string | null
  coberturas: string | null
  vigenciaInicio: string | null
  vigenciaFim: string | null
  observacoes: string | null
  active: boolean
  modeloDadosSeguro: ModeloDados | null
  estipulante: {
      id: string
      razaoSocial: string
      grupoEconomicoNome: string
      grupo: { id: string; nome: string } | null
  }
  planoLinhas: LinhaApi[]
  subestipulantes: SubApi[]
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

  const [cab, setCab] = useState<ApoliceDetalhe | null>(null)
  const [contratosNexus, setContratosNexus] = useState<NexusContratoOpcao[]>([])
  const [needsContratosSync, setNeedsContratosSync] = useState(false)

  const [grupoNomeForEdit, setGrupoNomeForEdit] = useState('')
  const [estipulanteIdEdit, setEstipulanteIdEdit] = useState('')
  const [estOptions, setEstOptions] = useState<EstRow[]>([])

  const [nexusContratoId, setNexusContratoId] = useState('')
  const [numeroApolice, setNumeroApolice] = useState('')
  const [produto, setProduto] = useState<ApoliceProduto>('OUTROS')
  const [fornecedor, setFornecedor] = useState('')
  const [subRows, setSubRows] = useState<SubRowForm[]>([subRowVazia()])
  const [plano, setPlano] = useState('')
  const [coberturas, setCoberturas] = useState('')
  const [vigIni, setVigIni] = useState('')
  const [vigFim, setVigFim] = useState('')
  const [obsAp, setObsAp] = useState('')

  const [modelo, setModelo] = useState<ModeloDados>('PLANO')
  const [linhas, setLinhas] = useState<LinhaForm[]>([linhaFormVazia()])

  const showPlano = produto === 'SAUDE' || produto === 'ODONTO'
  const showCoberturas = produto === 'VIDA_GRUPO'

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
    const r = await api<{ apolice: ApoliceDetalhe }>(`/seguros/apolices/${encodeURIComponent(apoliceId)}`)
    if (!r.ok) {
      setLoading(false)
      setErr(r.error || 'Erro ao carregar apólice.')
      setCab(null)
      return
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
    setFornecedor(ap.fornecedor)
    setPlano(ap.plano ?? '')
    setCoberturas(ap.coberturas ?? '')
    setVigIni(ap.vigenciaInicio ? String(ap.vigenciaInicio).slice(0, 10) : '')
    setVigFim(ap.vigenciaFim ? String(ap.vigenciaFim).slice(0, 10) : '')
    setObsAp(ap.observacoes ?? '')

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

    if (!fornecedor.trim() || !numeroOk || !estipulanteIdEdit) {
      setErr('Preencha fornecedor, estipulante, número da apólice (ou contrato Nexus).')
      return
    }

    const subPack = buildSubPayload()
    if (!subPack.ok) {
      setErr(subPack.msg)
      return
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
    const patchBody = {
      estipulanteId: estipulanteIdEdit,
      produto,
      fornecedor,
      subestipulantes: subPack.rows.map((r) => ({
        razaoSocial: r.razaoSocial.trim(),
        cnpj: r.cnpj.trim(),
        codigoSub: r.codigoSub.trim(),
        status: r.status,
      })),
      plano: showPlano ? plano.trim() || null : null,
      coberturas: showCoberturas ? coberturas.trim() || null : null,
      vigenciaInicio: vigIni.trim() || null,
      vigenciaFim: vigFim.trim() || null,
      observacoes: obsAp.trim() || null,
      nexusContratoId: nex || null,
      numeroApolice: numeroApolice.trim(),
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
    setSaving(false)
    if (!rPut.ok) {
      setErr(rPut.error || 'Dados gerais guardados, mas falhou ao guardar planos/coberturas estruturados.')
      return
    }
    void load()
  }

  if (!apoliceId) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">ID da apólice em falta.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 960, mx: 'auto' }}>
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

      {loading ? (
        <Typography color="text.secondary">A carregar…</Typography>
      ) : !cab ? null : (
        <>
          {!isAdmin ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Só administradores podem alterar apólices. Esta página está em modo consulta.
            </Alert>
          ) : null}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Dados gerais
          </Typography>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              {needsContratosSync ? (
                <Alert severity="info">
                  Contratos Nexus podem estar indisponíveis. Pode editar o número livremente ou sincronizar contratos em Banco
                  de dados.
                </Alert>
              ) : null}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <FormControl fullWidth size="small" disabled={!isAdmin}>
                  <InputLabel id="grupo-ap-edit">Grupo económico (Nexus)</InputLabel>
                  <Select
                    labelId="grupo-ap-edit"
                    label="Grupo económico (Nexus)"
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
                  <InputLabel id="ctr-nx-edit">Número / contrato (Nexus)</InputLabel>
                  <Select
                    labelId="ctr-nx-edit"
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
                  required
                  label="Número da apólice"
                  value={numeroApolice}
                  onChange={(e) => setNumeroApolice(e.target.value)}
                  fullWidth
                  disabled={!isAdmin}
                  size="small"
                  helperText="Editável mesmo com contrato Nexus vinculado; o valor enviado ao servidor é o deste campo."
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
                <TextField
                  required
                  label="Fornecedor (seguradora)"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  disabled={!isAdmin}
                  fullWidth
                  size="small"
                />
                {showPlano ? (
                  <TextField
                    label="Plano (texto livre)"
                    value={plano}
                    onChange={(e) => setPlano(e.target.value)}
                    disabled={!isAdmin}
                    fullWidth
                    size="small"
                    sx={{ gridColumn: { sm: 'span 2' } }}
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
                    sx={{ gridColumn: { sm: 'span 2' } }}
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
          <Paper sx={{ p: 2, mb: 2 }}>
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

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Modelo do seguro (plano estruturado ou coberturas)
          </Typography>

          <Paper sx={{ p: 2, mb: 2 }}>
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
            <Paper sx={{ p: 2, mb: 2 }}>
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

          {isAdmin ? (
            <Button variant="contained" onClick={() => void salvar()} disabled={saving || loading}>
              Guardar tudo
            </Button>
          ) : null}
        </>
      )}
    </Box>
  )
}
