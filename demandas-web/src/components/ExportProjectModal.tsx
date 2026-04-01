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
  RadioGroup,
  Radio,
  FormLabel
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
import html2canvas from 'html2canvas';
import ProjectGantt from './ProjectGantt';

// Paleta institucional (NIG/Nexus)
const PDF_COLORS = {
  primary: [0, 37, 97] as const, // #002561
  secondary: [5, 0, 50] as const, // #050032
  cyan: [0, 159, 223] as const, // #009FDF
  apoio100: [220, 223, 227] as const, // #DCDFE3
  apoio300: [163, 181, 188] as const, // #A3B5BC
  textDark: [5, 0, 50] as const,
  textMuted: [107, 122, 128] as const, // #6b7a80
  white: [255, 255, 255] as const,
} as const;

const PDF_FOOTER_LINE = 'NIG - Núcleo de Inteligência e Governança - Diretoria Técnica Benefícios';

/** Nível de detalhe do cronograma na exportação */
export type TimelineExportDetail = 'phases_only' | 'with_tasks_and_subtasks';

interface ExportProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
  /** Membros internos (GET projeto/membros) — `project.members` costuma estar vazio na API */
  teamInternal?: any[];
  /** Membros externos */
  teamExternal?: any[];
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeOverview: boolean;
  includeTimeline: boolean;
  /** Só fases resumidas vs. fases + cada tarefa e subtarefa */
  timelineDetail: TimelineExportDetail;
  includeTeam: boolean;
  includeStakeholders: boolean;
  includeActivities: boolean;
  includeGantt: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'a3' | 'letter';
}

function parseJsonArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeActivities(project: any): any[] {
  return parseJsonArray(project?.activities);
}

function buildTeamExportRows(project: any, teamInternal?: any[], teamExternal?: any[]) {
  const internal = Array.isArray(teamInternal) ? teamInternal : [];
  const external = Array.isArray(teamExternal) ? teamExternal : [];
  const rows: { tipo: string; name: string; email: string; roleOrExtra: string; status: string; joinedAt: string }[] = [];

  internal.forEach((member: any) => {
    rows.push({
      tipo: 'Interno',
      name: member?.user?.name || member?.name || 'N/A',
      email: member?.user?.email || member?.email || 'N/A',
      roleOrExtra: member?.role || 'N/A',
      status: member?.isActive === false ? 'Inativo' : 'Ativo',
      joinedAt: member?.createdAt || member?.joinedAt || ''
    });
  });

  external.forEach((member: any) => {
    const company = member?.company ? String(member.company) : '';
    const role = member?.role ? String(member.role) : '';
    rows.push({
      tipo: 'Externo',
      name: member?.name || 'N/A',
      email: member?.email || 'N/A',
      roleOrExtra: [role, company].filter(Boolean).join(' • ') || 'N/A',
      status: member?.isActive === false ? 'Inativo' : 'Ativo',
      joinedAt: member?.createdAt || member?.joinedAt || ''
    });
  });

  if (rows.length === 0 && Array.isArray(project?.members)) {
    project.members.forEach((member: any) => {
      rows.push({
        tipo: 'Membro',
        name: member?.user?.name || member?.name || 'N/A',
        email: member?.user?.email || member?.email || 'N/A',
        roleOrExtra: member?.role || 'N/A',
        status: member?.isActive === false ? 'Inativo' : 'Ativo',
        joinedAt: member?.createdAt || ''
      });
    });
  }

  return rows;
}

function taskCompleted(t: any) {
  const s = t?.status;
  return s === 'completed' || s === 'done';
}

function taskName(t: any) {
  return (t?.name || t?.title || '—').trim() || '—';
}

function subtaskName(s: any) {
  return (s?.title || s?.name || '—').trim() || '—';
}

