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
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormGroup
} from '@mui/material';
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  budget?: number;
  manager?: any;
  members?: any[];
  timeline?: any;
  activities?: any[];
}

interface ExportProjectsModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  appliedFilters: {
    searchTerm: string;
    statusFilter: string;
    priorityFilter: string;
    viewMode: string;
  };
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeOverview: boolean;
  includeProjectsList: boolean;
  includeProjectsDetails: boolean;
  includeTeamInfo: boolean;
  includeTimeline: boolean;
  includeActivities: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'a3' | 'letter';
  groupBy: 'none' | 'status' | 'priority' | 'manager';
  includeCharts: boolean;
}

const ExportProjectsModal: React.FC<ExportProjectsModalProps> = ({
  open,
  onClose,
  projects,
  appliedFilters
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeOverview: true,
    includeProjectsList: true,
    includeProjectsDetails: false,
    includeTeamInfo: false,
    includeTimeline: false,
    includeActivities: false,
    orientation: 'portrait',
    pageSize: 'a4',
    groupBy: 'status',
    includeCharts: false
  });

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    if (!projects || projects.length === 0) {
      setError('Nenhum projeto disponível para exportação.');
      return;
    }

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

      setSuccess(`${projects.length} projetos exportados com sucesso em ${exportOptions.format.toUpperCase()}!`);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setError('Erro ao exportar projetos. Tente novamente.');
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
    doc.text('RELATÓRIO DE PROJETOS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumo dos filtros aplicados
    if (appliedFilters.searchTerm || appliedFilters.statusFilter !== 'all' || appliedFilters.priorityFilter !== 'all') {
      yPosition = addSectionToPDF(doc, 'FILTROS APLICADOS', yPosition, margin, contentWidth);
      
      const filterData = [['Filtro', 'Valor']];
      if (appliedFilters.searchTerm) filterData.push(['Busca', appliedFilters.searchTerm]);
      if (appliedFilters.statusFilter !== 'all') filterData.push(['Status', getStatusLabel(appliedFilters.statusFilter)]);
      if (appliedFilters.priorityFilter !== 'all') filterData.push(['Prioridade', getPriorityLabel(appliedFilters.priorityFilter)]);
      filterData.push(['Visualização', appliedFilters.viewMode]);
      filterData.push(['Total de Projetos', projects.length.toString()]);

      autoTable(doc, {
        startY: yPosition,
        head: [filterData[0]],
        body: filterData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Visão geral
    if (exportOptions.includeOverview) {
      yPosition = addSectionToPDF(doc, 'VISÃO GERAL', yPosition, margin, contentWidth);
      
      const overviewData = [
        ['Métrica', 'Valor'],
        ['Total de Projetos', projects.length.toString()],
        ['Projetos Ativos', projects.filter(p => p.status === 'active').length.toString()],
        ['Projetos Pausados', projects.filter(p => p.status === 'paused').length.toString()],
        ['Projetos Concluídos', projects.filter(p => p.status === 'completed').length.toString()],
        ['Projetos Cancelados', projects.filter(p => p.status === 'cancelled').length.toString()],
        ['Projetos de Alta Prioridade', projects.filter(p => p.priority === 'high' || p.priority === 'urgent').length.toString()],
        ['Progresso Médio', `${Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%`]
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

    // Lista de projetos
    if (exportOptions.includeProjectsList) {
      yPosition = addSectionToPDF(doc, 'LISTA DE PROJETOS', yPosition, margin, contentWidth);
      
      const projectsData = [['Nome', 'Status', 'Prioridade', 'Progresso', 'Data Início', 'Data Fim']];
      
      // Agrupar projetos se necessário
      let projectsToExport = [...projects];
      if (exportOptions.groupBy !== 'none') {
        projectsToExport.sort((a, b) => {
          switch (exportOptions.groupBy) {
            case 'status':
              return a.status.localeCompare(b.status);
            case 'priority':
              return a.priority.localeCompare(b.priority);
            case 'manager':
              return (a.manager?.name || '').localeCompare(b.manager?.name || '');
            default:
              return 0;
          }
        });
      }

      projectsToExport.forEach(project => {
        projectsData.push([
          project.name,
          getStatusLabel(project.status),
          getPriorityLabel(project.priority),
          `${project.progress}%`,
          formatDate(project.startDate),
          formatDate(project.endDate)
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [projectsData[0]],
        body: projectsData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalhes dos projetos (se solicitado)
    if (exportOptions.includeProjectsDetails) {
      yPosition = addSectionToPDF(doc, 'DETALHES DOS PROJETOS', yPosition, margin, contentWidth);
      
      projects.forEach((project, index) => {
        if (yPosition > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${project.name}`, margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (project.description) {
          const description = doc.splitTextToSize(project.description, contentWidth - 10);
          doc.text(description, margin + 5, yPosition);
          yPosition += description.length * 4;
        }

        const projectDetails = [
          ['Status:', getStatusLabel(project.status)],
          ['Prioridade:', getPriorityLabel(project.priority)],
          ['Progresso:', `${project.progress}%`],
          ['Data Início:', formatDate(project.startDate)],
          ['Data Fim:', formatDate(project.endDate)]
        ];

        projectDetails.forEach(([label, value]) => {
          doc.text(`${label} ${value}`, margin + 5, yPosition);
          yPosition += 5;
        });

        yPosition += 10;
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
    const fileName = `projetos_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new();

    // Planilha 1: Resumo
    if (exportOptions.includeOverview) {
      const summaryData = [
        ['RELATÓRIO DE PROJETOS'],
        [''],
        ['Métrica', 'Valor'],
        ['Total de Projetos', projects.length],
        ['Projetos Ativos', projects.filter(p => p.status === 'active').length],
        ['Projetos Pausados', projects.filter(p => p.status === 'paused').length],
        ['Projetos Concluídos', projects.filter(p => p.status === 'completed').length],
        ['Projetos Cancelados', projects.filter(p => p.status === 'cancelled').length],
        ['Projetos de Alta Prioridade', projects.filter(p => p.priority === 'high' || p.priority === 'urgent').length],
        ['Progresso Médio', `${Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%`],
        [''],
        ['Filtros Aplicados'],
        ['Busca', appliedFilters.searchTerm || 'Nenhuma'],
        ['Status', appliedFilters.statusFilter !== 'all' ? getStatusLabel(appliedFilters.statusFilter) : 'Todos'],
        ['Prioridade', appliedFilters.priorityFilter !== 'all' ? getPriorityLabel(appliedFilters.priorityFilter) : 'Todas'],
        ['Visualização', appliedFilters.viewMode]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    }

    // Planilha 2: Lista de Projetos
    if (exportOptions.includeProjectsList) {
      const projectsData = [
        ['LISTA DE PROJETOS'],
        [''],
        ['Nome', 'Status', 'Prioridade', 'Progresso', 'Data Início', 'Data Fim', 'Orçamento', 'Gerente', 'Descrição']
      ];

      projects.forEach(project => {
        projectsData.push([
          project.name,
          getStatusLabel(project.status),
          getPriorityLabel(project.priority),
          `${project.progress}%`,
          formatDate(project.startDate),
          formatDate(project.endDate),
          project.budget ? `R$ ${project.budget.toFixed(2)}` : 'N/A',
          project.manager?.name || 'N/A',
          project.description || 'N/A'
        ]);
      });

      const projectsSheet = XLSX.utils.aoa_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projetos');
    }

    // Planilha 3: Análise por Status
    if (exportOptions.groupBy === 'status') {
      const statusAnalysis = [
        ['ANÁLISE POR STATUS'],
        [''],
        ['Status', 'Quantidade', 'Progresso Médio', 'Orçamento Total']
      ];

      const statusGroups = projects.reduce((acc, project) => {
        if (!acc[project.status]) {
          acc[project.status] = { count: 0, progress: 0, budget: 0 };
        }
        acc[project.status].count++;
        acc[project.status].progress += project.progress;
        acc[project.status].budget += project.budget || 0;
        return acc;
      }, {} as any);

      Object.entries(statusGroups).forEach(([status, data]: [string, any]) => {
        statusAnalysis.push([
          getStatusLabel(status),
          data.count.toString(),
          `${Math.round(data.progress / data.count)}%`,
          `R$ ${data.budget.toFixed(2)}`
        ]);
      });

      const statusSheet = XLSX.utils.aoa_to_sheet(statusAnalysis);
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Análise por Status');
    }

    // Planilha 4: Análise por Prioridade
    if (exportOptions.groupBy === 'priority') {
      const priorityAnalysis = [
        ['ANÁLISE POR PRIORIDADE'],
        [''],
        ['Prioridade', 'Quantidade', 'Progresso Médio', 'Orçamento Total']
      ];

      const priorityGroups = projects.reduce((acc, project) => {
        if (!acc[project.priority]) {
          acc[project.priority] = { count: 0, progress: 0, budget: 0 };
        }
        acc[project.priority].count++;
        acc[project.priority].progress += project.progress;
        acc[project.priority].budget += project.budget || 0;
        return acc;
      }, {} as any);

      Object.entries(priorityGroups).forEach(([priority, data]: [string, any]) => {
        priorityAnalysis.push([
          getPriorityLabel(priority),
          data.count.toString(),
          `${Math.round(data.progress / data.count)}%`,
          `R$ ${data.budget.toFixed(2)}`
        ]);
      });

      const prioritySheet = XLSX.utils.aoa_to_sheet(priorityAnalysis);
      XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Análise por Prioridade');
    }

    // Download
    const fileName = `projetos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const addSectionToPDF = (doc: jsPDF, title: string, yPosition: number, margin: number, contentWidth: number) => {
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

  const formatDate = (dateString?: string) => {
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Exportar Projetos
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary">
          {projects.length} projetos encontrados
          {appliedFilters.searchTerm && ` • Busca: "${appliedFilters.searchTerm}"`}
          {appliedFilters.statusFilter !== 'all' && ` • Status: ${getStatusLabel(appliedFilters.statusFilter)}`}
          {appliedFilters.priorityFilter !== 'all' && ` • Prioridade: ${getPriorityLabel(appliedFilters.priorityFilter)}`}
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

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Agrupar por</InputLabel>
                  <Select
                    value={exportOptions.groupBy}
                    onChange={(e) => handleOptionChange('groupBy', e.target.value)}
                    label="Agrupar por"
                  >
                    <MenuItem value="none">Nenhum agrupamento</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="priority">Prioridade</MenuItem>
                    <MenuItem value="manager">Gerente</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Opções de Conteúdo */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Conteúdo a Incluir
                </Typography>
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeOverview}
                        onChange={(e) => handleOptionChange('includeOverview', e.target.checked)}
                      />
                    }
                    label="Visão Geral e Estatísticas"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeProjectsList}
                        onChange={(e) => handleOptionChange('includeProjectsList', e.target.checked)}
                      />
                    }
                    label="Lista de Projetos"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeProjectsDetails}
                        onChange={(e) => handleOptionChange('includeProjectsDetails', e.target.checked)}
                      />
                    }
                    label="Detalhes dos Projetos (PDF apenas)"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeTeamInfo}
                        onChange={(e) => handleOptionChange('includeTeamInfo', e.target.checked)}
                      />
                    }
                    label="Informações da Equipe"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeTimeline}
                        onChange={(e) => handleOptionChange('includeTimeline', e.target.checked)}
                      />
                    }
                    label="Cronogramas"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeCharts}
                        onChange={(e) => handleOptionChange('includeCharts', e.target.checked)}
                      />
                    }
                    label="Gráficos e Análises"
                  />
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Preview dos dados */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Preview dos Dados
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Progresso</TableCell>
                  <TableCell>Data Início</TableCell>
                  <TableCell>Data Fim</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.slice(0, 5).map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>{project.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(project.status)} 
                        size="small" 
                        color={project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getPriorityLabel(project.priority)} 
                        size="small" 
                        color={project.priority === 'urgent' ? 'error' : project.priority === 'high' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{project.progress}%</TableCell>
                    <TableCell>{formatDate(project.startDate)}</TableCell>
                    <TableCell>{formatDate(project.endDate)}</TableCell>
                  </TableRow>
                ))}
                {projects.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        ... e mais {projects.length - 5} projetos
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Progresso */}
        {exporting && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              Exportando {projects.length} projetos... {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {/* Resumo da exportação */}
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
            <Chip 
              label={`Projetos: ${projects.length}`} 
              color="secondary" 
              variant="outlined" 
            />
            {exportOptions.groupBy !== 'none' && (
              <Chip 
                label={`Agrupado por: ${exportOptions.groupBy === 'status' ? 'Status' : exportOptions.groupBy === 'priority' ? 'Prioridade' : 'Gerente'}`} 
                color="info" 
                variant="outlined" 
              />
            )}
            {exportOptions.includeOverview && <Chip label="Visão Geral" color="success" />}
            {exportOptions.includeProjectsList && <Chip label="Lista de Projetos" color="success" />}
            {exportOptions.includeProjectsDetails && <Chip label="Detalhes" color="success" />}
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
          disabled={exporting || projects.length === 0}
          startIcon={exportOptions.format === 'pdf' ? <PdfIcon /> : <ExcelIcon />}
        >
          {exporting ? 'Exportando...' : `Exportar ${projects.length} Projetos em ${exportOptions.format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportProjectsModal;
