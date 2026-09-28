import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddCircleOutline as AddIcon,
  CheckCircleOutline as IncluidoIcon,
  DeleteOutline as DeleteIcon,
  HighlightOff as ExcluidoIcon,
  ReportProblemOutlined as RiscoIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { getApi } from '../lib/apiConfig'
import CharterFinanceiroSection from './charter/CharterFinanceiroSection'
import { normalizarFinanceiro, type CharterFinanceiroItem } from './charter/charterFinanceiro'

export type RiscoNivel = 'baixo' | 'intermediario' | 'alto' | 'muito_alto'
export type CharterItem = { id: string; descricao: string }
export type CharterRisco = { id: string; descricao: string; nivel: RiscoNivel; mitigacao: string; createdAt: string }
export type ProjectCharter = {
  escopo: string
  incluidos: CharterItem[]
  excluidos: CharterItem[]
  riscos: CharterRisco[]
  financeiro: CharterFinanceiroItem[]
  atualizadoEm?: string | null
  atualizadoPor?: string | null
}

export const RISCO_NIVEIS: { value: RiscoNivel; label: string; color: string }[] = [
  { value: 'baixo', label: 'Baixo', color: '#00A649' },
  { value: 'intermediario', label: 'Intermediário', color: '#E5B800' },
  { value: 'alto', label: 'Alto', color: '#F57C00' },
  { value: 'muito_alto', label: 'Muito alto', color: '#DA3832' },
]
const NIVEL_ORDEM: Record<RiscoNivel, number> = { muito_alto: 0, alto: 1, intermediario: 2, baixo: 3 }

export function parseCharter(raw: unknown): ProjectCharter {
  let obj: any = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      obj = {}
    }
  }
  if (!obj || typeof obj !== 'object') obj = {}
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [])
  return {
    escopo: typeof obj.escopo === 'string' ? obj.escopo : '',
    incluidos: arr(obj.incluidos),
    excluidos: arr(obj.excluidos),
    riscos: arr(obj.riscos).map((r: any) => ({
      ...r,
      nivel: RISCO_NIVEIS.some((n) => n.value === r.nivel) ? r.nivel : 'intermediario',
      mitigacao: r.mitigacao || '',
    })),
    financeiro: normalizarFinanceiro(obj.financeiro),
    atualizadoEm: obj.atualizadoEm ?? null,
    atualizadoPor: obj.atualizadoPor ?? null,
  }
}

function novoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function NivelChip({ nivel }: { nivel: RiscoNivel }) {
  const n = RISCO_NIVEIS.find((x) => x.value === nivel) ?? RISCO_NIVEIS[1]
  return <Chip size="small" label={n.label} sx={{ bgcolor: n.color, color: '#fff', fontWeight: 700 }} />
}

function ListaItens({
  titulo,
  subtitulo,
  icon,
  cor,
  itens,
  readOnly,
  placeholder,
  onChange,
}: {
  titulo: string
  subtitulo: string
  icon: React.ReactNode
  cor: string
  itens: CharterItem[]
  readOnly: boolean
  placeholder: string
  onChange: (itens: CharterItem[]) => void
}) {
  const [novo, setNovo] = useState('')
  const adicionar = () => {
    const d = novo.trim()
    if (!d) return
    onChange([...itens, { id: novoId('item'), descricao: d }])
    setNovo('')
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderTop: `3px solid ${cor}`, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          {titulo}
        </Typography>
        <Chip size="small" label={itens.length} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {subtitulo}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {itens.map((it) =>
          readOnly ? (
            <Typography key={it.id} variant="body2" sx={{ pl: 1, borderLeft: `3px solid ${cor}` }}>
              {it.descricao}
            </Typography>
          ) : (
            <Box key={it.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                fullWidth
                multiline
                value={it.descricao}
                onChange={(e) =>
                  onChange(itens.map((x) => (x.id === it.id ? { ...x, descricao: e.target.value } : x)))
                }
              />
              <Tooltip title="Remover">
                <IconButton size="small" onClick={() => onChange(itens.filter((x) => x.id !== it.id))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )
        )}
        {itens.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum item informado.
          </Typography>
        ) : null}
        {!readOnly ? (
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={placeholder}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionar()
                }
              }}
            />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionar} disabled={!novo.trim()} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
              Adicionar
            </Button>
          </Box>
        ) : null}
      </Box>
    </Paper>
  )
}

