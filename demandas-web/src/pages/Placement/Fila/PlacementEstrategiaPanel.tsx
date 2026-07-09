import React, { useEffect, useMemo, useState } from 'react'

import {

  Alert,

  Box,

  Button,

  Chip,

  Divider,

  IconButton,

  List,

  ListItem,

  ListItemIcon,

  ListItemText,

  Menu,

  MenuItem,

  Paper,

  Stack,

  TextField,

  Typography,

} from '@mui/material'

import AddIcon from '@mui/icons-material/Add'

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

import FlagIcon from '@mui/icons-material/Flag'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'

import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

import { useMasterDataStore } from '../../../store/masterDataStore'

import { usePlacementStore } from '../../../store/placementStore'

import { api } from '../../../lib/api.local'

import type { CotacaoFormState } from './CotacaoFormFields'

import {

  buildDefaultKickOffEstrategia,

  buildKickOffEstrategiaPendencias,

  createKickOffItem,

  createKickOffSecao,

  ensureKickOffEstrategia,

  parseKickOffEstrategiaFromApi,

  type KickOffEstrategia,

  type KickOffEstrategiaItem,

  type KickOffEstrategiaSecao,

} from './placementKickOffEstrategia'

import {

  normalizeMercadoAnalisadoNomes,

  resolveKickOffAberturaLabels,

  resolveOperadoraNome,

} from './placementKickOffFormatters'

import { buildAberturaResumoLinhas } from './placementKickOffAberturaResumo'

import { PlacementEstrategiaItemRow } from './PlacementEstrategiaItemRow'

import { PlacementEstrategiaInserirAbertura } from './PlacementEstrategiaInserirAbertura'

import {

  duplicateEstrategiaItem,

  moveEstrategiaItem,

} from './placementEstrategiaEditor'



const MODELOS_RAPIDOS: { rotulo: string; valor: string }[] = [

  { rotulo: 'Cenários', valor: '• Cenário 1:\n• Cenário 2:' },

  { rotulo: 'Restrição comercial', valor: '' },

  { rotulo: 'Prazo / SLA acordado', valor: '' },

  { rotulo: 'Observação da reunião', valor: '' },

  { rotulo: 'Riscos e premissas', valor: '• \n• ' },

]



type Props = {

  form: CotacaoFormState

  onChange: (next: CotacaoFormState) => void

  cotacaoId?: string

  disabled?: boolean

}



