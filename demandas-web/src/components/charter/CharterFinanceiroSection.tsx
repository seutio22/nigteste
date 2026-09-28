import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
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
  DeleteOutline as DeleteIcon,
  PaidOutlined as FinanceiroIcon,
} from '@mui/icons-material'
import {
  PAGADORES,
  TIPOS_FINANCEIRO,
  formatBRL,
  mensalDoItem,
  resumoFinanceiro,
  totalDoItem,
  type CharterFinanceiroItem,
  type FinanceiroPagador,
  type FinanceiroTipo,
} from './charterFinanceiro'

const COR = '#00838F'

function novoId() {
  return `fin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function numero(v: string): number {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function inteiro(v: string): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function PagadorChip({ pagador }: { pagador: FinanceiroPagador }) {
  const p = PAGADORES.find((x) => x.value === pagador) ?? PAGADORES[0]
  return <Chip size="small" label={p.label} sx={{ bgcolor: p.color, color: '#fff', fontWeight: 700 }} />
}

function labelMeses(tipo: FinanceiroTipo) {
  return tipo === 'mensal' ? 'Duração (meses)' : 'Diluir em (meses)'
}

function ResumoCard({ titulo, cor, itens, pagador }: { titulo: string; cor: string; itens: CharterFinanceiroItem[]; pagador?: FinanceiroPagador }) {
  const r = resumoFinanceiro(itens, pagador)
  const linha = (label: string, valor: number) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {formatBRL(valor)}
      </Typography>
    </Box>
  )
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: `4px solid ${cor}`, height: '100%' }}>
      <Typography variant="overline" sx={{ color: cor, fontWeight: 700, lineHeight: 1.5 }}>
        {titulo}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {formatBRL(r.custoMensalDiluido)}
        <Typography component="span" variant="caption" color="text.secondary">
          {' '}
          / mês (diluído)
        </Typography>
      </Typography>
      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {linha('Recursos mensais', r.recorrenteMensal)}
        {linha('Investimentos', r.investimentoTotal)}
        {linha('Investimentos diluídos / mês', r.investimentoDiluidoMensal)}
        {linha('Custo total do projeto', r.custoTotalProjeto)}
      </Box>
    </Paper>
  )
}

type Novo = { descricao: string; tipo: FinanceiroTipo; pagador: FinanceiroPagador; valor: string; meses: string }
const NOVO_VAZIO: Novo = { descricao: '', tipo: 'mensal', pagador: 'empresa', valor: '', meses: '12' }

export default function CharterFinanceiroSection({
  itens,
  readOnly,
  onChange,
}: {
  itens: CharterFinanceiroItem[]
  readOnly: boolean
  onChange: (itens: CharterFinanceiroItem[]) => void
}) {
  const [novo, setNovo] = useState<Novo>(NOVO_VAZIO)

  const alterar = (id: string, patch: Partial<CharterFinanceiroItem>) =>
    onChange(itens.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const adicionar = () => {
    const descricao = novo.descricao.trim()
    if (!descricao) return
    onChange([
      ...itens,
      { id: novoId(), descricao, tipo: novo.tipo, pagador: novo.pagador, valor: numero(novo.valor), meses: inteiro(novo.meses) },
    ])
    setNovo(NOVO_VAZIO)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, borderTop: `3px solid ${COR}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <FinanceiroIcon sx={{ color: COR }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Financeiro
        </Typography>
        <Chip size="small" label={itens.length} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Recursos mensais contam pela duração; investimentos são diluídos no custo mensal pelo número de meses informado.
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <ResumoCard titulo="Total" cor={COR} itens={itens} />
        </Grid>
        {PAGADORES.map((p) => (
          <Grid item xs={12} md={4} key={p.value}>
            <ResumoCard titulo={p.label} cor={p.color} itens={itens} pagador={p.value} />
          </Grid>
        ))}
      </Grid>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell sx={{ width: 160 }}>Tipo</TableCell>
              <TableCell sx={{ width: 130 }}>Pagador</TableCell>
              <TableCell sx={{ width: 150 }} align="right">
                Valor
              </TableCell>
              <TableCell sx={{ width: 110 }} align="right">
                Meses
              </TableCell>
              <TableCell sx={{ width: 130 }} align="right">
                Custo / mês
              </TableCell>
              <TableCell sx={{ width: 130 }} align="right">
                Total
              </TableCell>
              {!readOnly ? <TableCell sx={{ width: 48 }} /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {itens.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell>
                  {readOnly ? (
                    <Typography variant="body2">{f.descricao}</Typography>
                  ) : (
                    <TextField size="small" fullWidth multiline value={f.descricao} onChange={(e) => alterar(f.id, { descricao: e.target.value })} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <Typography variant="body2">{TIPOS_FINANCEIRO.find((t) => t.value === f.tipo)?.label}</Typography>
                  ) : (
                    <TextField select size="small" fullWidth value={f.tipo} onChange={(e) => alterar(f.id, { tipo: e.target.value as FinanceiroTipo })}>
                      {TIPOS_FINANCEIRO.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <PagadorChip pagador={f.pagador} />
                  ) : (
                    <TextField select size="small" fullWidth value={f.pagador} onChange={(e) => alterar(f.id, { pagador: e.target.value as FinanceiroPagador })}>
                      {PAGADORES.map((p) => (
                        <MenuItem key={p.value} value={p.value}>
                          <PagadorChip pagador={p.value} />
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </TableCell>
                <TableCell align="right">
                  {readOnly ? (
                    <Typography variant="body2">
                      {formatBRL(f.valor)}
                      {f.tipo === 'mensal' ? ' /mês' : ''}
                    </Typography>
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      value={f.valor || ''}
                      onChange={(e) => alterar(f.id, { valor: numero(e.target.value) })}
                      inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                      InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  {readOnly ? (
                    <Tooltip title={labelMeses(f.tipo)}>
                      <Typography variant="body2">{f.meses}</Typography>
                    </Tooltip>
                  ) : (
                    <Tooltip title={labelMeses(f.tipo)}>
                      <TextField
                        size="small"
                        type="number"
                        value={f.meses}
                        onChange={(e) => alterar(f.id, { meses: inteiro(e.target.value) })}
                        inputProps={{ min: 1, step: 1, style: { textAlign: 'right' } }}
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatBRL(mensalDoItem(f))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatBRL(totalDoItem(f))}</Typography>
                </TableCell>
                {!readOnly ? (
                  <TableCell>
                    <Tooltip title="Remover item">
                      <IconButton size="small" onClick={() => onChange(itens.filter((x) => x.id !== f.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    Nenhum item financeiro informado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      {!readOnly ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 170px 140px 160px 130px auto' },
            gap: 1,
            mt: 2,
            alignItems: 'start',
          }}
        >
          <TextField
            size="small"
            label="Novo item financeiro"
            value={novo.descricao}
            onChange={(e) => setNovo((s) => ({ ...s, descricao: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar()
              }
            }}
          />
          <TextField select size="small" label="Tipo" value={novo.tipo} onChange={(e) => setNovo((s) => ({ ...s, tipo: e.target.value as FinanceiroTipo }))}>
            {TIPOS_FINANCEIRO.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Pagador"
            value={novo.pagador}
            onChange={(e) => setNovo((s) => ({ ...s, pagador: e.target.value as FinanceiroPagador }))}
          >
            {PAGADORES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={novo.tipo === 'mensal' ? 'Valor mensal' : 'Valor do investimento'}
            value={novo.valor}
            onChange={(e) => setNovo((s) => ({ ...s, valor: e.target.value }))}
            inputProps={{ min: 0, step: '0.01' }}
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
          />
          <TextField
            size="small"
            type="number"
            label={labelMeses(novo.tipo)}
            value={novo.meses}
            onChange={(e) => setNovo((s) => ({ ...s, meses: e.target.value }))}
            inputProps={{ min: 1, step: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={adicionar}
            disabled={!novo.descricao.trim()}
            sx={{ textTransform: 'none', height: 40, whiteSpace: 'nowrap' }}
          >
            Adicionar
          </Button>
        </Box>
      ) : null}
    </Paper>
  )
}
