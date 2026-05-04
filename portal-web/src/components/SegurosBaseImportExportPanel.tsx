import { useCallback, useState } from 'react'

import {

  Alert,

  Box,

  Button,

  Chip,

  Divider,

  LinearProgress,

  List,

  ListItem,

  ListItemText,

  Paper,

  Typography,

} from '@mui/material'

import DownloadIcon from '@mui/icons-material/Download'

import UploadFileIcon from '@mui/icons-material/UploadFile'

import PlayArrowIcon from '@mui/icons-material/PlayArrow'

import { apiBlob, apiFormData, getPortalApiBaseDisplay } from '../lib/api'



type SnapshotIssue = {

  severity: 'error' | 'warning'

  code: string

  message: string

  path?: string

  ids?: string[]

}



type DryRunResponse = {

  ok: boolean

  dryRun: true

  canApply: boolean

  schemaVersion: number

  counts: { grupos: number; estipulantes: number; apolices: number; itens: number; apolicePlanoLinhas?: number }

  statsIfApplied: {

    grupos: { create: number; update: number }

    estipulantes: { create: number; update: number }

    apolices: { create: number; update: number }

    itens: { create: number; update: number }

    apolicePlanoLinhas?: { rows: number }

  }

  issues: SnapshotIssue[]

  errors: SnapshotIssue[]

  warnings: SnapshotIssue[]

}



type ApplyResponse = {

  ok: boolean

  dryRun: false

  applied: {

    grupos: { create: number; update: number }

    estipulantes: { create: number; update: number }

    apolices: { create: number; update: number }

    itens: { create: number; update: number }

    apolicePlanoLinhas?: { rows: number }

  }

  warnings: SnapshotIssue[]

}



