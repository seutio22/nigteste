import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useDemandStore } from '@/store/demandStore'
import { useMasterDataStore } from '@/store/masterDataStore'
import { StatusBadge } from '@/components/StatusBadge'
import { useEffect, useState } from 'react'

export default function DemandDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items } = useDemandStore()
  const md = useMasterDataStore()
  const d = items.find((x) => x.id === id)

  const label = (id?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === id)?.nome || '-'
  const labelContrato = (id?: string) => md.contratos.find(c => c.id === id)?.codigo || '-'
  const tempo = calcTempo(d?.dataInicio, d?.dataFinal)

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/cadastro')}>Voltar</Button>
        <Typography variant="h5">{`Demanda ${d?.ticket || '#' + id}`}</Typography>
        </Stack>
        <StatusBadge status={d?.status ?? 'Aberta'} />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Resumo</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Cliente: ${label(d?.cliente, md.clientes)}`} />
                <Chip label={`Contrato: ${labelContrato(d?.contrato)}`} />
                <Chip label={`Operadora: ${label(d?.operadora, md.operadoras)}`} />
                <Chip label={`Produto: ${label(d?.produto, md.produtos)}`} />
                <Chip label={`Sistema: ${label(d?.sistema, md.sistemas)}`} />
                <Chip label={`Área: ${label(d?.area, md.areas)}`} />
                <Chip label={`Analista: ${label(d?.analista, md.analistas)}`} />
                <Chip label={`Tipo: ${label(d?.tipo, md.tiposDemanda)}`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Descrição</Typography>
              <Typography variant="body2">{d?.descricao || '-'}</Typography>
              <Divider sx={{ my: 2 }} />
              {/* Edição inline básica dos principais campos */}
              {d && (
                <EditInline d={d} />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Indicadores</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">Início: {fmt(d?.dataInicio)}</Typography>
                <Typography variant="body2">Finalização: {fmt(d?.dataFinal)}</Typography>
                <Typography variant="body2">Tempo decorrido: {tempo}</Typography>
                <Typography variant="body2">Qtde de retornos: {d?.qtdRetornos ?? 0}</Typography>
                <Typography variant="body2">Qualidade: {d?.qualidade ?? '-'}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Typography variant="subtitle1" gutterBottom>Timeline</Typography>
        <Timeline demandaId={id!} />
      </Box>
    </Paper>
  )
}

function fmt(date?: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function calcTempo(inicio?: string, fim?: string) {
  if (!inicio) return '-'
  const start = new Date(inicio).getTime()
  const end = fim ? new Date(fim).getTime() : Date.now()
  const diff = Math.max(0, end - start)
  const dias = Math.floor(diff / (24 * 60 * 60 * 1000))
  const horas = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return `${dias}d ${horas}h`
}

import type { Demand } from '@/types/demand'

function EditInline({ d }: { d: Demand }) {
  const md = useMasterDataStore()
  const store = useDemandStore()

  const [draft, setDraft] = useState<Demand>(d)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setDraft(d)
  }, [d.id])

  const contratosDoGrupo = md.contratos.filter(c => c.grupoEconomico === md.clientes.find(c => c.id === draft.cliente)?.grupoEconomico)

  const changedKeys = ((): (keyof Demand)[] => {
    const keys: (keyof Demand)[] = ['status','cliente','contrato','operadora','produto','descricao']
    return keys.filter((k) => String(d[k] ?? '') !== String(draft[k] ?? ''))
  })()

  function applySave() {
    // aplicar alterações e registrar timeline
    store.upsert(draft)
    changedKeys.forEach((k) => {
      const from = String(d[k] ?? '')
      const to = String(draft[k] ?? '')
      if (k === 'status') {
        store.log({ demandaId: d.id, type: 'status_change', field: 'status', from, to })
      } else {
        store.log({ demandaId: d.id, type: 'field_change', field: String(k), from, to })
      }
    })
    setConfirmOpen(false)
  }

  return (
    <Stack spacing={2} mt={1}>
      <TextField select label="Status" size="small" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} sx={{ maxWidth: 300 }}>
        {['Aberta','Em andamento','Aguardando validação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => (
          <MenuItem key={s} value={s}>{s}</MenuItem>
        ))}
      </TextField>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField select label="Cliente" size="small" value={draft.cliente} onChange={(e) => setDraft({ ...draft, cliente: e.target.value })} sx={{ minWidth: 240 }}>
          {md.clientes.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
        </TextField>
        <TextField select label="Contrato" size="small" value={draft.contrato} onChange={(e) => setDraft({ ...draft, contrato: e.target.value })} sx={{ minWidth: 200 }}>
          {contratosDoGrupo.map(ct => <MenuItem key={ct.id} value={ct.id}>{ct.codigo}</MenuItem>)}
        </TextField>
        <TextField select label="Operadora" size="small" value={draft.operadora} onChange={(e) => setDraft({ ...draft, operadora: e.target.value })} sx={{ minWidth: 200 }}>
          {md.operadoras.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
        </TextField>
        <TextField select label="Produto" size="small" value={draft.produto} onChange={(e) => setDraft({ ...draft, produto: e.target.value })} sx={{ minWidth: 200 }}>
          {md.produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
        </TextField>
      </Stack>
      <TextField label="Descrição" size="small" fullWidth value={draft.descricao ?? ''} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} />
      <Stack direction="row" spacing={2}>
        <Button variant="contained" disabled={changedKeys.length === 0} onClick={() => setConfirmOpen(true)}>Salvar alterações</Button>
        {changedKeys.length > 0 && <Typography variant="caption">{changedKeys.length} alteração(ões) pendente(s)</Typography>}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar alterações</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Aplicar {changedKeys.length} alteração(ões) nesta demanda?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={applySave}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function Timeline({ demandaId }: { demandaId: string }) {
  const { timeline } = useDemandStore()
  const md = useMasterDataStore()
  const events = timeline.filter(e => e.demandaId === demandaId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const mapValue = (field?: string, value?: string) => {
    if (!value) return '-'
    switch (field) {
      case 'cliente': return md.clientes.find(c => c.id === value)?.nome ?? value
      case 'contrato': return md.contratos.find(c => c.id === value)?.codigo ?? value
      case 'operadora': return md.operadoras.find(o => o.id === value)?.nome ?? value
      case 'produto': return md.produtos.find(p => p.id === value)?.nome ?? value
      case 'sistema': return md.sistemas.find(s => s.id === value)?.nome ?? value
      case 'area': return md.areas.find(a => a.id === value)?.nome ?? value
      case 'analista': return md.analistas.find(a => a.id === value)?.nome ?? value
      case 'tipo': return md.tiposDemanda.find(t => t.id === value)?.nome ?? value
      default: return value
    }
  }
  return (
    <Stack spacing={1}>
      {events.length === 0 && <Typography variant="body2">Sem eventos até o momento.</Typography>}
      {events.map(ev => (
        <Card key={ev.id} variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle2">{labelTipo(ev)}</Typography>
              <Typography variant="caption">{new Date(ev.timestamp).toLocaleString('pt-BR')}</Typography>
            </Stack>
            {ev.field && (
              <Typography variant="body2">{ev.field}: {mapValue(ev.field, ev.from)} → {mapValue(ev.field, ev.to)}</Typography>
            )}
            {ev.comment && (
              <Typography variant="body2">{ev.comment}</Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

function labelTipo(ev: { type: string }) {
  switch (ev.type) {
    case 'create': return 'Criação'
    case 'field_change': return 'Alteração de campo'
    case 'status_change': return 'Mudança de status'
    case 'comment': return 'Comentário'
    default: return ev.type
  }
}


