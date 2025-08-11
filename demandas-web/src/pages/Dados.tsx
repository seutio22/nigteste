import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Tab, Tabs, TextField, Typography, MenuItem } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useRef, useState } from 'react'
import { useMasterDataStore } from '@/store/masterDataStore'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, TipoDemanda, TipoServico } from '@/types/masterData'
import * as XLSX from 'xlsx'

type TabKey = 'clientes' | 'contratos' | 'operadoras' | 'produtos' | 'sistemas' | 'analistas' | 'areas' | 'tipos' | 'servicos'

const columns: Record<TabKey, GridColDef[]> = {
  clientes: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
    { field: 'grupoEconomico', headerName: 'Grupo econômico', flex: 1 },
  ],
  contratos: [
    { field: 'grupoEconomico', headerName: 'Grupo econômico', width: 180 },
    { field: 'codigo', headerName: 'Código', flex: 1 },
  ],
  operadoras: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
  produtos: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
  sistemas: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
  analistas: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
  areas: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
  tipos: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
    { field: 'tipoServicoId', headerName: 'Tipo de serviço', width: 200, valueGetter: (params: any) => {
      const id = params?.row?.tipoServicoId
      const st = (window as any).__md?.tiposServico || []
      const it = st.find((x: any) => x.id === id)
      return it?.nome || ''
    } },
  ],
  servicos: [
    { field: 'nome', headerName: 'Nome', flex: 1 },
  ],
}

