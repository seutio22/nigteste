import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeOverview: boolean;
  includeTimeline: boolean;
  includeTeam: boolean;
  includeStakeholders: boolean;
  includeActivities: boolean;
  includeGantt: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'a3' | 'letter';
}

const ExportProjectModal: React.FC<ExportProjectModalProps> = ({
  open,
  onClose,
  project
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeOverview: true,
    includeTimeline: true,
    includeTeam: true,
    includeStakeholders: true,
    includeActivities: true,
    includeGantt: false,
    orientation: 'portrait',
    pageSize: 'a4'
  });

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    if (!project) return;

    try {
      setExporting(true);
      setProgress(0);
      setError('');
      setSuccess('');

      if (exportOptions.format === 'pdf') {
        await exportToPDF();
      } else {
        await exportToExcel();
      }

      setSuccess(`Projeto exportado com sucesso em ${exportOptions.format.toUpperCase()}!`);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setError('Erro ao exportar projeto. Tente novamente.');
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: exportOptions.orientation,
      unit: 'mm',
      format: exportOptions.pageSize
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Cabeçalho
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DO PROJETO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(project.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Informações básicas
    if (exportOptions.includeOverview) {
      yPosition = addSectionToPDF(doc, 'INFORMAÇÕES GERAIS', yPosition, margin, contentWidth);
      
      const overviewData = [
        ['Campo', 'Valor'],
        ['Nome', project.name],
        ['Descrição', project.description || 'N/A'],
        ['Status', getStatusLabel(project.status)],
        ['Prioridade', getPriorityLabel(project.priority)],
        ['Progresso', `${project.progress}%`],
        ['Data de Início', formatDate(project.startDate)],
        ['Data de Fim', formatDate(project.endDate)],
        ['Orçamento', project.budget ? `R$ ${project.budget.toFixed(2)}` : 'N/A']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [overviewData[0]],
        body: overviewData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Timeline
    if (exportOptions.includeTimeline && project.timeline?.phases) {
      yPosition = addSectionToPDF(doc, 'CRONOGRAMA', yPosition, margin, contentWidth);
      
      const timelineData = [['Fase', 'Tarefas', 'Status', 'Progresso']];
      project.timeline.phases.forEach((phase: any) => {
        const taskCount = phase.tasks?.length || 0;
        const completedTasks = phase.tasks?.filter((t: any) => t.status === 'completed').length || 0;
        const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
        
        timelineData.push([
          phase.name,
          `${taskCount} tarefas`,
          getPhaseStatusLabel(phase.status),
          `${progress}%`
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [timelineData[0]],
        body: timelineData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Equipe
    if (exportOptions.includeTeam && project.members) {
      yPosition = addSectionToPDF(doc, 'EQUIPE DO PROJETO', yPosition, margin, contentWidth);
      
      const teamData = [['Nome', 'Email', 'Função', 'Status']];
      project.members.forEach((member: any) => {
        teamData.push([
          member.user?.name || 'N/A',
          member.user?.email || 'N/A',
          member.role || 'N/A',
          member.isActive ? 'Ativo' : 'Inativo'
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [teamData[0]],
        body: teamData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Atividades
    if (exportOptions.includeActivities && project.activities) {
      yPosition = addSectionToPDF(doc, 'HISTÓRICO DE ATIVIDADES', yPosition, margin, contentWidth);
      
      const activitiesData = [['Data', 'Ação', 'Item', 'Usuário']];
      project.activities.slice(0, 20).forEach((activity: any) => {
        activitiesData.push([
          formatDate(activity.timestamp),
          activity.action,
          activity.itemName,
          activity.user || 'Sistema'
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [activitiesData[0]],
        body: activitiesData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download
    const fileName = `projeto_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new();

    // Planilha 1: Informações Gerais
    if (exportOptions.includeOverview) {
      const overviewData = [
        ['INFORMAÇÕES GERAIS DO PROJETO'],
        [''],
        ['Campo', 'Valor'],
        ['Nome', project.name],
        ['Descrição', project.description || 'N/A'],
        ['Status', getStatusLabel(project.status)],
        ['Prioridade', getPriorityLabel(project.priority)],
        ['Progresso', `${project.progress}%`],
        ['Data de Início', formatDate(project.startDate)],
        ['Data de Fim', formatDate(project.endDate)],
        ['Orçamento', project.budget ? `R$ ${project.budget.toFixed(2)}` : 'N/A']
      ];

      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Informações Gerais');
    }

    // Planilha 2: Cronograma
    if (exportOptions.includeTimeline && project.timeline?.phases) {
      const timelineData = [
        ['CRONOGRAMA DO PROJETO'],
        [''],
        ['Fase', 'Tarefas', 'Status', 'Progresso', 'Data Início', 'Data Fim']
      ];

      project.timeline.phases.forEach((phase: any) => {
        const taskCount = phase.tasks?.length || 0;
        const completedTasks = phase.tasks?.filter((t: any) => t.status === 'completed').length || 0;
        const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
        
        timelineData.push([
          phase.name,
          `${taskCount} tarefas`,
          getPhaseStatusLabel(phase.status),
          `${progress}%`,
          formatDate(phase.startDate),
          formatDate(phase.endDate)
        ]);
      });

      const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData);
      XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Cronograma');
    }

    // Planilha 3: Equipe
    if (exportOptions.includeTeam && project.members) {
      const teamData = [
        ['EQUIPE DO PROJETO'],
        [''],
        ['Nome', 'Email', 'Função', 'Status', 'Data de Entrada']
      ];

      project.members.forEach((member: any) => {
        teamData.push([
          member.user?.name || 'N/A',
          member.user?.email || 'N/A',
          member.role || 'N/A',
          member.isActive ? 'Ativo' : 'Inativo',
          formatDate(member.createdAt)
        ]);
      });

      const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
      XLSX.utils.book_append_sheet(workbook, teamSheet, 'Equipe');
    }

    // Planilha 4: Atividades
    if (exportOptions.includeActivities && project.activities) {
      const activitiesData = [
        ['HISTÓRICO DE ATIVIDADES'],
        [''],
        ['Data', 'Ação', 'Item', 'Usuário', 'Detalhes']
      ];

      project.activities.forEach((activity: any) => {
        activitiesData.push([
          formatDate(activity.timestamp),
          activity.action,
          activity.itemName,
          activity.user || 'Sistema',
          JSON.stringify(activity.details || {})
        ]);
      });

      const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
      XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Atividades');
    }

    // Download
    const fileName = `projeto_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const addSectionToPDF = (doc: jsPDF, title: string, yPosition: number, margin: number, contentWidth: number) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(66, 139, 202);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
    
    doc.text(title, margin, yPosition);
    return yPosition + 10;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Ativo',
      'paused': 'Pausado',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'urgent': 'Urgente',
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa'
    };
    return priorityMap[priority] || priority;
  };

  const getPhaseStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'active': 'Ativa',
      'completed': 'Concluída'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const handleOptionChange = (option: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [option]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Exportar Projeto
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary">
          {project?.name}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Configurações de Formato */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Formato e Configurações
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Formato de Exportação</InputLabel>
                  <Select
                    value={exportOptions.format}
                    onChange={(e) => handleOptionChange('format', e.target.value)}
                    label="Formato de Exportação"
                  >
                    <MenuItem value="pdf">
                      <PdfIcon sx={{ mr: 1 }} />
                      PDF
                    </MenuItem>
                    <MenuItem value="excel">
                      <ExcelIcon sx={{ mr: 1 }} />
                      Excel
                    </MenuItem>
                  </Select>
                </FormControl>

                {exportOptions.format === 'pdf' && (
                  <>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Orientação</InputLabel>
                      <Select
                        value={exportOptions.orientation}
                        onChange={(e) => handleOptionChange('orientation', e.target.value)}
                        label="Orientação"
                      >
                        <MenuItem value="portrait">Retrato</MenuItem>
                        <MenuItem value="landscape">Paisagem</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Tamanho da Página</InputLabel>
                      <Select
                        value={exportOptions.pageSize}
                        onChange={(e) => handleOptionChange('pageSize', e.target.value)}
                        label="Tamanho da Página"
                      >
                        <MenuItem value="a4">A4</MenuItem>
                        <MenuItem value="a3">A3</MenuItem>
                        <MenuItem value="letter">Carta</MenuItem>
                      </Select>
                    </FormControl>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Opções de Conteúdo */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Conteúdo a Incluir
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeOverview}
                      onChange={(e) => handleOptionChange('includeOverview', e.target.checked)}
                    />
                  }
                  label="Informações Gerais"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeTimeline}
                      onChange={(e) => handleOptionChange('includeTimeline', e.target.checked)}
                    />
                  }
                  label="Cronograma e Tarefas"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeTeam}
                      onChange={(e) => handleOptionChange('includeTeam', e.target.checked)}
                    />
                  }
                  label="Equipe do Projeto"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeStakeholders}
                      onChange={(e) => handleOptionChange('includeStakeholders', e.target.checked)}
                    />
                  }
                  label="Stakeholders"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeActivities}
                      onChange={(e) => handleOptionChange('includeActivities', e.target.checked)}
                    />
                  }
                  label="Histórico de Atividades"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeGantt}
                      onChange={(e) => handleOptionChange('includeGantt', e.target.checked)}
                    />
                  }
                  label="Gráfico Gantt (PDF apenas)"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Progresso */}
        {exporting && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              Exportando projeto... {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {/* Preview do que será exportado */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resumo da Exportação
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            <Chip 
              label={`Formato: ${exportOptions.format.toUpperCase()}`} 
              color="primary" 
              variant="outlined" 
            />
            {exportOptions.format === 'pdf' && (
              <Chip 
                label={`Orientação: ${exportOptions.orientation === 'portrait' ? 'Retrato' : 'Paisagem'}`} 
                color="secondary" 
                variant="outlined" 
              />
            )}
            {exportOptions.includeOverview && <Chip label="Informações Gerais" color="success" />}
            {exportOptions.includeTimeline && <Chip label="Cronograma" color="success" />}
            {exportOptions.includeTeam && <Chip label="Equipe" color="success" />}
            {exportOptions.includeStakeholders && <Chip label="Stakeholders" color="success" />}
            {exportOptions.includeActivities && <Chip label="Atividades" color="success" />}
            {exportOptions.includeGantt && <Chip label="Gantt" color="success" />}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={exporting}>
          Cancelar
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={exporting}
          startIcon={exportOptions.format === 'pdf' ? <PdfIcon /> : <ExcelIcon />}
        >
          {exporting ? 'Exportando...' : `Exportar em ${exportOptions.format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportProjectModal;
