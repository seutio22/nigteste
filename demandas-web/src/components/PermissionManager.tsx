import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
  Chip,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { SystemPermissions, ModulePermission } from '../types/permissions';

interface PermissionManagerProps {
  open: boolean;
  onClose: () => void;
  userPermissions: SystemPermissions | null;
  onSave: (permissions: SystemPermissions) => void;
  userRole: string;
  userName: string;
}

const MODULE_LABELS: Record<keyof SystemPermissions, string> = {
  home: 'Página Inicial',
  dashboard: 'Dashboard',
  cadastro: 'Cadastro',
  manutencao: 'Manutenção',
  atendimento: 'Atendimento',
  comunicados: 'Comunicados',
  validacao: 'Validação',
  reajuste: 'Reajuste',
  mailling: 'Mailing',
  analytics: 'Analytics',
  kanban: 'Kanban',
  projetos: 'Projetos',
  dados: 'Dados',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
  relatorios: 'Relatórios'
};

const ACTION_LABELS: Record<keyof ModulePermission, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  import: 'Importar',
  approve: 'Aprovar',
  reject: 'Rejeitar'
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#f44336',
  gerente: '#ff9800',
  analista: '#2196f3',
  solicitante: '#4caf50',
  viewer: '#9e9e9e'
};

export default function PermissionManager({
  open,
  onClose,
  userPermissions,
  onSave,
  userRole,
  userName
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<SystemPermissions | null>(userPermissions);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPermissions(userPermissions);
    setHasChanges(false);
  }, [userPermissions]);

  const handlePermissionChange = (
    module: keyof SystemPermissions,
    action: keyof ModulePermission,
    value: boolean
  ) => {
    if (!permissions) return;

    setPermissions(prev => {
      if (!prev) return prev;
      
      const newPermissions = {
        ...prev,
        [module]: {
          ...prev[module],
          [action]: value
        }
      };
      
      return newPermissions;
    });
    
    setHasChanges(true);
  };

  const handleModuleToggle = (module: keyof SystemPermissions, value: boolean) => {
    if (!permissions) return;

    setPermissions(prev => {
      if (!prev) return prev;
      
      const newPermissions = {
        ...prev,
        [module]: {
          ...prev[module],
          view: value,
          create: value ? prev[module].create : false,
          edit: value ? prev[module].edit : false,
          delete: value ? prev[module].delete : false,
          export: value ? prev[module].export : false,
          import: value ? prev[module].import : false,
          approve: value ? prev[module].approve : false,
          reject: value ? prev[module].reject : false
        }
      };
      
      return newPermissions;
    });
    
    setHasChanges(true);
  };

  const handleSave = () => {
    if (permissions) {
      onSave(permissions);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setPermissions(userPermissions);
    setHasChanges(false);
    onClose();
  };

  const handleResetToDefault = () => {
    // Implementar lógica para resetar para permissões padrão do role
    setHasChanges(true);
  };

  if (!permissions) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">Gerenciar Permissões</Typography>
          <Chip
            label={userName}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={userRole.toUpperCase()}
            style={{ backgroundColor: ROLE_COLORS[userRole] || '#666', color: 'white' }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure as permissões específicas para este usuário. As permissões definem o que o usuário pode ver e fazer em cada módulo do sistema.
        </Typography>

        <Grid container spacing={2}>
          {Object.entries(permissions).map(([moduleKey, modulePermissions]) => {
            const module = moduleKey as keyof SystemPermissions;
            const canView = modulePermissions.view;
            
            return (
              <Grid item xs={12} key={module}>
                <Accordion defaultExpanded={module === 'home' || module === 'dashboard'}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={canView}
                            onChange={(e) => handleModuleToggle(module, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label=""
                      />
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {MODULE_LABELS[module]}
                      </Typography>
                      <Chip
                        label={canView ? 'Ativo' : 'Inativo'}
                        color={canView ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.entries(modulePermissions).map(([actionKey, actionValue]) => {
                        const action = actionKey as keyof ModulePermission;
                        
                        // Pular se não for uma ação básica ou se o módulo estiver inativo
                        if (!['view', 'create', 'edit', 'delete'].includes(action) || !canView) {
                          return null;
                        }
                        
                        return (
                          <Grid item xs={6} sm={3} key={action}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={actionValue as boolean}
                                  onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
                                  disabled={!canView}
                                />
                              }
                              label={ACTION_LABELS[action]}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                    
                    {canView && (
                      <Box mt={2}>
                        <Divider />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Permissões avançadas disponíveis quando o módulo estiver ativo
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleResetToDefault} color="secondary">
          Resetar para Padrão
        </Button>
        <Button onClick={handleCancel}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges}
        >
          Salvar Permissões
        </Button>
      </DialogActions>
    </Dialog>
  );
}
