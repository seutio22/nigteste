import React from 'react'
import { Box, Button, IconButton, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import type { TabKey } from '../types/dadosTypes'

interface DadosHeaderProps {
  activeTab: TabKey
  onUpload: () => void
  onSync: () => void
  onHelp: () => void
  onAdd: () => void
}

export const DadosHeader: React.FC<DadosHeaderProps> = ({
  activeTab,
  onUpload,
  onSync,
  onHelp,
  onAdd
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
              boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
            }
          }}
        >
          Upload
        </Button>
        
        <Button 
          onClick={onSync}
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
              boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
            }
          }}
        >
          Atualizar
        </Button>
        
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
              boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
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
