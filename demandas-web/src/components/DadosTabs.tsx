import React from 'react'
import { Tab, Tabs } from '@mui/material'
import type { TabKey } from '../types/dadosTypes'

interface DadosTabsProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

export const DadosTabs: React.FC<DadosTabsProps> = ({ activeTab, onTabChange }) => {
  const handleChange = (_: React.SyntheticEvent, newValue: TabKey) => {
    onTabChange(newValue)
  }

  return (
    <Tabs 
      value={activeTab} 
      onChange={handleChange} 
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
        '& .MuiTabs-scrollButtons': {
          '&.Mui-disabled': {
            opacity: 0.3,
          },
        },
      }}
    >
      {/* Primeira linha - Dados principais */}
      <Tab value="clientes" label="Clientes" />
      <Tab value="contratos" label="Contratos" />
      <Tab value="operadoras" label="Operadoras" />
      <Tab value="produtos" label="Produtos" />
      <Tab value="sistemas" label="Sistemas" />
      <Tab value="analistas" label="Analistas" />
      <Tab value="areas" label="Áreas" />
      <Tab value="tipos" label="Tipos" />
      <Tab value="tipos-cadastro" label="Tipos - Cadastro" />
      <Tab value="servicos" label="Serviços" />
      <Tab value="solicitantes" label="Solicitantes" />
      <Tab value="relatorios" label="Relatórios" />
      <Tab value="modelos" label="Modelos" />
      <Tab value="padrao" label="PADRAO" />
      
      {/* Segunda linha - Dados Mailling */}
      <Tab value="areasMailling" label="Áreas Mailling" />
      <Tab value="cargosMailling" label="Cargos Mailling" />
      <Tab value="filiaisMailling" label="Filiais Mailling" />
      
      {/* Terceira linha - Configurações */}
      <Tab value="configuracoes" label="Configurações" />
    </Tabs>
  )
}
