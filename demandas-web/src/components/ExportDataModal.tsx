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

interface ExportDataModalProps {
  open: boolean;
  onClose: () => void;
  data: any[];
  moduleName: string;
  moduleTitle: string;
  appliedFilters?: any;
  columns?: {
    key: string;
    label: string;
    width?: number;
  }[];
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeOverview: boolean;
  includeDataList: boolean;
  includeDetails: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'a3' | 'letter';
  groupBy?: string;
}

const ExportDataModal: React.FC<ExportDataModalProps> = ({
  open,
  onClose,
  data,
  moduleName,
  moduleTitle,
  appliedFilters = {},
  columns = []
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeOverview: true,
    includeDataList: true,
    includeDetails: false,
    orientation: 'portrait',
    pageSize: 'a4'
  });

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    if (!data || data.length === 0) {
      setError('Nenhum dado disponível para exportação.');
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

      setSuccess(`${data.length} registros exportados com sucesso em ${exportOptions.format.toUpperCase()}!`);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setError('Erro ao exportar dados. Tente novamente.');
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
    doc.text(`RELATÓRIO DE ${moduleTitle.toUpperCase()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumo dos filtros aplicados
    if (Object.keys(appliedFilters).length > 0) {
      yPosition = addSectionToPDF(doc, 'FILTROS APLICADOS', yPosition, margin, contentWidth);
      
      const filterData = [['Filtro', 'Valor']];
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          filterData.push([key, String(value)]);
        }
      });
      filterData.push(['Total de Registros', data.length.toString()]);

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
        ['Total de Registros', data.length.toString()],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
        ['Módulo', moduleTitle]
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

    // Lista de dados
    if (exportOptions.includeDataList && columns.length > 0) {
      yPosition = addSectionToPDF(doc, 'LISTA DE REGISTROS', yPosition, margin, contentWidth);
      
      const headers = columns.map(col => col.label);
      const tableData = [headers];

      data.forEach(item => {
        const row = columns.map(col => {
          const value = item[col.key];
          if (value === null || value === undefined) return 'N/A';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        });
        tableData.push(row);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalhes dos registros (se solicitado)
    if (exportOptions.includeDetails) {
      yPosition = addSectionToPDF(doc, 'DETALHES DOS REGISTROS', yPosition, margin, contentWidth);
      
      data.forEach((item, index) => {
        if (yPosition > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. Registro ${index + 1}`, margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        columns.forEach(col => {
          const value = item[col.key];
          const displayValue = value === null || value === undefined ? 'N/A' : 
                             typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          doc.text(`${col.label}: ${displayValue}`, margin + 5, yPosition);
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
    const fileName = `${moduleName}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new();

    // Planilha 1: Resumo
    if (exportOptions.includeOverview) {
      const summaryData = [
        [`RELATÓRIO DE ${moduleTitle.toUpperCase()}`],
        [''],
        ['Métrica', 'Valor'],
        ['Total de Registros', data.length],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
        ['Módulo', moduleTitle],
        [''],
        ['Filtros Aplicados']
      ];

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          summaryData.push([key, String(value)]);
        }
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    }

    // Planilha 2: Lista de Dados
    if (exportOptions.includeDataList && columns.length > 0) {
      const dataList = [
        [`LISTA DE ${moduleTitle.toUpperCase()}`],
        [''],
        columns.map(col => col.label)
      ];

      data.forEach(item => {
        const row = columns.map(col => {
          const value = item[col.key];
          if (value === null || value === undefined) return 'N/A';
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        });
        dataList.push(row);
      });

      const dataSheet = XLSX.utils.aoa_to_sheet(dataList);
      XLSX.utils.book_append_sheet(workbook, dataSheet, moduleTitle);
    }

    // Download
    const fileName = `${moduleName}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleOptionChange = (option: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [option]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Exportar {moduleTitle}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary">
          {data.length} registros encontrados
          {Object.keys(appliedFilters).length > 0 && ' • Filtros aplicados'}
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
                        checked={exportOptions.includeDataList}
                        onChange={(e) => handleOptionChange('includeDataList', e.target.checked)}
                      />
                    }
                    label="Lista de Registros"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeDetails}
                        onChange={(e) => handleOptionChange('includeDetails', e.target.checked)}
                      />
                    }
                    label="Detalhes dos Registros (PDF apenas)"
                  />
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Preview dos dados */}
        {columns.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Preview dos Dados
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map((col, index) => (
                      <TableCell key={index}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 5).map((item, index) => (
                    <TableRow key={index}>
                      {columns.map((col, colIndex) => (
                        <TableCell key={colIndex}>
                          {item[col.key] !== null && item[col.key] !== undefined 
                            ? String(item[col.key]) 
                            : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {data.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        <Typography variant="body2" color="textSecondary">
                          ... e mais {data.length - 5} registros
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Progresso */}
        {exporting && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              Exportando {data.length} registros... {progress}%
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
              label={`Registros: ${data.length}`} 
              color="secondary" 
              variant="outlined" 
            />
            <Chip 
              label={`Módulo: ${moduleTitle}`} 
              color="info" 
              variant="outlined" 
            />
            {exportOptions.includeOverview && <Chip label="Visão Geral" color="success" />}
            {exportOptions.includeDataList && <Chip label="Lista de Registros" color="success" />}
            {exportOptions.includeDetails && <Chip label="Detalhes" color="success" />}
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
          disabled={exporting || data.length === 0}
          startIcon={exportOptions.format === 'pdf' ? <PdfIcon /> : <ExcelIcon />}
        >
          {exporting ? 'Exportando...' : `Exportar ${data.length} Registros em ${exportOptions.format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDataModal;
