import React from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material'
import * as XLSX from 'xlsx'

interface DadosHelpModalProps {
  open: boolean
  onClose: () => void
}

export const DadosHelpModal: React.FC<DadosHelpModalProps> = ({ open, onClose }) => {
  const downloadModel = () => {
    const wb = XLSX.utils.book_new()
    const addSheet = (name: string, headers: string[]) => {
      const ws = XLSX.utils.aoa_to_sheet([headers])
      XLSX.utils.book_append_sheet(wb, ws, name)
    }
    
    addSheet('Clientes', ['id', 'nome', 'grupoEconomico'])
    addSheet('Contratos', ['id', 'codigo', 'grupoEconomico']) // CORRIGIDO: apenas campos necessários
    addSheet('Operadoras', ['id', 'nome'])
    addSheet('Produtos', ['id', 'nome'])
    addSheet('Sistemas', ['id', 'nome'])
    addSheet('Analistas', ['id', 'nome'])
    addSheet('Areas', ['id', 'nome'])
    addSheet('Areas Mailling', ['id', 'nome'])
    addSheet('Cargos Mailling', ['id', 'nome'])
    addSheet('Filiais Mailling', ['id', 'nome'])
    addSheet('Tipos', ['id', 'nome', 'tipoServicoId'])
    addSheet('Servicos', ['id', 'nome'])
    addSheet('Solicitantes', ['id', 'nome'])
    addSheet('Relatorios', ['id', 'nome'])
    addSheet('Modelos', ['id', 'nome'])
    addSheet('Padrao', ['id', 'nome', 'tipoServicoId'])
    addSheet('Configuracoes', ['id', 'chave', 'valor', 'tipo', 'categoria', 'descricao'])
    
    XLSX.writeFile(wb, 'modelo-dados-mestres.xlsx')
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>Modelo de importação (Excel)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Estrutura das abas e colunas esperadas:
        </Typography>
        <Typography variant="body2">- Clientes: id, nome, grupoEconomico</Typography>
        <Typography variant="body2">- Contratos: id, codigo, grupoEconomico</Typography> {/* CORRIGIDO */}
        <Typography variant="body2">- Operadoras: id, nome</Typography>
        <Typography variant="body2">- Produtos: id, nome</Typography>
        <Typography variant="body2">- Sistemas: id, nome</Typography>
        <Typography variant="body2">- Analistas: id, nome</Typography>
        <Typography variant="body2">- Areas: id, nome</Typography>
        <Typography variant="body2">- Areas Mailling: id, nome</Typography>
        <Typography variant="body2">- Cargos Mailling: id, nome</Typography>
        <Typography variant="body2">- Filiais Mailling: id, nome</Typography>
        <Typography variant="body2">- Tipos: id, nome, tipoServicoId</Typography>
        <Typography variant="body2">- Servicos: id, nome</Typography>
        <Typography variant="body2">- Solicitantes: id, nome</Typography>
        <Typography variant="body2">- Relatorios: id, nome</Typography>
        <Typography variant="body2">- Modelos: id, nome</Typography>
        <Typography variant="body2">- Padrao: id, nome, tipoServicoId</Typography>
        <Typography variant="body2">- Configurações: id, chave, valor, tipo, categoria, descricao</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          <strong>Observações importantes:</strong>
        </Typography>
        <Typography variant="caption" display="block">
          • IDs podem ser deixados em branco para geração automática
        </Typography>
        <Typography variant="caption" display="block">
          • Para Contratos: apenas <strong>codigo</strong> e <strong>grupoEconomico</strong> são obrigatórios
        </Typography>
        <Typography variant="caption" display="block">
          • Para Tipos: preencha "tipoServicoId" com CAD (Cadastro) ou MAN (Manutenção)
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
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
          Fechar
        </Button>
        <Button 
          variant="contained" 
          onClick={downloadModel}
          size="medium"
          className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            height: '44px',
            minWidth: '140px',
            boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
            '&:hover': {
              boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
              transform: 'translateY(-2px)'
            }
          }}
        >
          Baixar modelo
        </Button>
      </DialogActions>
    </Dialog>
  )
}
