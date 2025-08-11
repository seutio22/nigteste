import { Box, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMasterDataStore } from '@/store/masterDataStore'
import { useDemandStore } from '@/store/demandStore'
import { useValidationStore } from '@/store/validationStore'
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#0088FE', '#FFBB28', '#FF8042']

export default function AnalyticsPage() {
  const md = useMasterDataStore()
  const { items: demandas } = useDemandStore()
  const { items: validacoes } = useValidationStore()

  // Filtros simples
  const [areaId, setAreaId] = useState('')
  const [analistaId, setAnalistaId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const inRange = (iso?: string) => {
    if (!iso) return true
    const t = new Date(iso).getTime()
    if (fromDate && t < new Date(fromDate).getTime()) return false
    if (toDate && t > new Date(toDate + 'T23:59:59').getTime()) return false
    return true
  }

  const demandasFiltradas = useMemo(() => {
    return demandas.filter(d =>
      (!areaId || d.area === areaId) &&
      (!analistaId || d.analista === analistaId) &&
      inRange(d.dataInicio || d.createdAt)
    )
  }, [demandas, areaId, analistaId, fromDate, toDate])

  const validacoesFiltradas = useMemo(() => {
    return validacoes.filter(v =>
      (!analistaId || v.analista === analistaId) &&
      inRange(v.dataInicio)
    )
  }, [validacoes, analistaId, fromDate, toDate])

  // Demanda: por status
  const byStatus = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => map.set(d.status, (map.get(d.status) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [demandasFiltradas])

  // Demanda: por área
  const byArea = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      const name = md.areas.find(a => a.id === d.area)?.nome || '—'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [demandasFiltradas, md.areas])

  // Demanda: por mês
  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      const dt = d.dataInicio || d.createdAt
      const k = dt ? new Date(dt).toISOString().slice(0, 7) : '—'
      map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([month, total]) => ({ month, total }))
  }, [demandasFiltradas])

  // Demanda: por tipo de serviço
  const byTipoServico = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      const name = md.tiposServico.find(ts => ts.id === (d as any).tipoServico)?.nome || '—'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [demandasFiltradas, md.tiposServico])

  // Validação: total por analista e status
  const valByAnalista = useMemo(() => {
    const map = new Map<string, number>()
    validacoesFiltradas.forEach(v => {
      const name = md.analistas.find(a => a.id === v.analista)?.nome || '—'
      map.set(name, (map.get(name) || 0) + (v.total ?? 0))
    })
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }))
  }, [validacoesFiltradas, md.analistas])

  const valByStatus = useMemo(() => {
    const map = new Map<string, number>()
    validacoesFiltradas.forEach(v => {
      const key = v.status || '—'
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [validacoesFiltradas])

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Analytics</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Área" value={areaId} onChange={(e) => setAreaId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas</MenuItem>
          {md.areas.map(a => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
        </TextField>
        <TextField select label="Analista" value={analistaId} onChange={(e) => setAnalistaId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todos</MenuItem>
          {md.analistas.map(a => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
        </TextField>
        <TextField type="date" label="De" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <TextField type="date" label="Até" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </Stack>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Cadastro (Demandas)</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Typography align="center">Status</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byArea}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Demandas" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Typography align="center">Por área</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTipoServico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Demandas" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Typography align="center">Por tipo de serviço</Typography>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Demandas/mês" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Validação</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valByAnalista}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Typography align="center">Total por analista</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={valByStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {valByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Typography align="center">Validações por status</Typography>
        </Grid>
      </Grid>
    </Paper>
  )
}


