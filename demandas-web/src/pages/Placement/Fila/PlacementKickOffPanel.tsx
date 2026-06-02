import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FlagIcon from '@mui/icons-material/Flag'
import SummarizeIcon from '@mui/icons-material/Summarize'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import { api } from '../../../lib/api.local'
import type { CotacaoFormState } from './CotacaoFormFields'
import { KickOffAberturaResumoSection } from './KickOffAberturaResumoSection'
import { buildAberturaResumoLinhas } from './placementKickOffAberturaResumo'
import {
  buildDefaultKickOffEstrategia,
  buildKickOffEstrategiaPendencias,
  createKickOffItem,
  createKickOffSecao,
  ensureKickOffEstrategia,
  isKickOffItemObrigatorio,
  parseKickOffEstrategiaFromApi,
  type KickOffEstrategia,
  type KickOffEstrategiaItem,
  type KickOffEstrategiaSecao,
} from './placementKickOffEstrategia'
import { normalizeMercadoAnalisadoNomes, resolveKickOffAberturaLabels, resolveOperadoraNome } from './placementKickOffFormatters'

type Props = {
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  cotacaoId?: string
  analistaCadastroNome?: string
  analistaResponsavelNome?: string
  disabled?: boolean
}

export function PlacementKickOffPanel({
  form,
  onChange,
  cotacaoId,
  analistaCadastroNome,
  analistaResponsavelNome,
  disabled,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)
  const condicoes = usePlacementStore((s) => s.condicoes)
  const prospects = usePlacementStore((s) => s.prospects)
  const filiais = usePlacementStore((s) => s.filiais)
  const tiposContratacao = usePlacementStore((s) => s.tiposContratacao)
  const modalidadesContrato = usePlacementStore((s) => s.modalidadesContrato)
  const prazosVigenciaContrato = usePlacementStore((s) => s.prazosVigenciaContrato)
  const projetos = usePlacementStore((s) => s.projetos)
  const pedidos = usePlacementStore((s) => s.pedidos)
  const temperaturas = usePlacementStore((s) => s.temperaturas)

  const corretores = usePlacementStore((s) => s.corretoresParceiros)

  const placementSlice = useMemo(
    () => ({
      condicoes,
      prospects,
      filiais,
      tiposContratacao,
      modalidadesContrato,
      prazosVigenciaContrato,
      projetos,
      pedidos,
      temperaturas,
    }),
    [
      condicoes,
      prospects,
      filiais,
      tiposContratacao,
      modalidadesContrato,
      prazosVigenciaContrato,
      projetos,
      pedidos,
      temperaturas,
    ]
  )

  const corretorNome = useMemo(
    () => corretores.find((c) => c.id === form.corretorParceiroId)?.nome,
    [corretores, form.corretorParceiroId]
  )

  useEffect(() => {
    syncMasterData?.({ force: false, entities: ['operadoras'] })
  }, [syncMasterData])

  const labels = useMemo(
    () =>
      resolveKickOffAberturaLabels(form, operadoras, placementSlice, {
        analistaCadastroNome,
        analistaResponsavelNome,
        corretorNome,
      }),
    [form, operadoras, placementSlice, analistaCadastroNome, analistaResponsavelNome, corretorNome]
  )

  const [subfaturas, setSubfaturas] = useState<
    { razaoSocial: string; cnpj: string; vidas?: number | null; cidade?: string | null; uf?: string | null }[]
  >([])

  useEffect(() => {
    if (!cotacaoId) return
    let cancelled = false
    api
      .get(`/placement/cotacoes/${cotacaoId}/subfaturas`)
      .then((data: any) => {
        if (cancelled) return
        const list = Array.isArray(data?.subfaturas) ? data.subfaturas : []
        setSubfaturas(list)
      })
      .catch(() => {
        if (!cancelled) setSubfaturas([])
      })
    return () => {
      cancelled = true
    }
  }, [cotacaoId])

  const resumoLinhas = useMemo(
    () =>
      buildAberturaResumoLinhas({ form, labels, operadoras, operadorasById, subfaturas }),
    [form, labels, operadoras, operadorasById, subfaturas]
  )

  const estrategia = useMemo(
    () =>
      ensureKickOffEstrategia(form, form.kickOffEstrategia, labels, operadoras, operadorasById),
    [form, labels, operadoras, operadorasById]
  )

  const pendencias = useMemo(
    () => buildKickOffEstrategiaPendencias(estrategia),
    [estrategia]
  )
  const pendenciasAbertas = pendencias.filter((p) => !p.done)

  const [novoMercado, setNovoMercado] = useState('')

  useEffect(() => {
    if (disabled) return
    const parsed = parseKickOffEstrategiaFromApi(form.kickOffEstrategia)
    if (parsed.secoes.length > 0 || parsed.mercadoAnalisado.length > 0) {
      if (!operadoras.length && !Object.keys(operadorasById).length) return
      const normalized = normalizeMercadoAnalisadoNomes(
        parsed.mercadoAnalisado,
        operadoras,
        operadorasById
      )
      if (normalized.join('\u0001') !== parsed.mercadoAnalisado.join('\u0001')) {
        onChange({
          ...form,
          kickOffEstrategia: { ...parsed, mercadoAnalisado: normalized },
        })
      }
      return
    }
    onChange({ ...form, kickOffEstrategia: buildDefaultKickOffEstrategia(form, labels, operadoras, operadorasById) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.kickOffEstrategia, form.ticket, disabled, labels, operadoras, operadorasById])

  function patchEstrategia(next: KickOffEstrategia) {
    onChange({ ...form, kickOffEstrategia: next })
  }

  function updateSecao(secaoId: string, patch: Partial<KickOffEstrategiaSecao>) {
    patchEstrategia({
      ...estrategia,
      secoes: estrategia.secoes.map((s) => (s.id === secaoId ? { ...s, ...patch } : s)),
    })
  }

  function updateItem(secaoId: string, itemId: string, patch: Partial<KickOffEstrategiaItem>) {
    patchEstrategia({
      ...estrategia,
      secoes: estrategia.secoes.map((s) =>
        s.id !== secaoId
          ? s
          : {
              ...s,
              itens: s.itens.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
            }
      ),
    })
  }

  function addItem(secaoId: string) {
    updateSecao(secaoId, {
      itens: [
        ...(estrategia.secoes.find((s) => s.id === secaoId)?.itens ?? []),
        createKickOffItem(),
      ],
    })
  }

  function removeItem(secaoId: string, itemId: string) {
    const sec = estrategia.secoes.find((s) => s.id === secaoId)
    if (!sec || sec.itens.length <= 1) return
    updateSecao(secaoId, { itens: sec.itens.filter((i) => i.id !== itemId) })
  }

  function addSecao() {
    patchEstrategia({
      ...estrategia,
      secoes: [...estrategia.secoes, createKickOffSecao('Nova seção', [createKickOffItem()])],
    })
  }

  function removeSecao(secaoId: string) {
    if (estrategia.secoes.length <= 1) return
    patchEstrategia({
      ...estrategia,
      secoes: estrategia.secoes.filter((s) => s.id !== secaoId),
    })
  }

  function addMercado(nome: string) {
    const v = normalizeMercadoAnalisadoNomes([nome], operadoras, operadorasById)[0] ?? nome.trim()
    if (!v || estrategia.mercadoAnalisado.includes(v)) return
    patchEstrategia({
      ...estrategia,
      mercadoAnalisado: [...estrategia.mercadoAnalisado, v],
    })
  }

  function removeMercado(nomeExibido: string) {
    patchEstrategia({
      ...estrategia,
      mercadoAnalisado: estrategia.mercadoAnalisado.filter(
        (m) => resolveOperadoraNome(m, operadoras, operadorasById) !== nomeExibido
      ),
    })
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info" icon={<FlagIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Kick off — alinhamento de estratégia
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Revise o resumo completo da abertura e preencha a estratégia. Os rótulos são referência;
          o conteúdo é livre, salvo os campos já trazidos do formulário de entrada.
        </Typography>
      </Alert>

      {pendenciasAbertas.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Pontos de ajuste — estratégia
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Campos com * são obrigatórios para avançar para Em cotação.
          </Typography>
          <List dense disablePadding>
            {pendencias.map((item) => (
              <ListItem key={item.id} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {item.done ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon color="warning" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: item.done ? 'text.primary' : 'warning.dark',
                    fontWeight: item.done ? 400 : 600,
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <SummarizeIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Resumo da abertura
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Todos os dados informados na abertura. Oculte ou exiba cada item e exporte em PDF quando
          precisar compartilhar.
        </Typography>
        <KickOffAberturaResumoSection
          ticket={form.ticket}
          linhas={resumoLinhas}
          estrategia={estrategia}
          disabled={disabled}
          temperaturaId={form.temperaturaId}
          temperaturas={temperaturas}
          onTemperaturaChange={(temperaturaId) => onChange({ ...form, temperaturaId })}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Estratégia da cotação
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addSecao} disabled={disabled}>
            Nova seção
          </Button>
        </Stack>

        {estrategia.secoes.map((secao, secIdx) => (
          <Box key={secao.id} sx={{ mb: secIdx < estrategia.secoes.length - 1 ? 3 : 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                label="Título da seção"
                value={secao.titulo}
                onChange={(e) => updateSecao(secao.id, { titulo: e.target.value })}
                disabled={disabled}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => removeSecao(secao.id)}
                disabled={disabled || estrategia.secoes.length <= 1}
                aria-label="Remover seção"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack spacing={1.5}>
              {secao.itens.map((item) => {
                const obrigatorio = isKickOffItemObrigatorio(secao, item)
                const vazioObrigatorio = obrigatorio && !item.valor.trim()
                return (
                <Grid container spacing={1} key={item.id} alignItems="flex-start">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Rótulo (opcional)"
                      value={item.rotulo}
                      onChange={(e) => updateItem(secao.id, item.id, { rotulo: e.target.value })}
                      disabled={disabled}
                      placeholder="Ex.: Tipo de contratação"
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={1}
                      label={obrigatorio ? 'Conteúdo *' : 'Conteúdo'}
                      value={item.valor}
                      onChange={(e) => updateItem(secao.id, item.id, { valor: e.target.value })}
                      disabled={disabled}
                      required={obrigatorio}
                      error={vazioObrigatorio}
                      helperText={vazioObrigatorio ? 'Preenchimento obrigatório' : undefined}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(secao.id, item.id)}
                      disabled={disabled || secao.itens.length <= 1}
                      aria-label="Remover item"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              )})}
            </Stack>

            <Button
              size="small"
              startIcon={<AddIcon />}
              sx={{ mt: 1 }}
              onClick={() => addItem(secao.id)}
              disabled={disabled}
            >
              Incluir fato
            </Button>
            {secIdx < estrategia.secoes.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Mercado analisado *
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Preenchido com os fornecedores sugeridos na abertura; ajuste se necessário.
        </Typography>
        {estrategia.mercadoAnalisado.length === 0 && (
          <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
            Informe ao menos uma operadora (obrigatório).
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {normalizeMercadoAnalisadoNomes(estrategia.mercadoAnalisado, operadoras, operadorasById).map(
            (nome) => (
            <Chip
              key={nome}
              label={nome}
              onDelete={disabled ? undefined : () => removeMercado(nome)}
              size="small"
            />
          ))}
          {!estrategia.mercadoAnalisado.length && (
            <Typography variant="body2" color="text.secondary">
              Informe ao menos uma operadora.
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Adicionar operadora"
            value={novoMercado}
            onChange={(e) => setNovoMercado(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMercado(novoMercado)
                setNovoMercado('')
              }
            }}
            disabled={disabled}
            sx={{ maxWidth: 280 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              addMercado(novoMercado)
              setNovoMercado('')
            }}
            disabled={disabled || !novoMercado.trim()}
          >
            Incluir
          </Button>
        </Stack>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Notas complementares (opcional)"
          value={estrategia.notas ?? ''}
          onChange={(e) => patchEstrategia({ ...estrategia, notas: e.target.value })}
          disabled={disabled}
          sx={{ mt: 2 }}
        />
      </Paper>
    </Stack>
  )
}
