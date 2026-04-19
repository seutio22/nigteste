import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'

type Estipulante = { id: string; razaoSocial: string }
type ApoliceLista = {
  id: string
  numeroApolice: string
  produto: string
  estipulante: {
    razaoSocial: string
    grupoEconomicoNome: string
    grupo?: { nome: string } | null
  }
}

export type SeguroContextValue = {
  /** Nome do grupo econômico (Nexus), igual ao usado em Cadastros › Apólice. */
  grupoEconomicoNome: string
  estipulanteId: string
  apoliceId: string
  /** Texto legível para triagem */
  resumo: string
}

type Props = {
  disabled?: boolean
  value?: SeguroContextValue | null
  onChange: (next: SeguroContextValue | null) => void
}

const PROD: Record<string, string> = {
  SAUDE: 'Saúde',
  ODONTO: 'Odonto',
  VIDA_GRUPO: 'Vida em grupo',
  OUTROS: 'Outros',
}

export default function SeguroContextSelector({ disabled, value, onChange }: Props) {
  const [grupoNomes, setGrupoNomes] = useState<string[]>([])
  const [estRows, setEstRows] = useState<Estipulante[]>([])
  const [apRows, setApRows] = useState<ApoliceLista[]>([])

  const [gNome, setGNome] = useState(value?.grupoEconomicoNome ?? '')
  const [eId, setEId] = useState(value?.estipulanteId ?? '')
  const [aId, setAId] = useState(value?.apoliceId ?? '')

  const loadGrupoNomes = useCallback(async () => {
    const r = await api<{ nomes?: string[] }>('/seguros/nexus/grupos-economicos-nomes')
    if (r.ok) setGrupoNomes(r.data?.nomes ?? [])
  }, [])

  useEffect(() => {
    void loadGrupoNomes()
  }, [loadGrupoNomes])

  const loadEst = useCallback(async (grupoNome: string) => {
    if (!grupoNome) {
      setEstRows([])
      return
    }
    const r = await api<{ estipulantes: Estipulante[] }>(
      `/seguros/estipulantes?grupoNome=${encodeURIComponent(grupoNome)}`,
    )
    if (r.ok) setEstRows(r.data?.estipulantes ?? [])
  }, [])

  const loadAp = useCallback(async (estipulanteId: string, grupoNome: string) => {
    if (!estipulanteId) {
      setApRows([])
      return
    }
    const gq = grupoNome.trim() ? `&grupoNome=${encodeURIComponent(grupoNome.trim())}` : ''
    const r = await api<{ apolices: ApoliceLista[] }>(
      `/seguros/apolices/lista?estipulanteId=${encodeURIComponent(estipulanteId)}${gq}`,
    )
    if (r.ok) setApRows(r.data?.apolices ?? [])
  }, [])

  useEffect(() => {
    void loadEst(gNome)
  }, [gNome, loadEst])

  useEffect(() => {
    void loadAp(eId, gNome)
  }, [eId, gNome, loadAp])

  function emit(nextG: string, nextE: string, nextA: string) {
    if (!nextG || !nextE || !nextA) {
      onChange(null)
      return
    }
    const e = estRows.find((x) => x.id === nextE)
    const a = apRows.find((x) => x.id === nextA)
    if (!e || !a) {
      onChange(null)
      return
    }
    const gLabel = a.estipulante.grupoEconomicoNome || a.estipulante.grupo?.nome || nextG
    const resumo = `${gLabel} · ${e.razaoSocial} · Ap. ${a.numeroApolice} (${PROD[a.produto] ?? a.produto})`
    onChange({
      grupoEconomicoNome: nextG,
      estipulanteId: nextE,
      apoliceId: nextA,
      resumo,
    })
  }

  function onGrupo(ev: SelectChangeEvent) {
    const v = ev.target.value
    setGNome(v)
    setEId('')
    setAId('')
    emit(v, '', '')
  }

  function onEst(ev: SelectChangeEvent) {
    const v = ev.target.value
    setEId(v)
    setAId('')
    emit(gNome, v, '')
  }

  function onAp(ev: SelectChangeEvent) {
    const v = ev.target.value
    setAId(v)
    emit(gNome, eId, v)
  }

  function clear() {
    setGNome('')
    setEId('')
    setAId('')
    setEstRows([])
    setApRows([])
    onChange(null)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Vincular à base de seguros (apólice)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Opcional: escolha o <strong>grupo econômico (Nexus)</strong>, o <strong>estipulante</strong> e a <strong>apólice</strong> cadastrados na
        página Apólice. Isto fica gravado na solicitação para triagem.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel>Grupo econômico (Nexus)</InputLabel>
          <Select label="Grupo econômico (Nexus)" value={gNome} onChange={onGrupo}>
            <MenuItem value="">
              <em>Não vincular</em>
            </MenuItem>
            {grupoNomes.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={disabled || !gNome}>
          <InputLabel>Estipulante</InputLabel>
          <Select label="Estipulante" value={eId} onChange={onEst}>
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {estRows.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.razaoSocial}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={disabled || !eId}>
          <InputLabel>Apólice</InputLabel>
          <Select label="Apólice" value={aId} onChange={onAp}>
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {apRows.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.numeroApolice} — {PROD[a.produto] ?? a.produto}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {value?.resumo ? (
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          <strong>Seleção:</strong> {value.resumo}
        </Typography>
      ) : null}
      <Divider sx={{ my: 1.5 }} />
      <Typography
        component="button"
        type="button"
        variant="caption"
        onClick={() => !disabled && clear()}
        sx={{
          border: 'none',
          background: 'none',
          cursor: disabled ? 'default' : 'pointer',
          color: 'primary.main',
          textDecoration: 'underline',
          p: 0,
        }}
        disabled={disabled}
      >
        Limpar vínculo
      </Typography>
    </Paper>
  )
}