export function PlacementEstrategiaPanel({ form, onChange, cotacaoId, disabled }: Props) {

  const operadoras = useMasterDataStore((s) => s.operadoras)

  const operadorasById = useMasterDataStore((s) => s.operadorasById)

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



  const labels = useMemo(

    () =>

      resolveKickOffAberturaLabels(form, operadoras, placementSlice, {

        corretorNome,

      }),

    [form, operadoras, placementSlice, corretorNome]

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



  const aberturaLinhas = useMemo(

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

  const [modeloAnchor, setModeloAnchor] = useState<HTMLElement | null>(null)

  const [modeloSecaoId, setModeloSecaoId] = useState<string | null>(null)



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



  function appendItem(secaoId: string, item: KickOffEstrategiaItem) {

    updateSecao(secaoId, {

      itens: [...(estrategia.secoes.find((s) => s.id === secaoId)?.itens ?? []), item],

    })

  }



  function addItem(secaoId: string) {

    appendItem(secaoId, createKickOffItem())

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



  function openModelosMenu(secaoId: string, anchor: HTMLElement) {

    setModeloSecaoId(secaoId)

    setModeloAnchor(anchor)

  }



  return (

    <Stack spacing={2}>

      <Alert severity="info" icon={<FlagIcon />}>

        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>

          Estratégia — formalização

        </Typography>

        <Typography variant="body2" sx={{ mt: 0.5 }}>

          Registre a estratégia acordada na reunião de kick off. Rótulos e conteúdos aceitam várias

          linhas; use as ferramentas para listas, reordenar fatos e inserir dados da abertura.

        </Typography>

      </Alert>



      {pendenciasAbertas.length > 0 && (

        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ py: 0.75 }}>

          <Typography variant="body2">

            {pendenciasAbertas.length} campo(s) obrigatório(s) pendente(s). Veja o resumo na barra fixa no topo da página.

          </Typography>

        </Alert>

      )}



      <Paper variant="outlined" sx={{ p: 2 }}>

        <Stack

          direction="row"

          alignItems="center"

          justifyContent="space-between"

          spacing={1}

          flexWrap="wrap"

          useFlexGap

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

            <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>

              <TextField

                size="small"

                fullWidth

                multiline

                minRows={1}

                maxRows={4}

                label="Título da seção"

                value={secao.titulo}

                onChange={(e) => updateSecao(secao.id, { titulo: e.target.value })}

                disabled={disabled}

                helperText="Título pode ter mais de uma linha"

              />

              <IconButton

                size="small"

                color="error"

                onClick={() => removeSecao(secao.id)}

                disabled={disabled || estrategia.secoes.length <= 1}

                aria-label="Remover seção"

                sx={{ mt: 0.5 }}

              >

                <DeleteOutlineIcon fontSize="small" />

              </IconButton>

            </Stack>



            <Stack spacing={1.5}>

              {secao.itens.map((item, itemIdx) => (

                <PlacementEstrategiaItemRow

                  key={item.id}

                  secao={secao}

                  item={item}

                  itemIndex={itemIdx}

                  itemCount={secao.itens.length}

                  aberturaLinhas={aberturaLinhas}

                  disabled={disabled}

                  onPatch={(patch) => updateItem(secao.id, item.id, patch)}

                  onRemove={() => removeItem(secao.id, item.id)}

                  onDuplicate={() =>

                    updateSecao(secao.id, {

                      itens: duplicateEstrategiaItem(secao.itens, item.id),

                    })

                  }

                  onMove={(dir) =>

                    updateSecao(secao.id, {

                      itens: moveEstrategiaItem(secao.itens, item.id, dir),

                    })

                  }

                  onReplaceFromAbertura={(novo) =>

                    updateItem(secao.id, item.id, { rotulo: novo.rotulo, valor: novo.valor })

                  }

                />

              ))}

            </Stack>



            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>

              <Button

                size="small"

                startIcon={<AddIcon />}

                onClick={() => addItem(secao.id)}

                disabled={disabled}

              >

                Incluir fato

              </Button>

              <PlacementEstrategiaInserirAbertura

                linhas={aberturaLinhas}

                disabled={disabled}

                onInsert={(item) => appendItem(secao.id, item)}

              />

              <Button

                size="small"

                variant="outlined"

                startIcon={<AutoAwesomeIcon />}

                disabled={disabled}

                onClick={(e) => openModelosMenu(secao.id, e.currentTarget)}

              >

                Modelos rápidos

              </Button>

            </Stack>



            {secIdx < estrategia.secoes.length - 1 && <Divider sx={{ mt: 2 }} />}

          </Box>

        ))}



        <Menu

          anchorEl={modeloAnchor}

          open={Boolean(modeloAnchor) && modeloSecaoId != null}

          onClose={() => {

            setModeloAnchor(null)

            setModeloSecaoId(null)

          }}

        >

          {MODELOS_RAPIDOS.map((m) => (

            <MenuItem

              key={m.rotulo}

              onClick={() => {

                if (modeloSecaoId) appendItem(modeloSecaoId, createKickOffItem(m.rotulo, m.valor))

                setModeloAnchor(null)

                setModeloSecaoId(null)

              }}

            >

              <Typography variant="body2">{m.rotulo}</Typography>

            </MenuItem>

          ))}

        </Menu>



        <Divider sx={{ my: 2 }} />



        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>

          Mercado analisado *

        </Typography>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>

          Operadoras definidas na reunião de kick off; ajuste se necessário.

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

            )

          )}

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

          minRows={3}

          maxRows={12}

          label="Notas complementares (opcional)"

          value={estrategia.notas ?? ''}

          onChange={(e) => patchEstrategia({ ...estrategia, notas: e.target.value })}

          disabled={disabled}

          helperText="Parágrafos livres para observações gerais da estratégia"

          sx={{ mt: 2 }}

        />

      </Paper>

    </Stack>

  )

}


