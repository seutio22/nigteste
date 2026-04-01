import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import { Close as CloseIcon, ContentCopy as CopyIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { api } from '../lib/api.local';
import { PrimaryActionButton } from './PrimaryActionButton';

interface ShareProjectModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

interface ShareToken {
  id: string;
  name: string;
  description?: string;
  token: string;
  allowedViews: string;
  expiresAt?: string;
  isActive: boolean;
  viewCount: number;
  lastViewAt?: string;
  createdAt: string;
}

const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  open,
  onClose,
  projectId,
  projectName
}) => {
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [newShare, setNewShare] = useState({
    name: '',
    description: '',
    allowedViews: 'overview,timeline,gantt,team,resources',
    expiresAt: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      fetchShareTokens();
    }
  }, [open, projectId]);

  const fetchShareTokens = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projetos/${projectId}/share`);
      setShareTokens(response.shareTokens || []);
    } catch (error) {
      console.error('Erro ao buscar tokens de compartilhamento:', error);
      setError('Erro ao carregar links de compartilhamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      setCreating(true);
      setError('');
      
      const response = await api.post(`/projetos/${projectId}/share`, newShare);
      
      if (response.success) {
        setSuccess('Link de compartilhamento criado com sucesso!');
        setNewShare({
          name: '',
          description: '',
          allowedViews: 'overview,timeline,gantt,team,resources',
          expiresAt: ''
        });
        fetchShareTokens();
      }
    } catch (error: any) {
      console.error('Erro ao criar compartilhamento:', error);
      setError(error.response?.data?.error || 'Erro ao criar link de compartilhamento');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Tem certeza que deseja desativar este link de compartilhamento?')) {
      return;
    }

    try {
      await api.delete(`/projetos/${projectId}/share/${tokenId}`);
      setSuccess('Link de compartilhamento desativado com sucesso!');
      fetchShareTokens();
    } catch (error: any) {
      console.error('Erro ao desativar token:', error);
      setError('Erro ao desativar link de compartilhamento');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Link copiado para a área de transferência!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getViewsLabel = (views: string) => {
    const viewMap: { [key: string]: string } = {
      overview: 'Visão Geral',
      timeline: 'Cronograma Detalhado',
      gantt: 'Gráfico de Gantt',
      team: 'Equipe',
      resources: 'Stakeholders'
    };
    
    return views.split(',').map(view => viewMap[view.trim()] || view.trim()).join(', ');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          py: 1,
          px: { xs: 1, sm: 2 },
          bgcolor: '#F5F7FA',
          fontFamily: 'Geometria, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Geometria, system-ui, sans-serif',
                fontWeight: 600,
                color: '#002561'
              }}
            >
              Compartilhar projeto
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#6b7a80',
                fontFamily: 'Geometria, system-ui, sans-serif',
                mt: 0.5
              }}
            >
              {projectName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#6b7a80' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5 }}>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2, fontFamily: 'Geometria, system-ui, sans-serif' }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2, borderRadius: 2, fontFamily: 'Geometria, system-ui, sans-serif' }}
            onClose={() => setSuccess('')}
          >
            {success}
          </Alert>
        )}

        {/* Criar novo compartilhamento */}
        <Box sx={{ mb: 3, bgcolor: 'white', borderRadius: 2, p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: 'Geometria, system-ui, sans-serif',
              fontWeight: 600,
              color: '#050032'
            }}
          >
            Criar Novo Link
          </Typography>
          
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} sx={{ mb: 2 }}>
            <TextField
              label="Nome do compartilhamento"
              value={newShare.name}
              onChange={(e) => setNewShare({ ...newShare, name: e.target.value })}
              placeholder="Ex: Compartilhamento com cliente"
              fullWidth
              InputLabelProps={{ sx: { fontFamily: 'Geometria, system-ui, sans-serif' } }}
              inputProps={{ style: { fontFamily: 'Geometria, system-ui, sans-serif' } }}
            />
            
            <TextField
              label="Data de expiração (opcional)"
              type="datetime-local"
              value={newShare.expiresAt}
              onChange={(e) => setNewShare({ ...newShare, expiresAt: e.target.value })}
              InputLabelProps={{ shrink: true, sx: { fontFamily: 'Geometria, system-ui, sans-serif' } }}
              fullWidth
            />
          </Box>

          <TextField
            label="Descrição (opcional)"
            value={newShare.description}
            onChange={(e) => setNewShare({ ...newShare, description: e.target.value })}
            placeholder="Descrição do compartilhamento"
            multiline
            rows={2}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ sx: { fontFamily: 'Geometria, system-ui, sans-serif' } }}
            inputProps={{ style: { fontFamily: 'Geometria, system-ui, sans-serif' } }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ fontFamily: 'Geometria, system-ui, sans-serif' }}>Seções permitidas</InputLabel>
            <Select
              multiple
              value={newShare.allowedViews.split(',')}
              onChange={(e) => setNewShare({ 
                ...newShare, 
                allowedViews: Array.isArray(e.target.value) ? e.target.value.join(',') : e.target.value 
              })}
              sx={{
                fontFamily: 'Geometria, system-ui, sans-serif'
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const viewMap: { [key: string]: string } = {
                      overview: 'Visão Geral',
                      timeline: 'Cronograma',
                      team: 'Equipe',
                      resources: 'Stakeholders'
                    };
                    return <Chip key={value} label={viewMap[value] || value} size="small" />;
                  })}
                </Box>
              )}
            >
              <MenuItem value="overview">Visão Geral</MenuItem>
              <MenuItem value="timeline">Cronograma Detalhado</MenuItem>
              <MenuItem value="gantt">Gráfico de Gantt</MenuItem>
              <MenuItem value="team">Equipe</MenuItem>
              <MenuItem value="resources">Stakeholders</MenuItem>
            </Select>
          </FormControl>

          <PrimaryActionButton
            onClick={handleCreateShare}
            disabled={creating || !newShare.name}
            fullWidth
            label={creating ? 'Criando...' : 'Criar link de compartilhamento'}
          >
            {creating ? 'Criando...' : 'Criar link de compartilhamento'}
          </PrimaryActionButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Lista de compartilhamentos existentes */}
        <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: 'Geometria, system-ui, sans-serif',
              fontWeight: 600,
              color: '#050032'
            }}
          >
            Links Ativos
          </Typography>

          {loading ? (
            <Typography sx={{ fontFamily: 'Geometria, system-ui, sans-serif' }}>Carregando...</Typography>
          ) : shareTokens.length === 0 ? (
            <Typography sx={{ color: '#6b7a80', fontFamily: 'Geometria, system-ui, sans-serif' }}>
              Nenhum link de compartilhamento criado ainda.
            </Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              {shareTokens.map((token) => (
                <Box
                  key={token.id}
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    mb: 1.5,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F9FAFB'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontFamily: 'Geometria, system-ui, sans-serif',
                          fontWeight: 600,
                          color: '#050032'
                        }}
                      >
                        {token.name}
                      </Typography>
                      {token.description && (
                        <Typography
                          variant="body2"
                          sx={{ color: '#6b7a80', fontFamily: 'Geometria, system-ui, sans-serif' }}
                        >
                          {token.description}
                        </Typography>
                      )}
                    </Box>
                    
                    <Tooltip title="Desativar link">
                      <IconButton
                        onClick={() => handleDeleteToken(token.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: '#4b5563', fontFamily: 'Geometria, system-ui, sans-serif' }}
                    >
                      Seções: {getViewsLabel(token.allowedViews)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#4b5563', fontFamily: 'Geometria, system-ui, sans-serif' }}
                    >
                      Criado em: {formatDate(token.createdAt)}
                    </Typography>
                    {token.expiresAt && (
                      <Typography
                        variant="body2"
                        sx={{ color: '#4b5563', fontFamily: 'Geometria, system-ui, sans-serif' }}
                      >
                        Expira em: {formatDate(token.expiresAt)}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{ color: '#4b5563', fontFamily: 'Geometria, system-ui, sans-serif' }}
                    >
                      Visualizações: {token.viewCount}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      value={getShareUrl(token.token)}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                    <Tooltip title="Copiar link">
                      <IconButton
                        onClick={() => copyToClipboard(getShareUrl(token.token))}
                        size="small"
                        sx={{ color: '#002561' }}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            fontFamily: 'Geometria, system-ui, sans-serif',
            textTransform: 'none',
            color: '#4b5563'
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareProjectModal;
