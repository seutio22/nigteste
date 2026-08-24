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
import { PrimaryActionButton } from './PrimaryActionButton';
import { SystemPermissions, ModulePermission } from '../types/permissions';
import { getUserPermissions as mergeUserPermissions } from '../utils/defaultPermissions';

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
  dados: 'Dados (acesso geral — legado)',
  dadosNig: 'NIG — dados mestres',
  dadosProdutividade: 'Produtividade — regras e tempos',
  dadosPlacement: 'Placement — cadastros',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
  relatorios: 'Relatórios',
  placementFila: 'Placement · Fila'
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

const HIDDEN_PERMISSION_MODULES: (keyof SystemPermissions)[] = []

const PERMISSION_SECTIONS: { title?: string; modules: (keyof SystemPermissions)[] }[] = [
  {
    modules: ['home', 'dashboard'],
  },
  {
    title: 'NIG — operacional',
    modules: ['cadastro', 'manutencao', 'atendimento', 'comunicados', 'validacao', 'reajuste', 'mailling', 'analytics', 'kanban', 'projetos'],
  },
  {
    title: 'Dados — subpáginas (/dados)',
    modules: ['dadosNig', 'dadosProdutividade', 'dadosPlacement'],
  },
  {
    title: 'Placement — operacional',
    modules: ['placementFila'],
  },
  {
    title: 'Administrativo',
    modules: ['usuarios', 'configuracoes', 'relatorios'],
  },
]

const ALL_DISPLAY_MODULES = PERMISSION_SECTIONS.flatMap((s) => s.modules)

function completeModulePermission(perms?: ModulePermission): ModulePermission {
  return {
    view: perms?.view ?? false,
    create: perms?.create ?? false,
    edit: perms?.edit ?? false,
    delete: perms?.delete ?? false,
    export: perms?.export ?? false,
    import: perms?.import ?? false,
    approve: perms?.approve ?? false,
    reject: perms?.reject ?? false,
  }
}

function buildEditorPermissions(
  userPermissions: SystemPermissions | null | undefined,
  userRole: string
): SystemPermissions {
  const merged = mergeUserPermissions(userPermissions, userRole)
  const complete = { ...merged } as SystemPermissions
  for (const key of ALL_DISPLAY_MODULES) {
    complete[key] = completeModulePermission(merged[key])
  }
  return complete
}

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
  const [permissions, setPermissions] = useState<SystemPermissions | null>(() =>
    buildEditorPermissions(userPermissions, userRole)
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPermissions(buildEditorPermissions(userPermissions, userRole))
    setHasChanges(false)
  }, [userPermissions, userRole])

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
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Configure as permissões específicas para este usuário. As permissões definem o que o usuário pode ver e fazer em cada módulo do sistema.
        </Typography>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🎯 Permissões por Página
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • <strong>Visualizar:</strong> Permite ver o módulo no menu e acessar a página<br />
            • <strong>Criar:</strong> Permite criar novos registros<br />
            • <strong>Editar:</strong> Permite modificar registros existentes<br />
            • <strong>Excluir:</strong> Permite remover registros permanentemente
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'info.dark', fontWeight: 'medium' }}>
            💡 Estas configurações sobrescrevem as permissões padrão do perfil (role)
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {PERMISSION_SECTIONS.map((section) => (
            <React.Fragment key={section.title ?? 'geral'}>
              {section.title ? (
                <Grid item xs={12}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mt: section.title === 'Dados — subpáginas (/dados)' ? 1 : 2, mb: 0.5 }}
                  >
                    {section.title}
                  </Typography>
                </Grid>
              ) : null}
              {section.modules
                .filter((module) => permissions[module] && !HIDDEN_PERMISSION_MODULES.includes(module))
                .map((module) => {
            const modulePermissions = permissions[module]
            
            return (
              <Grid item xs={12} key={module}>
                <Accordion defaultExpanded={module === 'home' || module === 'dashboard'}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={modulePermissions.view}
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
                        label={modulePermissions.view ? 'Ativo' : 'Inativo'}
                        color={modulePermissions.view ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.entries(modulePermissions).map(([actionKey, actionValue]) => {
                        const action = actionKey as keyof ModulePermission;
                        
                        return (
                          <Grid item xs={6} sm={3} key={action}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={actionValue as boolean}
                                  onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
                                  disabled={!modulePermissions.view && action !== 'view'}
                                />
                              }
                              label={ACTION_LABELS[action] || action}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                    
                    {modulePermissions.view && (
                      <Box mt={2}>
                        <Divider />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          💡 Marque todas as permissões que o usuário deve ter para este módulo
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            );
          })}
            </React.Fragment>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleResetToDefault} color="secondary">
          Resetar para Padrão
        </Button>
        <Button onClick={handleCancel}>
          Cancelar
        </Button>
        <PrimaryActionButton
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Salvar Permissões
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  );
}