const ExportProjectModal: React.FC<ExportProjectModalProps> = ({
  open,
  onClose,
  project,
  teamInternal,
  teamExternal
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeOverview: true,
    includeTimeline: true,
    timelineDetail: 'phases_only',
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
      setError(error instanceof Error && error.message ? error.message : 'Erro ao exportar projeto. Tente novamente.');
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const addCanvasToPdfPages = (doc: jsPDF, canvas: HTMLCanvasElement, margin: number, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const contentWidthMm = pageWidth - margin * 2;
    const contentHeightMm = pageHeight - margin * 2;

    // pixels por mm ao encaixar na largura
    const pxPerMm = canvas.width / contentWidthMm;
    const sliceHeightPx = Math.floor(contentHeightMm * pxPerMm);

    let offsetY = 0;
    let firstPage = true;

    while (offsetY < canvas.height) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - offsetY);

      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível preparar o canvas do Gantt para exportação.');
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);

      const imgData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceCanvas.height / pxPerMm;

      if (!firstPage) doc.addPage();
      const y = firstPage ? startY : margin;
      const availableHeightMm = pageHeight - margin - y;
      const h = Math.min(sliceHeightMm, availableHeightMm);
      doc.addImage(imgData, 'PNG', margin, y, contentWidthMm, h);

      firstPage = false;
      offsetY += sliceCanvas.height;
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: exportOptions.orientation,
      unit: 'mm',
      format: exportOptions.pageSize
    });

    const isOnlyGantt =
      exportOptions.includeGantt &&
      !exportOptions.includeOverview &&
      !exportOptions.includeTimeline &&
      !exportOptions.includeTeam &&
      !exportOptions.includeStakeholders &&
      !exportOptions.includeActivities;

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Se o usuário pediu apenas o Gantt, não gerar página inicial com cabeçalho do relatório.
    if (!isOnlyGantt) {
      // Cabeçalho
      const headerHeight = 26;
      doc.setFillColor(...PDF_COLORS.primary);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      doc.setTextColor(...PDF_COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('RELATÓRIO DO PROJETO', margin, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const projectTitle = String(project.name || '').trim() || 'Projeto';
      doc.text(projectTitle, margin, 22);

      // Voltar para cor de texto padrão
      doc.setTextColor(...PDF_COLORS.textDark);
      yPosition = headerHeight + 14;
      setProgress(10);
    } else {
      setProgress(10);
    }

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
        styles: {
          fontSize: 9.5,
          textColor: PDF_COLORS.textDark,
          lineColor: PDF_COLORS.apoio100,
          lineWidth: 0.2,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: PDF_COLORS.primary,
          textColor: PDF_COLORS.white,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 246, 247],
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
    setProgress(30);

    // Timeline
    if (exportOptions.includeTimeline && project.timeline?.phases) {
      yPosition = addSectionToPDF(doc, 'CRONOGRAMA', yPosition, margin, contentWidth);

      if (exportOptions.timelineDetail === 'phases_only') {
        const timelineData = [['Fase', 'Tarefas', 'Status', 'Progresso']];
        project.timeline.phases.forEach((phase: any) => {
          const taskCount = phase.tasks?.length || 0;
          const completedTasks = phase.tasks?.filter((t: any) => taskCompleted(t)).length || 0;
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
          styles: {
            fontSize: 9,
            textColor: PDF_COLORS.textDark,
            lineColor: PDF_COLORS.apoio100,
            lineWidth: 0.2,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: PDF_COLORS.white,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 246, 247],
          },
        });
      } else {
        const timelineData = [
          ['Nível', 'Descrição', 'Status', 'Início', 'Fim prev.', 'Responsável', 'Progresso']
        ];
        project.timeline.phases.forEach((phase: any) => {
          const taskCount = phase.tasks?.length || 0;
          const completedTasks = phase.tasks?.filter((t: any) => taskCompleted(t)).length || 0;
          const phaseProgress =
            typeof phase.progress === 'number'
              ? `${phase.progress}%`
              : taskCount > 0
                ? `${Math.round((completedTasks / taskCount) * 100)}%`
                : '—';

          timelineData.push([
            'Fase',
            phase.name || '—',
            getPhaseStatusLabel(phase.status),
            formatDate(phase.startDate),
            formatDate(phase.endDate),
            '—',
            phaseProgress
          ]);

          (phase.tasks || []).forEach((task: any) => {
            timelineData.push([
              'Tarefa',
              `  ${taskName(task)}`,
              getTaskStatusLabel(task.status),
              formatDate(task.startDate),
              formatDate(task.plannedEndDate || task.dueDate),
              task.responsible || task.assignee || '—',
              typeof task.progress === 'number' ? `${task.progress}%` : '—'
            ]);
            (task.subtasks || []).forEach((sub: any) => {
              timelineData.push([
                'Subtarefa',
                `    ${subtaskName(sub)}`,
                getTaskStatusLabel(sub.status),
                formatDate(sub.startDate),
                formatDate(sub.dueDate || sub.plannedEndDate),
                sub.assignee || sub.responsible || '—',
                typeof sub.progress === 'number' ? `${sub.progress}%` : '—'
              ]);
            });
          });
        });

        autoTable(doc, {
          startY: yPosition,
          head: [timelineData[0]],
          body: timelineData.slice(1),
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            textColor: PDF_COLORS.textDark,
            lineColor: PDF_COLORS.apoio100,
            lineWidth: 0.2,
            cellPadding: 2.5,
          },
          headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: PDF_COLORS.white,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 246, 247],
          },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 'auto' },
          },
        });
      }

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
    setProgress(45);

    // Equipe (API: membros internos/externos; fallback: project.members)
    if (exportOptions.includeTeam) {
      const teamRows = buildTeamExportRows(project, teamInternal, teamExternal);
      yPosition = addSectionToPDF(doc, 'EQUIPE DO PROJETO', yPosition, margin, contentWidth);

      const teamData = [['Tipo', 'Nome', 'Email', 'Função / Empresa', 'Status']];
      if (teamRows.length === 0) {
        teamData.push(['—', 'Nenhum membro cadastrado', '—', '—', '—']);
      } else {
        teamRows.forEach((row) => {
          teamData.push([row.tipo, row.name, row.email, row.roleOrExtra, row.status]);
        });
      }

      autoTable(doc, {
        startY: yPosition,
        head: [teamData[0]],
        body: teamData.slice(1),
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 9,
          textColor: PDF_COLORS.textDark,
          lineColor: PDF_COLORS.apoio100,
          lineWidth: 0.2,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: PDF_COLORS.primary,
          textColor: PDF_COLORS.white,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 246, 247],
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
    setProgress(60);

    // Atividades (normaliza JSON string; mesma estrutura do Detail: action, itemType, itemName, timestamp, user)
    if (exportOptions.includeActivities) {
      const activities = normalizeActivities(project);
      yPosition = addSectionToPDF(doc, 'HISTÓRICO DE ATIVIDADES', yPosition, margin, contentWidth);

      const activitiesData = [['Data/Hora', 'Ação', 'Tipo', 'Item', 'Usuário']];
      const slice = activities.slice(0, 50);
      if (slice.length === 0) {
        activitiesData.push(['—', 'Nenhuma atividade registrada neste projeto', '—', '—', '—']);
      } else {
        slice.forEach((activity: any) => {
          const ts = activity?.timestamp;
          let when = 'N/A';
          if (ts) {
            try {
              when = new Date(ts).toLocaleString('pt-BR');
            } catch {
              when = formatDate(ts);
            }
          }
          activitiesData.push([
            when,
            String(activity?.action ?? '—'),
            String(activity?.itemType ?? '—'),
            String(activity?.itemName ?? '—'),
            String(activity?.user ?? 'Sistema')
          ]);
        });
      }

      autoTable(doc, {
        startY: yPosition,
        head: [activitiesData[0]],
        body: activitiesData.slice(1),
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8.5,
          textColor: PDF_COLORS.textDark,
          lineColor: PDF_COLORS.apoio100,
          lineWidth: 0.2,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: PDF_COLORS.primary,
          textColor: PDF_COLORS.white,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 246, 247],
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
    setProgress(75);

    // Gantt (captura do DOM) — renderizado offscreen para não depender da aba Gantt estar aberta
    if (exportOptions.includeGantt) {
      const ganttEl = document.getElementById('project-gantt-export');
      if (!ganttEl) {
        throw new Error('Não foi possível preparar o gráfico de Gantt para exportação. Atualize a página e tente novamente.');
      }

      // Quando não for "somente Gantt", criar uma nova página para ele.
      // Se for "somente Gantt", usamos a primeira página para evitar página vazia.
      if (!isOnlyGantt) {
        doc.addPage();
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.secondary);
      doc.text('GRÁFICO DE GANTT', margin, 18);
      // linha de destaque (ciano) abaixo do título
      doc.setDrawColor(...PDF_COLORS.cyan);
      doc.setLineWidth(0.6);
      doc.line(margin, 20, margin + 55, 20);
      doc.setTextColor(...PDF_COLORS.textDark);

      // Renderizar Gantt em canvas
      const canvas = await html2canvas(ganttEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Evita pegar posição de scroll atual como offset
        scrollX: 0,
        scrollY: -window.scrollY
      });

      addCanvasToPdfPages(doc, canvas, margin, 24);
      setProgress(90);
    }

    // Rodapé (não aplicar quando for apenas Gantt para manter o gráfico mais "limpo")
    if (!isOnlyGantt) {
      const pageCount = doc.getNumberOfPages();
      const generatedAt = new Date().toLocaleDateString('pt-BR');
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.textMuted);
        doc.text(PDF_FOOTER_LINE, pageWidth / 2, pageHeight - 14, { align: 'center' });

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.textMuted);
        doc.text(
          `Página ${i} de ${pageCount} - Gerado em ${generatedAt}`,
          pageWidth / 2,
          pageHeight - 9,
          { align: 'center' }
        );
      }
      setProgress(98);
    }

    // Download
    const fileName = `projeto_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    setProgress(100);
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
      const timelineData: (string | number)[][] =
        exportOptions.timelineDetail === 'phases_only'
          ? [
              ['CRONOGRAMA DO PROJETO'],
              [''],
              ['Fase', 'Tarefas', 'Status', 'Progresso', 'Data Início', 'Data Fim']
            ]
          : [
              ['CRONOGRAMA DO PROJETO (Fases, tarefas e subtarefas)'],
              [''],
              ['Nível', 'Descrição', 'Status', 'Início', 'Fim prev.', 'Responsável', 'Progresso %']
            ];

      if (exportOptions.timelineDetail === 'phases_only') {
        project.timeline.phases.forEach((phase: any) => {
          const taskCount = phase.tasks?.length || 0;
          const completedTasks = phase.tasks?.filter((t: any) => taskCompleted(t)).length || 0;
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
      } else {
        project.timeline.phases.forEach((phase: any) => {
          const taskCount = phase.tasks?.length || 0;
          const completedTasks = phase.tasks?.filter((t: any) => taskCompleted(t)).length || 0;
          const phaseProgress =
            typeof phase.progress === 'number'
              ? phase.progress
              : taskCount > 0
                ? Math.round((completedTasks / taskCount) * 100)
                : '';

          timelineData.push([
            'Fase',
            phase.name || '—',
            getPhaseStatusLabel(phase.status),
            formatDate(phase.startDate),
            formatDate(phase.endDate),
            '—',
            phaseProgress === '' ? '—' : phaseProgress
          ]);

          (phase.tasks || []).forEach((task: any) => {
            timelineData.push([
              'Tarefa',
              taskName(task),
              getTaskStatusLabel(task.status),
              formatDate(task.startDate),
              formatDate(task.plannedEndDate || task.dueDate),
              task.responsible || task.assignee || '—',
              typeof task.progress === 'number' ? task.progress : '—'
            ]);
            (task.subtasks || []).forEach((sub: any) => {
              timelineData.push([
                'Subtarefa',
                subtaskName(sub),
                getTaskStatusLabel(sub.status),
                formatDate(sub.startDate),
                formatDate(sub.dueDate || sub.plannedEndDate),
                sub.assignee || sub.responsible || '—',
                typeof sub.progress === 'number' ? sub.progress : '—'
              ]);
            });
          });
        });
      }

      const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData);
      XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Cronograma');
    }

    // Planilha 3: Equipe
    if (exportOptions.includeTeam) {
      const teamRows = buildTeamExportRows(project, teamInternal, teamExternal);
      const teamData: (string | number)[][] = [
        ['EQUIPE DO PROJETO'],
        [''],
        ['Tipo', 'Nome', 'Email', 'Função / Empresa', 'Status', 'Data de Entrada']
      ];

      if (teamRows.length === 0) {
        teamData.push(['—', 'Nenhum membro cadastrado', '—', '—', '—', '—']);
      } else {
        teamRows.forEach((row) => {
          teamData.push([row.tipo, row.name, row.email, row.roleOrExtra, row.status, formatDate(row.joinedAt)]);
        });
      }

      const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
      XLSX.utils.book_append_sheet(workbook, teamSheet, 'Equipe');
    }

    // Planilha 4: Atividades
    if (exportOptions.includeActivities) {
      const activities = normalizeActivities(project);
      const activitiesData: (string | number)[][] = [
        ['HISTÓRICO DE ATIVIDADES'],
        [''],
        ['Data/Hora', 'Ação', 'Tipo', 'Item', 'Usuário', 'Detalhes']
      ];

      if (activities.length === 0) {
        activitiesData.push(['—', 'Nenhuma atividade registrada', '—', '—', '—', '—']);
      } else {
        activities.forEach((activity: any) => {
          const ts = activity?.timestamp;
          let when = 'N/A';
          if (ts) {
            try {
              when = new Date(ts).toLocaleString('pt-BR');
            } catch {
              when = formatDate(ts);
            }
          }
          activitiesData.push([
            when,
            String(activity?.action ?? '—'),
            String(activity?.itemType ?? '—'),
            String(activity?.itemName ?? '—'),
            String(activity?.user ?? 'Sistema'),
            activity?.details != null ? JSON.stringify(activity.details) : ''
          ]);
        });
      }

      const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
      XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Atividades');
    }

    // Download
    const fileName = `projeto_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const addSectionToPDF = (
    doc: jsPDF,
    title: string,
    yPosition: number,
    margin: number,
    contentWidth: number
  ) => {
    /**
     * Evita “página em branco” no meio do PDF:
     * quando a faixa de título da seção é desenhada no fim da página
     * e a tabela (autoTable) quebra para a próxima, fica uma página quase vazia.
     *
     * Aqui garantimos espaço suficiente não só para o título, mas também para o cabeçalho
     * da tabela e pelo menos 1 linha (margem de segurança).
     */
    const pageHeight = doc.internal.pageSize.getHeight()
    const minSpaceAfterTitle = 65
    if (yPosition > pageHeight - minSpaceAfterTitle) {
      doc.addPage();
      yPosition = 20;
    }

    // Faixa de seção (padrão do sistema)
    const barH = 7;
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(margin, yPosition - 6, contentWidth, barH, 'F');

    // Destaque ciano à esquerda (identidade)
    doc.setFillColor(...PDF_COLORS.cyan);
    doc.rect(margin, yPosition - 6, 5, barH, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(title, margin + 8, yPosition - 1);

    doc.setTextColor(...PDF_COLORS.textDark);
    return yPosition + 8;
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
      pending: 'Pendente',
      active: 'Em andamento',
      planning: 'Planejamento',
      completed: 'Concluída',
      concluido: 'Concluído',
      em_andamento: 'Em andamento',
      nao_iniciado: 'Não iniciado',
      pendente: 'Pendente',
      cancelado: 'Cancelado'
    };
    return statusMap[status] || status || '—';
  };

  const getTaskStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      completed: 'Concluída',
      done: 'Concluída',
      in_progress: 'Em andamento',
      review: 'Em revisão',
      todo: 'A fazer',
      pending: 'Não iniciado',
      overdue: 'Em atraso',
      cancelado: 'Cancelado'
    };
    return statusMap[status] || status || '—';
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
        {/* Renderização offscreen do Gantt para exportação em PDF */}
        <Box
          sx={{
            position: 'fixed',
            left: -10000,
            top: 0,
            width: 1200,
            bgcolor: '#fff',
            zIndex: -1,
            pointerEvents: 'none'
          }}
          aria-hidden
        >
          <ProjectGantt
            phases={project?.timeline?.phases ? project.timeline.phases : []}
            projectStartDate={project?.startDate}
            projectEndDate={project?.endDate}
          />
        </Box>

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

                {exportOptions.includeTimeline && (
                  <Box sx={{ pl: 4, pb: 1 }}>
                    <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
                      Detalhe do cronograma
                    </FormLabel>
                    <RadioGroup
                      value={exportOptions.timelineDetail}
                      onChange={(e) =>
                        handleOptionChange('timelineDetail', e.target.value as TimelineExportDetail)
                      }
                    >
                      <FormControlLabel
                        value="phases_only"
                        control={<Radio size="small" />}
                        label="Somente fases (resumo por etapa)"
                      />
                      <FormControlLabel
                        value="with_tasks_and_subtasks"
                        control={<Radio size="small" />}
                        label="Fases, tarefas e subtarefas (linha a linha)"
                      />
                    </RadioGroup>
                  </Box>
                )}
                
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
            {exportOptions.includeTimeline && (
              <Chip
                label={
                  exportOptions.timelineDetail === 'phases_only'
                    ? 'Cronograma: só fases'
                    : 'Cronograma: fases + tarefas'
                }
                color="success"
              />
            )}
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
