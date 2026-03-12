import React from 'react'
import { Box, Button, IconButton, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DownloadIcon from '@mui/icons-material/Download'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DeleteIcon from '@mui/icons-material/Delete'
// CleaningServicesIcon removido - botão de limpeza de duplicatas removido
import type { TabKey } from '../types/dadosTypes'

interface DadosHeaderProps {
  activeTab: TabKey
  onUpload: () => void
  onSmartImport: () => void
  onBulkDelete: () => void
  onHelp: () => void
  onAdd: () => void
  onExportAll: () => void
  onExportCurrent: () => void
  // onCleanup removido - função de limpeza de duplicatas removida
}

export const DadosHeader: React.FC<DadosHeaderProps> = ({
  activeTab,
  onUpload,
  onSmartImport,
  onBulkDelete,
  onHelp,
  onAdd,
  onExportAll,
  onExportCurrent,
  // onCleanup removido
}) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
      <Typography variant="h5">Dados Mestres</Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<CloudUploadIcon />}
          onClick={onUpload}
          size="medium"
          className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
            }
          }}
        >
          Upload
        </Button>
        
        <Button 
          variant="contained" 
          startIcon={<AutoFixHighIcon />}
          onClick={onSmartImport}
          size="medium"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            background: 'linear-gradient(135deg, #050032 0%, #002561 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px 0 rgba(124, 58, 237, 0.3)'
            }
          }}
        >
          Importador Inteligente
        </Button>
        
        <Button 
          variant="outlined" 
          startIcon={<DeleteIcon />}
          onClick={onBulkDelete}
          size="medium"
          className="text-red-600 border-red-300 hover:text-red-700 hover:border-red-400 hover:bg-red-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            color: '#DA3832',
            borderColor: '#DA3832',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(239, 68, 68, 0.15)',
              backgroundColor: '#fef2f2'
            }
          }}
        >
          Exclusão em Massa
        </Button>
        
        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />}
          onClick={onExportCurrent}
          size="medium"
          className="text-green-600 border-green-300 hover:text-green-700 hover:border-green-400 hover:bg-green-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            color: '#00A649',
            borderColor: '#00A649',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(16, 185, 129, 0.15)',
              backgroundColor: '#ecfdf5'
            }
          }}
        >
          Exportar {activeTab}
        </Button>
        
        <Button 
          variant="outlined" 
          startIcon={<FileDownloadIcon />}
          onClick={onExportAll}
          size="medium"
          className="text-orange-600 border-orange-300 hover:text-orange-700 hover:border-orange-400 hover:bg-orange-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            color: '#ea580c',
            borderColor: '#f97316',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(249, 115, 22, 0.15)',
              backgroundColor: '#fff7ed'
            }
          }}
        >
          Exportar Tudo
        </Button>
        
        {/* Botão "Limpar Duplicatas" removido - substituído pelo importador inteligente com validação */}
        
        <Button 
          onClick={onHelp}
          size="medium"
          className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            height: '44px',
            borderWidth: '2px',
            '&:hover': {
              borderWidth: '2px',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
            }
          }}
        >
          Instruções
        </Button>
        
        
        <IconButton color="primary" onClick={onAdd} size="small">
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  )
}
