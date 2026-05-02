import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Alert,
  Box,
  Button,
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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

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

type ModeloDados = 'PLANO' | 'COBERTURA'

type LinhaApi = {
  id: string
  sortOrder: number
  codigoPlano: string
  tipoCusto: 'CUSTO_MEDIO' | 'FAIXA_ETARIA'
  custoMedio: number | null
  valoresPorFaixa: Record<string, number | null> | null
}

type ApoliceDadosPayload = {
  id: string
  numeroApolice: string
  produto: string
  modeloDadosSeguro: ModeloDados | null
  plano: string | null
  coberturas: string | null
  planoLinhas: LinhaApi[]
}

type LinhaForm = {
  codigoPlano: string
  tipoCusto: 'CUSTO_MEDIO' | 'FAIXA_ETARIA'
  custoMedioStr: string
  faixas: Record<(typeof FAIXAS)[number], string>
}

function linhaFormVazia(): LinhaForm {
  const faixas = {} as LinhaForm['faixas']
  for (const f of FAIXAS) faixas[f] = ''
  return { codigoPlano: '', tipoCusto: 'CUSTO_MEDIO', custoMedioStr: '', faixas }
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

export default function ApoliceDadosSeguroPage() {
  const { apoliceId } = useParams<{ apoliceId: string }>()
  const { user } = useAuth()
  const isAdmin = user?.role === 'PORTAL_ADMIN'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cab, setCab] = useState<Pick<ApoliceDadosPayload, 'numeroApolice' | 'produto'> | null>(null)
  const [modelo, setModelo] = useState<ModeloDados>('PLANO')
  const [linhas, setLinhas] = useState<LinhaForm[]>([linhaFormVazia()])

  const load = useCallback(async () => {
    if (!apoliceId) {
      setErr('Apólice inválida.')
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    const r = await api<{ apolice: ApoliceDadosPayload }>(
      `/seguros/apolices/${encodeURIComponent(apoliceId)}/dados-seguro`,
    )
    setLoading(false)
    if (!r.ok) {
      setErr(r.error || 'Erro ao carregar dados.')
      setCab(null)
      return
    }
    const ap = r.data!.apolice
    setCab({ numeroApolice: ap.numeroApolice, produto: ap.produto })
    const mod = ap.modeloDadosSeguro ?? 'PLANO'
    setModelo(mod)
    if (ap.planoLinhas.length > 0) {
      setLinhas(ap.planoLinhas.map(linhaDeApi))
    } else {
      setLinhas(mod === 'PLANO' ? [linhaFormVazia()] : [])
    }
  }, [apoliceId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (modelo === 'PLANO' && linhas.length === 0) setLinhas([linhaFormVazia()])
  }, [modelo, linhas.length])

  async function salvar() {
    if (!apoliceId || !isAdmin) return
    setErr(null)

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
          setErr(`Linha ${i + 1}: indique o código do plano.`)
          return
        }
        if (L.tipoCusto === 'CUSTO_MEDIO') {
          const v = parseNumeroPt(L.custoMedioStr)
          if (v == null) {
            setErr(`Linha ${i + 1}: custo médio inválido ou vazio.`)
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
              setErr(`Linha ${i + 1}, faixa ${f}: valor inválido.`)
              return
            }
            valoresPorFaixa[f] = n
            algum = true
          }
          if (!algum) {
            setErr(`Linha ${i + 1}: preencha pelo menos uma faixa etária com valor.`)
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

    setSaving(true)
    const r = await api<{ apolice: ApoliceDadosPayload }>(
      `/seguros/apolices/${encodeURIComponent(apoliceId)}/dados-seguro`,
      {
        method: 'PUT',
        body: JSON.stringify({ modeloDadosSeguro: modelo, planoLinhas }),
      },
    )
    setSaving(false)
    if (!r.ok) {
      setErr(r.error || 'Erro ao guardar.')
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
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
      <Button component={RouterLink} to="/apolice" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Voltar aos cadastros de seguros
      </Button>

      <Typography variant="h6" fontWeight={700} gutterBottom>
        Dados do seguro
      </Typography>
      {cab ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Apólice <strong>{cab.numeroApolice}</strong> — {PRODUTO_LABEL[cab.produto] ?? cab.produto}
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
              Só administradores do portal podem alterar estes dados. A consulta está disponível para referência.
            </Alert>
          ) : null}

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
                <FormControlLabel
                  value="COBERTURA"
                  control={<Radio />}
                  label="Coberturas"
                  disabled={!isAdmin}
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {modelo === 'COBERTURA' ? (
            <Paper sx={{ p: 2 }}>
              <Alert severity="info">
                O cadastro estruturado de coberturas nesta página será definido numa fase seguinte (lista de coberturas a
                sinalizar). Por enquanto pode usar o campo «Coberturas» na edição da apólice, os itens da apólice (separador
                Itens) ou as observações.
              </Alert>
            </Paper>
          ) : (
            <Stack spacing={2}>
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
                              j === idx
                                ? { ...row, tipoCusto: e.target.value as LinhaForm['tipoCusto'] }
                                : row,
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
            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={() => void salvar()} disabled={saving || loading}>
                Guardar
              </Button>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  )
}
