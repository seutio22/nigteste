import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import SummarizeIcon from '@mui/icons-material/Summarize'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import { api } from '../../../lib/api.local'
import type { CotacaoFormState } from './CotacaoFormFields'
import { KickOffAberturaResumoSection } from './KickOffAberturaResumoSection'
import { buildAberturaResumoLinhas } from './placementKickOffAberturaResumo'
import { ensureKickOffEstrategia } from './placementKickOffEstrategia'
import { resolveKickOffAberturaLabels } from './placementKickOffFormatters'

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

  return (
    <Stack spacing={2}>
      <Alert severity="info" icon={<GroupsIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Kick off — reunião de alinhamento
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Apresente o resumo da abertura e a análise da base ao cliente/equipe. Use o botão
          «Apresentação» para o painel unificado com inconsistências. A formalização da estratégia
          ocorre na próxima etapa.
        </Typography>
      </Alert>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <SummarizeIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Resumo da abertura
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Dados da abertura para conduzir a reunião. Oculte itens conforme necessário e exporte em
          PDF ou abra a apresentação analítica da base.
        </Typography>
        <KickOffAberturaResumoSection
          ticket={form.ticket}
          linhas={resumoLinhas}
          estrategia={estrategia}
          disabled={disabled}
          cotacaoId={cotacaoId}
          form={form}
          temperaturaId={form.temperaturaId}
          temperaturas={temperaturas}
          onTemperaturaChange={(temperaturaId) => onChange({ ...form, temperaturaId })}
        />
      </Paper>
    </Stack>
  )
}
