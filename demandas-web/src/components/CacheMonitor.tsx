import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Button, Paper, Alert } from '@mui/material';
import { Refresh, CheckCircle, Warning, Info } from '@mui/icons-material';
import { getCleanupStats, isSystemClean, forceSmartCleanup } from '../utils/smart-cache-cleaner';

interface CacheMonitorProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const CacheMonitor: React.FC<CacheMonitorProps> = ({ 
  showDetails = false, 
  compact = false 
}) => {
  const [stats, setStats] = useState<any>(null);
  const [isClean, setIsClean] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadStats = async () => {
    try {
      const cleanupStats = getCleanupStats();
      const systemClean = isSystemClean();
      
      setStats(cleanupStats);
      setIsClean(systemClean);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de cache:', error);
    }
  };

  const handleForceCleanup = async () => {
    setIsLoading(true);
    try {
      await forceSmartCleanup();
      await loadStats();
    } catch (error) {
      console.error('Erro ao forçar limpeza:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Atualizar estatísticas a cada 30 segundos
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <Chip
        icon={isClean ? <CheckCircle /> : <Warning />}
        label={isClean ? 'Cache Limpo' : 'Cache Sujo'}
        color={isClean ? 'success' : 'warning'}
        size="small"
        onClick={handleForceCleanup}
        disabled={isLoading}
      />
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          🧠 Monitor de Cache Inteligente
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleForceCleanup}
          disabled={isLoading}
          size="small"
        >
          {isLoading ? 'Limpando...' : 'Forçar Limpeza'}
        </Button>
      </Box>

      <Box display="flex" gap={1} mb={2}>
        <Chip
          icon={isClean ? <CheckCircle /> : <Warning />}
          label={isClean ? 'Sistema Limpo' : 'Necessita Limpeza'}
          color={isClean ? 'success' : 'warning'}
        />
        {stats && (
          <Chip
            icon={<Info />}
            label={`v${stats.version}`}
            color="info"
            variant="outlined"
          />
        )}
      </Box>

      {showDetails && stats && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            📊 Estatísticas da Última Limpeza:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            <Chip
              label={`LocalStorage: ${stats.localStorageRemoved}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`SessionStorage: ${stats.sessionStorageRemoved}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`Cookies: ${stats.cookiesRemoved}`}
              size="small"
              color="default"
              variant="outlined"
            />
            <Chip
              label={`Preservados: ${stats.preservedKeys}`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Total Limpo:</strong> {stats.totalCleaned} itens
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Última Limpeza:</strong> {stats.lastCleanup ? new Date(stats.lastCleanup).toLocaleString('pt-BR') : 'Nunca'}
          </Typography>
        </Box>
      )}

      {!isClean && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          O sistema detectou dados de versões anteriores. Uma limpeza automática será executada em breve.
        </Alert>
      )}
    </Paper>
  );
};

export default CacheMonitor;
