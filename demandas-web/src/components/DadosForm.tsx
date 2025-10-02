import React from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Button, MenuItem } from '@mui/material'
import { useMasterDataStore } from '../store/masterDataStore'
import type { TabKey, FormData } from '../types/dadosTypes'

interface DadosFormProps {
  open: boolean
  onClose: () => void
  activeTab: TabKey
  form: FormData
  onFormChange: (form: FormData) => void
  onSave: () => void
}

export const DadosForm: React.FC<DadosFormProps> = ({
  open,
  onClose,
  activeTab,
  form,
  onFormChange,
  onSave
}) => {
  const store = useMasterDataStore()

  const handleFieldChange = (field: keyof FormData, value: any) => {
    onFormChange({ ...form, [field]: value })
  }

  const renderFormFields = () => {
    switch (activeTab) {
      case 'clientes':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
            <TextField 
              label="Grupo econômico" 
              value={form.grupoEconomico ?? ''} 
              onChange={(e) => handleFieldChange('grupoEconomico', e.target.value)}
            />
          </Stack>
        )

      case 'contratos':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Grupo econômico" 
              value={form.grupoEconomico ?? ''} 
              onChange={(e) => handleFieldChange('grupoEconomico', e.target.value)}
              required
            />
            <TextField 
              label="Código" 
              value={form.codigo ?? ''} 
              onChange={(e) => handleFieldChange('codigo', e.target.value)}
              required
            />
            <TextField 
              select 
              label="Status" 
              value={form.status ?? 'Ativo'} 
              onChange={(e) => handleFieldChange('status', e.target.value)}
              required
            >
              <MenuItem value="Ativo">Ativo</MenuItem>
              <MenuItem value="Inativo">Inativo</MenuItem>
            </TextField>
          </Stack>
        )

      case 'operadoras':
      case 'produtos':
      case 'sistemas':
      case 'areas':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
          </Stack>
        )

      case 'analistas':
      case 'servicos':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
            <TextField 
              label="Descrição" 
              value={form.descricao ?? ''} 
              onChange={(e) => handleFieldChange('descricao', e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        )

      case 'solicitantes':
      case 'relatorios':
      case 'modelos':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
          </Stack>
        )

      case 'areasMailling':
      case 'cargosMailling':
      case 'filiaisMailling':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
            <TextField 
              label="Descrição" 
              value={form.descricao ?? ''} 
              onChange={(e) => handleFieldChange('descricao', e.target.value)}
              multiline
              rows={3}
            />
            <TextField 
              select
              label="Status" 
              value={form.ativo !== undefined ? (form.ativo ? 'ativo' : 'inativo') : 'ativo'}
              onChange={(e) => handleFieldChange('ativo', e.target.value === 'ativo')}
            >
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="inativo">Inativo</MenuItem>
            </TextField>
          </Stack>
        )

      case 'tipos':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
          </Stack>
        )

      case 'tiposCadastro':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
            <TextField 
              label="Descrição" 
              value={form.descricao ?? ''} 
              onChange={(e) => handleFieldChange('descricao', e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        )

      case 'padrao':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Nome" 
              value={form.nome ?? ''} 
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              required
            />
            <TextField 
              select 
              label="Tipo de Serviço (opcional)" 
              value={form.tipoServicoId ?? ''} 
              onChange={(e) => handleFieldChange('tipoServicoId', e.target.value)}
            >
              <MenuItem value="">Selecione um tipo de serviço (opcional)</MenuItem>
              {store.tiposServico.map(ts => (
                <MenuItem key={ts.id} value={ts.id}>{ts.nome}</MenuItem>
              ))}
            </TextField>
          </Stack>
        )

      case 'configuracoes':
        return (
          <Stack gap={2} mt={1}>
            <TextField 
              label="Chave" 
              value={form.chave ?? ''} 
              onChange={(e) => handleFieldChange('chave', e.target.value)}
              required
            />
            <TextField 
              label="Valor" 
              value={form.valor ?? ''} 
              onChange={(e) => handleFieldChange('valor', e.target.value)}
              required
            />
            <TextField 
              select 
              label="Tipo" 
              value={form.tipo ?? 'configuracao'} 
              onChange={(e) => handleFieldChange('tipo', e.target.value)}
            >
              <MenuItem value="configuracao">Configuração</MenuItem>
              <MenuItem value="parametro">Parâmetro</MenuItem>
              <MenuItem value="configuracaoSistema">Configuração do Sistema</MenuItem>
            </TextField>
            <TextField 
              select 
              label="Categoria" 
              value={form.categoria ?? 'sistema'} 
              onChange={(e) => handleFieldChange('categoria', e.target.value)}
            >
              <MenuItem value="sistema">Sistema</MenuItem>
              <MenuItem value="negocio">Negócio</MenuItem>
              <MenuItem value="interface">Interface</MenuItem>
              <MenuItem value="seguranca">Segurança</MenuItem>
            </TextField>
            <TextField 
              label="Descrição" 
              value={form.descricao ?? ''} 
              onChange={(e) => handleFieldChange('descricao', e.target.value)} 
              multiline 
              rows={3} 
            />
          </Stack>
        )

      default:
        return null
    }
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
      <DialogTitle>{form.id ? 'Editar registro' : 'Novo registro'}</DialogTitle>
      <DialogContent>
        {renderFormFields()}
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
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={onSave}
          size="medium"
          className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
          sx={{
            borderRadius: '14px',
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            height: '44px',
            minWidth: '100px',
            boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
            '&:hover': {
              boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
              transform: 'translateY(-2px)'
            }
          }}
        >
          {form.id ? 'Salvar Alterações' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