type Props = {
  projectId?: string
  charter: unknown
  readOnly: boolean
  /** Link público: seções liberadas no compartilhamento. */
  showEscopo?: boolean
  showRiscos?: boolean
  showFinanceiro?: boolean
  onSaved?: (charter: ProjectCharter) => void
}

export default function ProjectCharterView({
  projectId,
  charter,
  readOnly,
  showEscopo = true,
  showRiscos = true,
  showFinanceiro = true,
  onSaved,
}: Props) {
  const inicial = useMemo(() => parseCharter(charter), [charter])
  const [draft, setDraft] = useState<ProjectCharter>(inicial)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [novoRisco, setNovoRisco] = useState<{ descricao: string; nivel: RiscoNivel; mitigacao: string }>({
    descricao: '',
    nivel: 'intermediario',
    mitigacao: '',
  })

  useEffect(() => {
    if (!dirty) setDraft(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial])

  const update = (patch: Partial<ProjectCharter>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
    setSavedMsg(false)
  }

  const salvar = async () => {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      const saved = await getApi().put<ProjectCharter>(`/projetos/${encodeURIComponent(projectId)}/charter`, draft)
      const parsed = parseCharter(saved)
      setDraft(parsed)
      setDirty(false)
      setSavedMsg(true)
      onSaved?.(parsed)
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível salvar o Project Charter.')
    } finally {
      setSaving(false)
    }
  }

  const adicionarRisco = () => {
    const descricao = novoRisco.descricao.trim()
    if (!descricao) return
    update({
      riscos: [
        ...draft.riscos,
        { id: novoId('risco'), descricao, nivel: novoRisco.nivel, mitigacao: novoRisco.mitigacao.trim(), createdAt: new Date().toISOString() },
      ],
    })
    setNovoRisco({ descricao: '', nivel: 'intermediario', mitigacao: '' })
  }

  const riscosOrdenados = useMemo(
    () => [...draft.riscos].sort((a, b) => NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel]),
    [draft.riscos]
  )
  const contagemNivel = useMemo(() => {
    const c: Record<RiscoNivel, number> = { baixo: 0, intermediario: 0, alto: 0, muito_alto: 0 }
    for (const r of draft.riscos) c[r.nivel] += 1
    return c
  }, [draft.riscos])

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Project Charter
          </Typography>
          {draft.atualizadoEm ? (
            <Typography variant="caption" color="text.secondary">
              Atualizado em {new Date(draft.atualizadoEm).toLocaleString('pt-BR')}
              {draft.atualizadoPor ? ` por ${draft.atualizadoPor}` : ''}
            </Typography>
          ) : null}
        </Box>
        {!readOnly ? (
          <>
            {dirty ? <Chip size="small" color="warning" label="Alterações não salvas" /> : null}
            {savedMsg && !dirty ? <Chip size="small" color="success" label="Salvo" /> : null}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => void salvar()}
              disabled={!dirty || saving}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        ) : null}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {showEscopo ? (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Escopo do projeto
            </Typography>
            {readOnly ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} color={draft.escopo ? 'text.primary' : 'text.secondary'}>
                {draft.escopo || 'Escopo não informado.'}
              </Typography>
            ) : (
              <TextField
                fullWidth
                multiline
                minRows={4}
                placeholder="Descreva o objetivo, as entregas e os limites do projeto."
                value={draft.escopo}
                onChange={(e) => update({ escopo: e.target.value })}
              />
            )}
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <ListaItens
                titulo="Itens incluídos no escopo"
                subtitulo="O que será entregue neste projeto."
                icon={<IncluidoIcon sx={{ color: '#00A649' }} />}
                cor="#00A649"
                itens={draft.incluidos}
                readOnly={readOnly}
                placeholder="Novo item incluído"
                onChange={(incluidos) => update({ incluidos })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ListaItens
                titulo="Itens excluídos do escopo"
                subtitulo="O que não faz parte deste projeto."
                icon={<ExcluidoIcon sx={{ color: '#DA3832' }} />}
                cor="#DA3832"
                itens={draft.excluidos}
                readOnly={readOnly}
                placeholder="Novo item excluído"
                onChange={(excluidos) => update({ excluidos })}
              />
            </Grid>
          </Grid>
        </>
      ) : null}

      {showRiscos ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderTop: '3px solid #F57C00' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <RiscoIcon sx={{ color: '#F57C00' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
              Riscos mapeados
            </Typography>
            {RISCO_NIVEIS.map((n) => (
              <Chip
                key={n.value}
                size="small"
                variant="outlined"
                label={`${n.label}: ${contagemNivel[n.value]}`}
                sx={{ borderColor: n.color, color: n.color, fontWeight: 700 }}
              />
            ))}
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Risco</TableCell>
                  <TableCell sx={{ width: 170 }}>Classificação</TableCell>
                  <TableCell>Plano de mitigação</TableCell>
                  <TableCell sx={{ width: 110 }}>Identificado em</TableCell>
                  {!readOnly ? <TableCell sx={{ width: 48 }} /> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {riscosOrdenados.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {readOnly ? (
                        <Typography variant="body2">{r.descricao}</Typography>
                      ) : (
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          value={r.descricao}
                          onChange={(e) =>
                            update({ riscos: draft.riscos.map((x) => (x.id === r.id ? { ...x, descricao: e.target.value } : x)) })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <NivelChip nivel={r.nivel} />
                      ) : (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={r.nivel}
                          onChange={(e) =>
                            update({
                              riscos: draft.riscos.map((x) => (x.id === r.id ? { ...x, nivel: e.target.value as RiscoNivel } : x)),
                            })
                          }
                        >
                          {RISCO_NIVEIS.map((n) => (
                            <MenuItem key={n.value} value={n.value}>
                              <NivelChip nivel={n.value} />
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <Typography variant="body2" color={r.mitigacao ? 'text.primary' : 'text.secondary'}>
                          {r.mitigacao || '—'}
                        </Typography>
                      ) : (
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          placeholder="Opcional"
                          value={r.mitigacao}
                          onChange={(e) =>
                            update({ riscos: draft.riscos.map((x) => (x.id === r.id ? { ...x, mitigacao: e.target.value } : x)) })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</Typography>
                    </TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <Tooltip title="Remover risco">
                          <IconButton size="small" onClick={() => update({ riscos: draft.riscos.filter((x) => x.id !== r.id) })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {riscosOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 4 : 5}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                        Nenhum risco mapeado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>

          {!readOnly ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 170px 2fr auto' }, gap: 1, mt: 2, alignItems: 'start' }}>
              <TextField
                size="small"
                label="Novo risco"
                multiline
                value={novoRisco.descricao}
                onChange={(e) => setNovoRisco((s) => ({ ...s, descricao: e.target.value }))}
              />
              <TextField
                select
                size="small"
                label="Classificação"
                value={novoRisco.nivel}
                onChange={(e) => setNovoRisco((s) => ({ ...s, nivel: e.target.value as RiscoNivel }))}
              >
                {RISCO_NIVEIS.map((n) => (
                  <MenuItem key={n.value} value={n.value}>
                    <NivelChip nivel={n.value} />
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Plano de mitigação (opcional)"
                multiline
                value={novoRisco.mitigacao}
                onChange={(e) => setNovoRisco((s) => ({ ...s, mitigacao: e.target.value }))}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={adicionarRisco}
                disabled={!novoRisco.descricao.trim()}
                sx={{ textTransform: 'none', height: 40, whiteSpace: 'nowrap' }}
              >
                Adicionar risco
              </Button>
            </Box>
          ) : null}
        </Paper>
      ) : null}

      {showFinanceiro ? (
        <CharterFinanceiroSection itens={draft.financeiro} readOnly={readOnly} onChange={(financeiro) => update({ financeiro })} />
      ) : null}

      {!readOnly && dirty ? (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 2 }}>
          Clique em "Salvar" para gravar as alterações do Project Charter.
        </Typography>
      ) : null}
    </Box>
  )
}
