import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AberturaResumoLinha } from './placementKickOffAberturaResumo'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import { groupAberturaResumoLinhas, resolveResumoLinhaValor } from './placementKickOffAberturaResumo'

type ExportKickOffPdfInput = {
  ticket: string
  linhas: AberturaResumoLinha[]
  estrategia?: KickOffEstrategia | null
}

export function exportKickOffResumoPdf({
  ticket,
  linhas,
  estrategia,
}: ExportKickOffPdfInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margem = 14
  let y = margem

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Kick off — ${ticket}`, margem, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margem, y)
  y += 8

  const grupos = groupAberturaResumoLinhas(linhas)

  for (const grupo of grupos) {
    if (y > 270) {
      doc.addPage()
      y = margem
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(grupo.titulo, margem, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [['Campo', 'Valor']],
      body: grupo.linhas.map((l) => [
        l.rotulo,
        resolveResumoLinhaValor(l, estrategia?.resumoEdicoes).replace(/\n/g, ' · '),
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 58, 95] },
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 'auto' } },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 6
  }

  if (estrategia && estrategia.secoes.length) {
    if (y > 250) {
      doc.addPage()
      y = margem
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Estratégia da cotação', margem, y)
    y += 6

    for (const sec of estrategia.secoes) {
      if (y > 270) {
        doc.addPage()
        y = margem
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(sec.titulo, margem, y)
      y += 4
      const body = sec.itens.map((i) => [
        i.rotulo.trim() || '(texto livre)',
        i.valor.trim() || '—',
      ])
      if (body.length) {
        autoTable(doc, {
          startY: y,
          margin: { left: margem, right: margem },
          head: [['Item', 'Conteúdo']],
          body,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [91, 33, 182] },
        })
        y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
        y += 4
      }
    }

    if (estrategia.mercadoAnalisado.length) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Mercado analisado', margem, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(estrategia.mercadoAnalisado.join(', '), margem, y, { maxWidth: 180 })
      y += 8
    }

    if (estrategia.notas?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Notas', margem, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.text(estrategia.notas.trim(), margem, y, { maxWidth: 180 })
    }
  }

  const safeTicket = ticket.replace(/[^\w-]+/g, '_') || 'cotacao'
  doc.save(`kick-off-${safeTicket}.pdf`)
}
