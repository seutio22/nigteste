import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Collapse,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import type { AberturaResumoLinha } from './placementKickOffAberturaResumo'
import {
  groupAberturaResumoLinhas,
  resumoLinhaEditavel,
  resumoLinhaIsWide,
} from './placementKickOffAberturaResumo'
import { exportKickOffResumoPdf } from './placementKickOffResumoPdf'
import type { KickOffEstrategia } from './placementKickOffEstrategia'

type Props = {
  ticket: string
  linhas: AberturaResumoLinha[]
  estrategia?: KickOffEstrategia | null
  disabled?: boolean
  temperaturaId?: string
  temperaturas?: { id: string; nome: string }[]
  onTemperaturaChange?: (temperaturaId: string) => void
}

export function KickOffAberturaResumoSection({
  ticket,
  linhas,
  estrategia,
  disabled,
  temperaturaId,
  temperaturas = [],
  onTemperaturaChange,
}: Props) {
  const [ocultos, setOcultos] = useState<Set<string>>(() => new Set())
  const [gruposRecolhidos, setGruposRecolhidos] = useState<Set<string>>(() => new Set())
  const [textosExpandidos, setTextosExpandidos] = useState<Set<string>>(() => new Set())
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [rascunhoTemperaturaId, setRascunhoTemperaturaId] = useState('')

  const grupos = useMemo(() => groupAberturaResumoLinhas(linhas), [linhas])
  const visiveisCount = linhas.filter((l) => !ocultos.has(l.id)).length

  function toggleOculto(id: string) {
    setOcultos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function mostrarTodos() {
    setOcultos(new Set())
  }

  function ocultarVazios() {
    setOcultos(new Set(linhas.filter((l) => l.vazio).map((l) => l.id)))
  }

  function expandirTodos() {
    setGruposRecolhidos(new Set())
  }

  function recolherTodos() {
    setGruposRecolhidos(new Set(grupos.map((g) => g.titulo)))
  }

  function toggleGrupo(titulo: string) {
    setGruposRecolhidos((prev) => {
      const next = new Set(prev)
      if (next.has(titulo)) next.delete(titulo)
      else next.add(titulo)
      return next
    })
  }

  function toggleTextoExpandido(id: string) {
    setTextosExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function iniciarEdicao(linha: AberturaResumoLinha) {
    if (disabled || !resumoLinhaEditavel(linha)) return
    setEditandoId(linha.id)
    setRascunhoTemperaturaId(temperaturaId ?? '')
  }

  function salvarEdicao() {
    onTemperaturaChange?.(rascunhoTemperaturaId)
    setEditandoId(null)
    setRascunhoTemperaturaId('')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setRascunhoTemperaturaId('')
  }

  function exportarPdf() {
    exportKickOffResumoPdf({ ticket, linhas, estrategia })
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Chip size="small" label={`${visiveisCount}/${linhas.length} visíveis`} variant="outlined" />
          <Typography variant="caption" color="text.secondary">
            Apenas <strong>Temperatura</strong> pode ser editada aqui. Expandir/recolher alterna os
            blocos do resumo. O PDF inclui todos os dados e a estratégia.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
          <ButtonGroup size="small" variant="outlined">
            <Button onClick={mostrarTodos}>Mostrar todos</Button>
            <Button onClick={ocultarVazios}>Ocultar vazios</Button>
          </ButtonGroup>
          <ButtonGroup size="small" variant="outlined">
            <Button startIcon={<UnfoldMoreIcon />} onClick={expandirTodos}>
              Expandir blocos
            </Button>
            <Button startIcon={<UnfoldLessIcon />} onClick={recolherTodos}>
              Recolher blocos
            </Button>
          </ButtonGroup>
          <Button
            size="small"
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={exportarPdf}
          >
            PDF completo
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {grupos.map((grupo) => {
          const recolhido = gruposRecolhidos.has(grupo.titulo)
          const linhasVisiveisGrupo = grupo.linhas.filter((l) => !ocultos.has(l.id))

          return (
            <Box
              key={grupo.titulo}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: 'grey.50',
                  borderBottom: recolhido ? 0 : 1,
                  borderColor: 'divider',
                  borderLeft: 4,
                  borderLeftColor: 'primary.main',
                  cursor: 'pointer',
                }}
                onClick={() => toggleGrupo(grupo.titulo)}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {grupo.titulo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {linhasVisiveisGrupo.length} de {grupo.linhas.length} campo
                    {grupo.linhas.length !== 1 ? 's' : ''} visíveis
                    {grupo.titulo === 'Identificação'
                      ? ' · somente Temperatura editável'
                      : ''}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={recolhido ? 'Expandir bloco' : 'Recolher bloco'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleGrupo(grupo.titulo)
                  }}
                >
                  {recolhido ? <UnfoldMoreIcon fontSize="small" /> : <UnfoldLessIcon fontSize="small" />}
                </IconButton>
              </Stack>

              <Collapse in={!recolhido}>
                <Box sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    {grupo.linhas.map((linha) => (
                      <ResumoCampoCard
                        key={linha.id}
                        linha={linha}
                        oculta={ocultos.has(linha.id)}
                        expandido={textosExpandidos.has(linha.id)}
                        editando={editandoId === linha.id}
                        editavel={resumoLinhaEditavel(linha) && !disabled}
                        rascunhoTemperaturaId={rascunhoTemperaturaId}
                        temperaturas={temperaturas}
                        onToggleOculto={() => toggleOculto(linha.id)}
                        onToggleExpandido={() => toggleTextoExpandido(linha.id)}
                        onIniciarEdicao={() => iniciarEdicao(linha)}
                        onSalvarEdicao={salvarEdicao}
                        onCancelarEdicao={cancelarEdicao}
                        onRascunhoTemperaturaChange={setRascunhoTemperaturaId}
                      />
                    ))}
                  </Grid>
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function ResumoCampoCard({
  linha,
  oculta,
  expandido,
  editando,
  editavel,
  rascunhoTemperaturaId,
  temperaturas,
  onToggleOculto,
  onToggleExpandido,
  onIniciarEdicao,
  onSalvarEdicao,
  onCancelarEdicao,
  onRascunhoTemperaturaChange,
}: {
  linha: AberturaResumoLinha
  oculta: boolean
  expandido: boolean
  editando: boolean
  editavel: boolean
  rascunhoTemperaturaId: string
  temperaturas: { id: string; nome: string }[]
  onToggleOculto: () => void
  onToggleExpandido: () => void
  onIniciarEdicao: () => void
  onSalvarEdicao: () => void
  onCancelarEdicao: () => void
  onRascunhoTemperaturaChange: (id: string) => void
}) {
  const valorExibido = linha.valor
  const wide = resumoLinhaIsWide(linha, valorExibido)
  const longo = valorExibido.length > 120 || valorExibido.includes('\n')
  const vazio = linha.vazio || valorExibido === '—'

  if (oculta) {
    return (
      <Grid item xs={12} sm={6} lg={4}>
        <Box
          sx={{
            height: '100%',
            minHeight: 52,
            px: 1.25,
            py: 1,
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.disabled" noWrap sx={{ flex: 1 }}>
            {linha.rotulo} — oculto
          </Typography>
          <Tooltip title="Exibir item">
            <IconButton size="small" onClick={onToggleOculto}>
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Grid>
    )
  }

  return (
    <Grid item xs={12} sm={wide ? 12 : 6} lg={wide ? 12 : 4}>
      <Box
        sx={{
          height: '100%',
          p: 1.25,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:hover': {
            borderColor: 'primary.light',
            boxShadow: 1,
            '& .resumo-campo-acoes': { opacity: 1 },
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.5}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, letterSpacing: 0.2 }}
              >
                {linha.rotulo}
              </Typography>
              {vazio && (
                <Chip label="Vazio" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              )}
            </Stack>
          </Box>

          <Stack
            className="resumo-campo-acoes"
            direction="row"
            spacing={0}
            sx={{ opacity: { xs: 1, sm: 0.45 }, flexShrink: 0, ml: 0.5 }}
          >
            {!editando && (
              <>
                <Tooltip title="Ocultar item">
                  <IconButton size="small" onClick={onToggleOculto}>
                    <VisibilityIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                {editavel && (
                  <Tooltip title="Editar temperatura">
                    <IconButton size="small" onClick={onIniciarEdicao}>
                      <EditOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </Stack>

        <Box sx={{ mt: 0.75 }}>
          {editando ? (
            <Stack spacing={0.75}>
              <TextField
                select
                size="small"
                fullWidth
                label="Temperatura *"
                value={rascunhoTemperaturaId}
                onChange={(e) => onRascunhoTemperaturaChange(e.target.value)}
                autoFocus
              >
                <MenuItem value="">
                  <em>Selecione</em>
                </MenuItem>
                {temperaturas.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nome}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={0.5}>
                <Button size="small" variant="contained" startIcon={<CheckIcon />} onClick={onSalvarEdicao}>
                  Salvar
                </Button>
                <Button size="small" startIcon={<CloseIcon />} onClick={onCancelarEdicao}>
                  Cancelar
                </Button>
              </Stack>
            </Stack>
          ) : longo && !expandido ? (
            <>
              <Typography variant="body2" color={vazio ? 'text.disabled' : 'text.primary'} noWrap>
                {valorExibido.replace(/\n/g, ' · ')}
              </Typography>
              <Button size="small" sx={{ p: 0, minWidth: 0, mt: 0.25 }} onClick={onToggleExpandido}>
                Ver completo
              </Button>
            </>
          ) : (
            <>
              <Typography
                variant="body2"
                color={vazio ? 'text.disabled' : 'text.primary'}
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontStyle: vazio ? 'italic' : 'normal',
                }}
              >
                {valorExibido}
              </Typography>
              {longo && expandido && (
                <Button size="small" sx={{ p: 0, minWidth: 0, mt: 0.25 }} onClick={onToggleExpandido}>
                  Recolher texto
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
    </Grid>
  )
}