export default function SegurosBaseImportExportPanel() {

  const [busy, setBusy] = useState(false)

  const [err, setErr] = useState<string | null>(null)

  const [dryResult, setDryResult] = useState<DryRunResponse | null>(null)

  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null)

  const [pendingFile, setPendingFile] = useState<File | null>(null)



  const onExport = useCallback(async () => {

    setErr(null)

    setApplyResult(null)

    setBusy(true)

    try {

      const res = await apiBlob('/admin/seguros-base/export')

      if (!res.ok || !res.blob) {

        setErr(res.error || 'Falha ao exportar')

        return

      }

      const name =

        res.filenameHint && res.filenameHint.toLowerCase().endsWith('.xlsx')

          ? res.filenameHint

          : res.filenameHint

            ? `${res.filenameHint.replace(/\.[^.]+$/, '')}.xlsx`

            : 'portal-seguros-base.xlsx'

      const url = URL.createObjectURL(res.blob)

      const a = document.createElement('a')

      a.href = url

      a.download = name

      a.click()

      URL.revokeObjectURL(url)

    } finally {

      setBusy(false)

    }

  }, [])



  const onFile = useCallback(async (file: File | null) => {

    setErr(null)

    setDryResult(null)

    setApplyResult(null)

    setPendingFile(null)

    if (!file) return

    const lower = file.name.toLowerCase()

    if (!lower.endsWith('.xlsx')) {

      setErr('Use um ficheiro Excel (.xlsx). Exporte o modelo a partir do botão «Descarregar Excel» ou guarde como Excel (não CSV).')

      return

    }

    setBusy(true)

    try {

      setPendingFile(file)

      const fd = new FormData()

      fd.append('file', file)

      fd.append('dryRun', 'true')

      const res = await apiFormData<DryRunResponse>('/admin/seguros-base/import', fd)

      if (!res.ok || !res.data) {

        setPendingFile(null)

        setErr(res.error || 'Falha na análise do ficheiro')

        return

      }

      setDryResult(res.data)

    } finally {

      setBusy(false)

    }

  }, [])



  const onApply = useCallback(async () => {

    if (!pendingFile || !dryResult?.canApply) return

    setErr(null)

    setApplyResult(null)

    setBusy(true)

    try {

      const fd = new FormData()

      fd.append('file', pendingFile)

      fd.append('dryRun', 'false')

      const res = await apiFormData<ApplyResponse>('/admin/seguros-base/import', fd)

      if (!res.ok || !res.data) {

        setErr(res.error || 'Falha ao gravar')

        return

      }

      setApplyResult(res.data)

    } finally {

      setBusy(false)

    }

  }, [pendingFile, dryResult?.canApply])



  return (

    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>

      <Typography variant="subtitle1" fontWeight={700} gutterBottom>

        Backup e importação — cadastro de seguros (Excel)

      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

        Na <strong>visão geral</strong>, exporta ou importa <strong>grupos económicos</strong>, <strong>estipulantes</strong>,{' '}

        <strong>apólices</strong>, <strong>planos por apólice</strong> e <strong>itens</strong> em ficheiro <strong>Excel (.xlsx)</strong>, com várias folhas. Ao importar, a{' '}

        <strong>simulação</strong> lista <strong>erros bloqueantes</strong> e <strong>avisos</strong> (chaves, referências, vigências, produto) e cruza com a

        <strong> base PostgreSQL</strong>: indica <strong>complementos</strong> (campo vazio na base preenchido na planilha) e <strong>conflitos</strong> (valor

        diferente). Na gravação, <strong>células vazias ou «—»</strong> em linhas já existentes <strong>não apagam</strong> o que já está guardado — só

        valores novos substituem ou preenchem.

        Não altere os <strong>nomes das colunas</strong> nas folhas de dados.

      </Typography>



      <Alert severity="info" sx={{ mb: 2 }}>

        API: <code style={{ wordBreak: 'break-all' }}>{getPortalApiBaseDisplay()}</code> — perfil <strong>administrador</strong>. Limite ~50&nbsp;MB

        por ficheiro.

      </Alert>



      {busy ? <LinearProgress sx={{ mb: 2 }} /> : null}

      {err ? (

        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>

          {err}

        </Alert>

      ) : null}



      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>

        <Button variant="contained" startIcon={<DownloadIcon />} disabled={busy} onClick={() => void onExport()}>

          Descarregar Excel (.xlsx)

        </Button>

        <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={busy}>

          Escolher Excel e analisar

          <input

            type="file"

            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            hidden

            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}

          />

        </Button>

        <Button

          variant="contained"

          color="secondary"

          startIcon={<PlayArrowIcon />}

          disabled={busy || !dryResult?.canApply || !pendingFile}

          onClick={() => void onApply()}

        >

          Gravar na base (mesmo ficheiro, após análise sem erros)

        </Button>

      </Box>



      {dryResult ? (

        <>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>

            Resultado da análise (simulação)

          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>

            <Chip size="small" label={`Schema v${dryResult.schemaVersion}`} />

            <Chip size="small" label={`${dryResult.counts.grupos} grupos`} variant="outlined" />

            <Chip size="small" label={`${dryResult.counts.estipulantes} estipulantes`} variant="outlined" />

            <Chip size="small" label={`${dryResult.counts.apolices} apólices`} variant="outlined" />

            <Chip size="small" label={`${dryResult.counts.apolicePlanoLinhas ?? 0} linhas de plano`} variant="outlined" />


            <Chip size="small" label={`${dryResult.counts.itens} itens`} variant="outlined" />

            <Chip

              size="small"

              label={dryResult.canApply ? 'Pode gravar' : 'Bloqueado por erros'}

              color={dryResult.canApply ? 'success' : 'error'}

            />

          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>

            Se gravar: grupos +{dryResult.statsIfApplied.grupos.create}/~{dryResult.statsIfApplied.grupos.update} atual.,

            estipulantes +{dryResult.statsIfApplied.estipulantes.create}/~{dryResult.statsIfApplied.estipulantes.update},{' '}

            apólices +{dryResult.statsIfApplied.apolices.create}/~{dryResult.statsIfApplied.apolices.update}, linhas de plano{' '}

            {dryResult.statsIfApplied.apolicePlanoLinhas?.rows ?? 0}, itens +

            {dryResult.statsIfApplied.itens.create}/~{dryResult.statsIfApplied.itens.update}.

          </Typography>



          {dryResult.issues.length === 0 ? (

            <Alert severity="success">Nenhum problema detetado neste ficheiro.</Alert>

          ) : (

            <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>

              {dryResult.issues.map((iss, i) => (

                <ListItem key={i} sx={{ py: 0.5, alignItems: 'flex-start' }}>

                  <ListItemText

                    primary={

                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>

                        <Chip size="small" label={iss.severity === 'error' ? 'Erro' : 'Aviso'} color={iss.severity === 'error' ? 'error' : 'warning'} />

                        <Typography component="span" variant="body2" fontWeight={600}>

                          {iss.code}

                        </Typography>

                      </Box>

                    }

                    secondary={

                      <>

                        {iss.message}

                        {iss.path ? (

                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>

                            Onde: {iss.path}

                          </Typography>

                        ) : null}

                        {iss.ids?.length ? (

                          <Typography variant="caption" display="block">

                            IDs: {iss.ids.join(', ')}

                          </Typography>

                        ) : null}

                      </>

                    }

                  />

                </ListItem>

              ))}

            </List>

          )}

        </>

      ) : null}



      {applyResult ? (

        <>

          <Divider sx={{ my: 2 }} />

          <Alert severity="success" sx={{ mb: 1 }}>

            Importação concluída. Grupos: +{applyResult.applied.grupos.create} / atual. {applyResult.applied.grupos.update},{' '}

            estipulantes: +{applyResult.applied.estipulantes.create} / atual. {applyResult.applied.estipulantes.update},{' '}

            apólices: +{applyResult.applied.apolices.create} / atual. {applyResult.applied.apolices.update},{' '}

            linhas de plano gravadas: {applyResult.applied.apolicePlanoLinhas?.rows ?? 0},{' '}

            itens: +{applyResult.applied.itens.create} / atual. {applyResult.applied.itens.update}.

          </Alert>

          {applyResult.warnings.length > 0 ? (

            <Alert severity="warning">

              {applyResult.warnings.length} aviso(s) mantidos do relatório de simulação (não impedem gravação). Reveja a lista acima se precisar

              corrigir dados.

            </Alert>

          ) : null}

        </>

      ) : null}

    </Paper>

  )

}