export default function DadosPage() {
  const store = useMasterDataStore()
  // Expor store para valueGetter simples (evitar recriação de col defs)
  ;(window as any).__md = store
  const [tab, setTab] = useState<TabKey>('clientes')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({})
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [openHelp, setOpenHelp] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' } | null>(null)

  const dataMap: Record<TabKey, any[]> = {
    clientes: store.clientes,
    contratos: store.contratos,
    operadoras: store.operadoras,
    produtos: store.produtos,
    sistemas: store.sistemas,
    analistas: store.analistas,
    areas: store.areas,
    tipos: store.tiposDemanda,
    servicos: store.tiposServico,
  }

  function handleAdd() {
    setForm({})
    setOpen(true)
  }

  function handleSave() {
    const id = form.id || crypto.randomUUID()
    switch (tab) {
      case 'clientes':
        store.upsertMany({ clientes: [...store.clientes, { id, nome: form.nome ?? '', grupoEconomico: form.grupoEconomico ?? '' } as Cliente] })
        break
      case 'contratos':
        store.upsertMany({ contratos: [...store.contratos, { id, grupoEconomico: form.grupoEconomico ?? '', codigo: form.codigo ?? '' } as Contrato] })
        break
      case 'operadoras':
        store.upsertMany({ operadoras: [...store.operadoras, { id, nome: form.nome ?? '' } as Operadora] })
        break
      case 'produtos':
        store.upsertMany({ produtos: [...store.produtos, { id, nome: form.nome ?? '' } as Produto] })
        break
      case 'sistemas':
        store.upsertMany({ sistemas: [...store.sistemas, { id, nome: form.nome ?? '' } as Sistema] })
        break
      case 'analistas':
        store.upsertMany({ analistas: [...store.analistas, { id, nome: form.nome ?? '' } as Analista] })
        break
      case 'areas':
        store.upsertMany({ areas: [...store.areas, { id, nome: form.nome ?? '' } as Area] })
        break
      case 'tipos':
        store.upsertMany({ tiposDemanda: [...store.tiposDemanda, { id, nome: form.nome ?? '', tipoServicoId: form.tipoServicoId ?? '' } as TipoDemanda] })
        break
      case 'servicos':
        store.upsertMany({ tiposServico: [...store.tiposServico, { id, nome: form.nome ?? '' } as TipoServico] })
        break
    }
    setOpen(false)
  }

  function handleImportClick() {
    fileRef.current?.click()
  }

  function toStringSafe(v: any): string {
    if (v == null) return ''
    return String(v).trim()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error('Arquivo sem abas detectadas')

        const normalize = (s: string) => s
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .replace(/\s+/g, '')

        // Acumular todas as abas reconhecidas por categoria
        const buckets: Record<'clientes'|'contratos'|'operadoras'|'produtos'|'sistemas'|'analistas'|'areas'|'tipos', any[]> = {
          clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tipos: [],
        }

        const matchCategory = (name: string): keyof typeof buckets | null => {
          const n = normalize(name)
          if (['clientes'].includes(n)) return 'clientes'
          if (['contratos'].includes(n)) return 'contratos'
          if (['operadoras'].includes(n)) return 'operadoras'
          if (['produtos'].includes(n)) return 'produtos'
          if (['sistemas'].includes(n)) return 'sistemas'
          if (['analistas'].includes(n)) return 'analistas'
          if (['areas','areasolicitantes','area'].includes(n)) return 'areas'
          if (['tipos','tiposdemanda','tipodedemanda'].includes(n)) return 'tipos'
          return null
        }

        let recognizedSheets = 0
        let ignoredSheets = 0

        wb.SheetNames.forEach((sheetName) => {
          const cat = matchCategory(sheetName)
          if (!cat) { ignoredSheets++; return }
          const sh = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<any>(sh, { defval: '' })
          buckets[cat].push(...rows)
          recognizedSheets++
        })

        const genId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

        const importedClientes = buckets.clientes.map((r) => ({
          id: toStringSafe(r.id) || genId(),
          nome: toStringSafe(r.nome ?? r.Nome),
          grupoEconomico: toStringSafe(r.grupoEconomico ?? r['Grupo Econômico'] ?? r.grupo_economico),
        })).filter((x) => x.nome)

        const importedContratos = buckets.contratos.map((r) => ({
          id: toStringSafe(r.id) || genId(),
          grupoEconomico: toStringSafe(r.grupoEconomico ?? r['Grupo Econômico'] ?? r.grupo_economico),
          codigo: toStringSafe(r.codigo ?? r.Código),
        })).filter((x) => x.codigo)

        const simple = (rows: any[], key = 'nome') => rows
          .map((r) => ({ id: toStringSafe(r.id) || genId(), nome: toStringSafe(r[key] ?? r.Nome) }))
          .filter((x) => x.nome)

        const importedOperadoras = simple(buckets.operadoras) as Operadora[]
        const importedProdutos = simple(buckets.produtos) as Produto[]
        const importedSistemas = simple(buckets.sistemas) as Sistema[]
        const importedAnalistas = simple(buckets.analistas) as Analista[]
        const importedAreas = simple(buckets.areas) as Area[]
        const importedTipos = (buckets.tipos).map((r: any) => ({
          id: toStringSafe(r.id) || genId(),
          nome: toStringSafe(r.nome ?? r.Nome),
          tipoServicoId: toStringSafe(r.tipoServicoId ?? r['Tipo de serviço'] ?? r.tipo_servico_id),
        })).filter((x: any) => x.nome)
        const importedServicos = simple((buckets as any).servicos ?? []) as TipoServico[]

        // Mesclar com existentes
        store.upsertMany({
          clientes: [...store.clientes, ...importedClientes],
          contratos: [...store.contratos, ...importedContratos],
          operadoras: [...store.operadoras, ...importedOperadoras],
          produtos: [...store.produtos, ...importedProdutos],
          sistemas: [...store.sistemas, ...importedSistemas],
          analistas: [...store.analistas, ...importedAnalistas],
          areas: [...store.areas, ...importedAreas],
          tiposDemanda: [...store.tiposDemanda, ...importedTipos],
          tiposServico: [...store.tiposServico, ...importedServicos],
        })

        const total = importedClientes.length + importedContratos.length + importedOperadoras.length + importedProdutos.length + importedSistemas.length + importedAnalistas.length + importedAreas.length + importedTipos.length + importedServicos.length
        setSnack({ open: true, message: `Importação concluída. Abas lidas: ${recognizedSheets}, ignoradas: ${ignoredSheets}. Registros adicionados: ${total}.`, severity: 'success' })
      } catch (err: any) {
        setSnack({ open: true, message: `Falha ao importar: ${err?.message ?? err}`, severity: 'error' })
      } finally {
        // Limpar input para permitir reupload do mesmo arquivo
        if (fileRef.current) fileRef.current.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const addSheet = (name: string, headers: string[]) => {
      const ws = XLSX.utils.aoa_to_sheet([headers])
      XLSX.utils.book_append_sheet(wb, ws, name)
    }
    addSheet('Clientes', ['id', 'nome', 'grupoEconomico'])
    addSheet('Contratos', ['id', 'grupoEconomico', 'codigo'])
    addSheet('Operadoras', ['id', 'nome'])
    addSheet('Produtos', ['id', 'nome'])
    addSheet('Sistemas', ['id', 'nome'])
    addSheet('Analistas', ['id', 'nome'])
    addSheet('Areas', ['id', 'nome'])
    addSheet('Tipos', ['id', 'nome', 'tipoServicoId'])
    addSheet('Servicos', ['id', 'nome'])
    XLSX.writeFile(wb, 'modelo-dados-mestres.xlsx')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Dados Mestres</Typography>
        <Box>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
          <Button sx={{ mr: 1 }} variant="outlined" onClick={handleImportClick}>Importar Excel</Button>
          <Button sx={{ mr: 1 }} variant="outlined" onClick={downloadTemplate}>Modelo Excel</Button>
          <Button onClick={() => setOpenHelp(true)}>Instruções</Button>
          {tab !== 'servicos' && (
            <IconButton color="primary" onClick={handleAdd}><AddIcon /></IconButton>
          )}
        </Box>
      </Stack>

      <Typography variant="body2" sx={{ mb: 2 }}>
        Para importar, utilize o modelo com abas: Clientes, Contratos, Operadoras, Produtos, Sistemas, Analistas, Areas, Tipos, Servicos. As colunas devem seguir exatamente os nomes do modelo. Em "Tipos", preencha "tipoServicoId" com CAD (Cadastro) ou MAN (Manutenção).
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="clientes" label="Clientes" />
        <Tab value="contratos" label="Contratos" />
        <Tab value="operadoras" label="Operadoras" />
        <Tab value="produtos" label="Produtos" />
        <Tab value="sistemas" label="Sistemas" />
        <Tab value="analistas" label="Analistas" />
        <Tab value="areas" label="Áreas" />
        <Tab value="tipos" label="Tipos de demanda" />
        <Tab value="servicos" label="Tipos de serviço" />
      </Tabs>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={dataMap[tab]}
          columns={[...columns[tab], {
            field: 'acoes', headerName: 'Ações', width: 100, sortable: false, filterable: false,
            renderCell: (params) => (
              <IconButton color="error" onClick={() => {
                const id = params.row.id as string
                switch (tab) {
                  case 'clientes':
                    store.upsertMany({ clientes: store.clientes.filter(x => x.id !== id) })
                    break
                  case 'contratos':
                    store.upsertMany({ contratos: store.contratos.filter(x => x.id !== id) })
                    break
                  case 'operadoras':
                    store.upsertMany({ operadoras: store.operadoras.filter(x => x.id !== id) })
                    break
                  case 'produtos':
                    store.upsertMany({ produtos: store.produtos.filter(x => x.id !== id) })
                    break
                  case 'sistemas':
                    store.upsertMany({ sistemas: store.sistemas.filter(x => x.id !== id) })
                    break
                  case 'analistas':
                    store.upsertMany({ analistas: store.analistas.filter(x => x.id !== id) })
                    break
                  case 'areas':
                    store.upsertMany({ areas: store.areas.filter(x => x.id !== id) })
                    break
                  case 'tipos':
                    store.upsertMany({ tiposDemanda: store.tiposDemanda.filter(x => x.id !== id) })
                    break
                  case 'servicos':
                    if (['CAD','MAN'].includes(id)) {
                      setSnack({ open: true, message: 'Itens padrão (Cadastro/Manutenção) não podem ser excluídos.', severity: 'error' })
                      return
                    }
                    store.upsertMany({ tiposServico: store.tiposServico.filter(x => x.id !== id) })
                    break
                }
              }}>
                <DeleteIcon />
              </IconButton>
            )
          }]} 
          getRowId={(r) => r.id}
          disableRowSelectionOnClick 
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo registro</DialogTitle>
        <DialogContent>
          {tab === 'clientes' && (
            <Stack gap={2} mt={1}>
              <TextField label="Nome" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <TextField label="Grupo econômico" value={form.grupoEconomico ?? ''} onChange={(e) => setForm({ ...form, grupoEconomico: e.target.value })} />
            </Stack>
          )}
          {tab === 'contratos' && (
            <Stack gap={2} mt={1}>
              <TextField label="Grupo econômico" value={form.grupoEconomico ?? ''} onChange={(e) => setForm({ ...form, grupoEconomico: e.target.value })} />
              <TextField label="Código" value={form.codigo ?? ''} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </Stack>
          )}
          {['operadoras','produtos','sistemas','analistas','areas','servicos'].includes(tab) && (
            <Stack gap={2} mt={1}>
              <TextField label="Nome" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Stack>
          )}
          {tab === 'tipos' && (
            <Stack gap={2} mt={1}>
              <TextField label="Nome" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <TextField select label="Tipo de serviço" value={form.tipoServicoId ?? ''} onChange={(e) => setForm({ ...form, tipoServicoId: e.target.value })}>
                {store.tiposServico.map(ts => <MenuItem key={ts.id} value={ts.id}>{ts.nome}</MenuItem>)}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {snack?.open && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, background: snack.severity === 'success' ? '#1b5e20' : snack.severity === 'error' ? '#b71c1c' : '#1565c0', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>
          <Typography variant="body2">{snack.message}</Typography>
        </div>
      )}

      <Dialog open={openHelp} onClose={() => setOpenHelp(false)} fullWidth maxWidth="sm">
        <DialogTitle>Modelo de importação (Excel)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Estrutura das abas e colunas esperadas:
          </Typography>
          <Typography variant="body2">- Clientes: id, nome, grupoEconomico</Typography>
          <Typography variant="body2">- Contratos: id, grupoEconomico, codigo</Typography>
          <Typography variant="body2">- Operadoras: id, nome</Typography>
          <Typography variant="body2">- Produtos: id, nome</Typography>
          <Typography variant="body2">- Sistemas: id, nome</Typography>
          <Typography variant="body2">- Analistas: id, nome</Typography>
          <Typography variant="body2">- Areas: id, nome</Typography>
          <Typography variant="body2">- Tipos: id, nome</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Observações: IDs podem ser deixados em branco para geração automática. Para Contratos, o vínculo é por grupoEconomico.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHelp(false)}>Fechar</Button>
          <Button variant="contained" onClick={downloadTemplate}>Baixar modelo</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}


