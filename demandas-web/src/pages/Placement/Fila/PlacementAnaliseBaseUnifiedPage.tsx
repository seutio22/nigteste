import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import MaleIcon from '@mui/icons-material/Male'
import FemaleIcon from '@mui/icons-material/Female'
import DescriptionIcon from '@mui/icons-material/Description'
import MapIcon from '@mui/icons-material/Map'
import { api } from '../../../lib/api.local'
import { useMasterDataStore } from '../../../store/masterDataStore'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { computeBeneficiariosResumo } from './placementBeneficiariosResumo'
import { computeLocalidadeResumo } from './placementBeneficiariosLocalidade'
import { computeContratoAtualResumo } from './placementContratoAtual'
import {
  CategoriasStrip,
  FaixasEtariasChart,
  PlanosChart,
  TitularidadeDonut,
} from './BeneficiariosResumoDashboard'
import { BrazilDistributionViz } from './BrazilDistributionViz'
import type { AnaliseBaseSectionKey } from './placementAnaliseBase'

type Props = {
  cotacaoId: string
  disabled?: boolean
  /** Quando definido, exibe apenas uma área (modo por seção). */
  focusSection?: AnaliseBaseSectionKey | null
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: 0.92,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  )
}

function SectionHeading({
  id,
  title,
  subtitle,
}: {
  id: string
  title: string
  subtitle: string
}) {
  return (
    <Box id={id} sx={{ scrollMarginTop: 88, pt: 1, pb: 2 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  )
}

function showSection(focus: AnaliseBaseSectionKey | null | undefined, key: AnaliseBaseSectionKey) {
  return !focus || focus === key
}

export function PlacementAnaliseBaseUnifiedPage({ cotacaoId, disabled, focusSection = null }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [beneficiarios, setBeneficiarios] = useState<PlacementBeneficiario[]>([])

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const [benResp, cotacao] = await Promise.all([
        api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`) as Promise<{
          beneficiarios?: PlacementBeneficiario[]
        }>,
        api.get(`/placement/cotacoes/${cotacaoId}`) as Promise<Record<string, unknown>>,
      ])
      const list = benResp?.beneficiarios ?? []
      if (list.length === 0) {
        setBeneficiarios([])
        setErrorMsg('Importe a base de beneficiários na etapa anterior para visualizar a análise.')
        return
      }
      setBeneficiarios(list)
      void cotacao
    } catch (err: unknown) {
      setBeneficiarios([])
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar análise da base.')
    } finally {
      setLoading(false)
    }
  }, [cotacaoId])

  useEffect(() => {
    void load()
  }, [load])

  const grupo = useMemo(
    () => (beneficiarios.length ? computeBeneficiariosResumo(beneficiarios) : null),
    [beneficiarios],
  )
  const localidade = useMemo(
    () => (beneficiarios.length ? computeLocalidadeResumo(beneficiarios) : null),
    [beneficiarios],
  )
  const [contrato, setContrato] = useState<ReturnType<typeof computeContratoAtualResumo> | null>(null)
  const [contratoMsg, setContratoMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!cotacaoId || beneficiarios.length === 0) {
      setContrato(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const cotacao = (await api.get(`/placement/cotacoes/${cotacaoId}`)) as Record<string, unknown>
        if (cancelled) return
        const opMap = new Map(operadoras.map((o) => [o.id, o.nome]))
        const computed = computeContratoAtualResumo(cotacao, beneficiarios, opMap)
        if (computed.allColunas.length === 0) {
          setContrato(null)
          setContratoMsg(
            'Cadastre os planos do contrato vigente ou importe beneficiários com plano e custo para preencher o comparativo.',
          )
          return
        }
        setContrato(computed)
        setContratoMsg(null)
      } catch {
        if (!cancelled) {
          setContrato(null)
          setContratoMsg('Não foi possível carregar o contrato atual.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cotacaoId, beneficiarios, operadoras])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!grupo || !localidade) {
    return <Alert severity="warning">{errorMsg ?? 'Nenhum beneficiário na base.'}</Alert>
  }

  const maxPyramid = Math.max(...grupo.faixasEtarias.flatMap((f) => [f.masculino, f.feminino, f.semSexo]), 1)
  const topMun = localidade.topMunicipios[0]
  const topUf = localidade.porUf[0]
  const ufsAtivos = localidade.porUf.filter((u) => u.vidas > 0).length
  const showOverview = !focusSection

  return (
    <Box sx={{ opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {showOverview && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard icon={<GroupsIcon />} label="Beneficiários" value={String(grupo.total)} sub="na base importada" />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard
              icon={<MaleIcon />}
              label="Masculino"
              value={`${grupo.pctMasculino}%`}
              sub={`${grupo.sexoM} vidas`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard
              icon={<FemaleIcon />}
              label="Feminino"
              value={`${grupo.pctFeminino}%`}
              sub={`${grupo.sexoF} vidas`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard
              icon={<DescriptionIcon />}
              label="Planos no contrato"
              value={contrato ? String(contrato.allColunas.length) : '—'}
              sub={contrato ? `${contrato.totalVidas} vidas · ${contrato.totalFatura}` : contratoMsg ?? 'sem dados'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard
              icon={<MapIcon />}
              label="Estados"
              value={String(ufsAtivos)}
              sub={topUf ? `líder: ${topUf.uf} (${topUf.vidas})` : undefined}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiCard
              icon={<MapIcon />}
              label="Top município"
              value={topMun ? topMun.municipio.slice(0, 18) : '—'}
              sub={topMun ? `${topMun.uf} · ${topMun.percentual}%` : undefined}
            />
          </Grid>
        </Grid>
      )}

      {showSection(focusSection, 'grupo_elegivel') && (
        <Box sx={{ mb: 4 }}>
          <SectionHeading
            id="analise-grupo_elegivel"
            title="Grupo elegível"
            subtitle="Totais, sexo, faixas etárias, planos e categorias da base importada"
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label={`Média idade: ${grupo.mediaIdade ?? '—'}`} variant="outlined" />
            <Chip label={`Pot. gestacional: ${grupo.potencialGestacional}`} variant="outlined" />
            <Chip label={`59+ anos: ${grupo.acima59}`} variant="outlined" />
            <Chip label={`Titulares: ${grupo.titulares}`} variant="outlined" />
            <Chip label={`Dependentes: ${grupo.dependentes}`} variant="outlined" />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TitularidadeDonut
                titulares={grupo.titulares}
                dependentes={grupo.dependentes}
                agregados={grupo.agregados}
                naoClassificados={grupo.titularidadeNaoClassificada}
                categoriasPorTitularidade={grupo.categoriasPorTitularidade}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', minHeight: 360 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Faixas etárias
                </Typography>
                <FaixasEtariasChart faixas={grupo.faixasEtarias} maxVal={maxPyramid} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', minHeight: 360 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Planos na base
                </Typography>
                {grupo.planos.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sem plano informado
                  </Typography>
                ) : (
                  <PlanosChart planos={grupo.planos} total={grupo.total} />
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <CategoriasStrip categorias={grupo.categorias} />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {showSection(focusSection, 'contrato_atual') && (
        <Box sx={{ mb: 4 }}>
          {!focusSection && <Divider sx={{ mb: 3 }} />}
          <SectionHeading
            id="analise-contrato_atual"
            title="Contrato atual"
            subtitle="Cenário vigente por operadora e plano"
          />
          {!contrato ? (
            <Alert severity="info">{contratoMsg ?? 'Sem dados de contrato.'}</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Operadora</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Plano</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Elegibilidade</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contribuição</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Coparticipação</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Vidas
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Prêmio / vida
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Fatura est.
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contrato.allColunas.map((col) => (
                    <TableRow key={col.id} hover>
                      <TableCell>{col.operadora}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {col.planoLabel}
                        </Typography>
                        {col.acomodacao ? (
                          <Typography variant="caption" color="text.secondary">
                            {col.acomodacao}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{col.elegibilidade}</TableCell>
                      <TableCell>{col.contribuicao}</TableCell>
                      <TableCell>{col.coparticipacao}</TableCell>
                      <TableCell align="right">{col.vidas}</TableCell>
                      <TableCell align="right">{col.premioPerCapita ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {col.faturaEstimada}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'primary.main', '& td': { color: 'primary.contrastText', fontWeight: 800 } }}>
                    <TableCell colSpan={5}>Total</TableCell>
                    <TableCell align="right">{contrato.totalVidas}</TableCell>
                    <TableCell align="right">—</TableCell>
                    <TableCell align="right">{contrato.totalFatura}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {showSection(focusSection, 'localidade') && (
        <Box>
          {!focusSection && <Divider sx={{ mb: 3 }} />}
          <SectionHeading
            id="analise-localidade"
            title="Distribuição por localidade"
            subtitle="Ranking de municípios e concentração por UF"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} lg={5}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', height: '100%' }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Ranking de municípios
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {localidade.operadoraLabel}
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40}>#</TableCell>
                      <TableCell>UF</TableCell>
                      <TableCell>Município</TableCell>
                      <TableCell align="right">Vidas</TableCell>
                      <TableCell width={120}>%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {localidade.topMunicipios.map((row) => (
                      <TableRow key={`${row.uf}-${row.municipio}`} hover>
                        <TableCell>{row.rank}</TableCell>
                        <TableCell>{row.uf}</TableCell>
                        <TableCell>{row.municipio}</TableCell>
                        <TableCell align="right">{row.vidas}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={row.percentual}
                              sx={{ flex: 1, height: 6, borderRadius: 99 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 32 }}>
                              {row.percentual}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        Demais localidades
                      </TableCell>
                      <TableCell align="right">{localidade.demaisLocalidades.vidas}</TableCell>
                      <TableCell>{localidade.demaisLocalidades.percentual}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={7}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minHeight: 480 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Mapa por UF
                </Typography>
                <Box sx={{ height: { xs: 400, md: 520 }, width: '100%' }}>
                  <BrazilDistributionViz
                    porUf={localidade.porUf}
                    maxVidas={localidade.maxUfVidas}
                    minVidas={localidade.minUfVidas}
                    total={localidade.total}
                    highlightUf={topUf?.uf}
                    height={520}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  )
}
