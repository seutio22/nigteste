import React, { useMemo, useState } from 'react'
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import FiliaisTab from './Placement/FiliaisTab'
import CorretoresParceirosTab from './Placement/CorretoresParceirosTab'
import ProspectsTab from './Placement/ProspectsTab'
import CondicoesTab from './Placement/CondicoesTab'
import { PlacementContratoCatalogoTab } from './Placement/PlacementContratoCatalogoTab'
import AnalistasTab from './Placement/AnalistasTab'
import PlanosTab from './Placement/PlanosTab'
import DiferenciaisTab from './Placement/DiferenciaisTab'
import CondicoesContratuaisTab from './Placement/CondicoesContratuaisTab'
import IndicadoresOperadorasTab from './Placement/IndicadoresOperadorasTab'
import OperadoraLogosTab from './Placement/OperadoraLogosTab'
import { DadosTableUploadBar } from '../components/DadosTableUploadBar'
import { usePermissions } from '../hooks/usePermissions'
import { useMasterDataStore } from '../store/masterDataStore'
import { usePlacementStore } from '../store/placementStore'
import {
  getPlacementUploadConfig,
  type PlacementDadosTabKey,
} from '../lib/placementDadosUpload'
type PlacementTabKey =
  | 'filiais'
  | 'corretores'
  | 'analistas'
  | 'prospects'
  | 'condicoes'
  | 'planos'
  | 'diferenciais'
  | 'condicoesContratuais'
  | 'indicadoresOperadoras'
  | 'projetos'
  | 'pedido'
  | 'temperatura'
  | 'tipoContratacao'
  | 'modalidadeContrato'
  | 'prazoVigenciaContrato'
  | 'logosOperadora'

export default function DadosPlacementPage() {
  const [activeTab, setActiveTab] = useState<PlacementTabKey>('filiais')
  const { canImport } = usePermissions('dadosPlacement')
  const operadoras = useMasterDataStore((s) => s.operadoras)

  const uploadConfig = useMemo(() => {
    if (activeTab === 'logosOperadora' || activeTab === 'condicoesContratuais' || activeTab === 'indicadoresOperadoras')
      return null
    return getPlacementUploadConfig(
      activeTab as PlacementDadosTabKey,
      usePlacementStore.getState(),
      operadoras
    )
  }, [activeTab, operadoras])

  const refreshAfterImport = () => {
    const s = usePlacementStore.getState()
    switch (activeTab) {
      case 'filiais':
        void s.syncFiliais(true)
        break
      case 'corretores':
        void s.syncCorretoresParceiros(true)
        break
      case 'analistas':
        void s.syncAnalistas(true)
        break
      case 'prospects':
        void s.syncProspects(true)
        break
      case 'condicoes':
        void s.syncCondicoes(true)
        break
      case 'planos':
        void s.syncPlanos(true)
        break
      case 'diferenciais':
        void s.syncDiferenciais(true)
        void s.syncPlanos(true)
        break
      case 'condicoesContratuais':
        void s.syncCondicoesContratuais(true)
        void s.syncPlanos(true)
        break
      case 'indicadoresOperadoras':
        void s.syncIndicadoresOperadoras(true)
        break
      case 'projetos':
      case 'pedido':
      case 'temperatura':
        void s.syncProjetosPedidos(true)
        break
      case 'tipoContratacao':
      case 'modalidadeContrato':
      case 'prazoVigenciaContrato':
        void s.syncPlacementContratoCatalogos(true)
        break
      default:
        break
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ mb: 0.25 }}>
          Dados · Placement
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cadastros do módulo Placement. Selecione uma tabela abaixo.
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, next: PlacementTabKey) => setActiveTab(next)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            minWidth: 'auto',
            px: 2,
            py: 1,
            fontSize: '0.875rem',
            textTransform: 'none',
            fontWeight: 500,
          },
        }}
      >
        <Tab value="filiais" label="Filiais" />
        <Tab value="corretores" label="Corretor parceiro" />
        <Tab value="analistas" label="Analista" />
        <Tab value="prospects" label="Prospect" />
        <Tab value="condicoes" label="Condições" />
        <Tab value="planos" label="Planos" />
        <Tab value="diferenciais" label="Diferenciais" />
        <Tab value="condicoesContratuais" label="Condições contratuais" />
        <Tab value="indicadoresOperadoras" label="Indicadores operadoras" />
        <Tab value="projetos" label="Projetos" />
        <Tab value="pedido" label="Pedido/conta" />
        <Tab value="temperatura" label="Temperatura" />
        <Tab value="tipoContratacao" label="Tipo contratação" />
        <Tab value="modalidadeContrato" label="Modalidade contrato" />
        <Tab value="prazoVigenciaContrato" label="Duração contratual" />
        <Tab value="logosOperadora" label="Logos operadoras" />
      </Tabs>

      <Box>
        {canImport ? (
          <DadosTableUploadBar config={uploadConfig} onImported={refreshAfterImport} />
        ) : null}
        {activeTab === 'filiais' && <FiliaisTab />}
        {activeTab === 'corretores' && <CorretoresParceirosTab />}
        {activeTab === 'analistas' && <AnalistasTab />}
        {activeTab === 'prospects' && <ProspectsTab />}
        {activeTab === 'condicoes' && <CondicoesTab />}
        {activeTab === 'planos' && <PlanosTab />}
        {activeTab === 'diferenciais' && <DiferenciaisTab />}
        {activeTab === 'condicoesContratuais' && <CondicoesContratuaisTab />}
        {activeTab === 'indicadoresOperadoras' && <IndicadoresOperadorasTab />}
        {activeTab === 'projetos' && <PlacementContratoCatalogoTab kind="projeto" />}
        {activeTab === 'pedido' && <PlacementContratoCatalogoTab kind="pedido" />}
        {activeTab === 'temperatura' && <PlacementContratoCatalogoTab kind="temperatura" />}
        {activeTab === 'tipoContratacao' && <PlacementContratoCatalogoTab kind="tipoContratacao" />}
        {activeTab === 'modalidadeContrato' && <PlacementContratoCatalogoTab kind="modalidadeContrato" />}
        {activeTab === 'prazoVigenciaContrato' && <PlacementContratoCatalogoTab kind="prazoVigenciaContrato" />}
        {activeTab === 'logosOperadora' && <OperadoraLogosTab />}
      </Box>
    </Paper>
  )
}
