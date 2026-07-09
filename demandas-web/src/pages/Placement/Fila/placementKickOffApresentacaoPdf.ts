import jsPDF from 'jspdf'

export type KickOffApresentacaoUnifiedCapture = {
  imageDataUri: string
  imageWidth: number
  imageHeight: number
}

export type KickOffApresentacaoPdfInput = {
  ticket: string
  unified: KickOffApresentacaoUnifiedCapture
}

const MARGEM = 12

function loadImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem da apresentação.'))
    img.src = dataUri
  })
}

function cropSlice(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): string {
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível.')
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas.toDataURL('image/png')
}

async function addUnifiedPortraitPages(
  doc: jsPDF,
  ticket: string,
  capture: KickOffApresentacaoUnifiedCapture
): Promise<void> {
  const img = await loadImage(capture.imageDataUri)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - MARGEM * 2
  const scale = contentW / capture.imageWidth

  let sy = 0
  let pageIndex = 0

  while (sy < capture.imageHeight) {
    doc.addPage('a4', 'portrait')

    const headerBlock = pageIndex === 0 ? 14 : 0
    const availHmm = pageH - MARGEM * 2 - headerBlock
    const slicePxH = Math.min(capture.imageHeight - sy, availHmm / scale)

    if (pageIndex === 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text(`Análise da base · ${ticket}`, MARGEM, MARGEM + 2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(90, 90, 90)
      doc.text('Painel unificado + resumo de inconsistências', MARGEM, MARGEM + 7)
    }

    const sliceUri = cropSlice(img, 0, sy, capture.imageWidth, slicePxH)
    const drawHmm = slicePxH * scale
    const y = MARGEM + headerBlock
    doc.addImage(sliceUri, 'PNG', MARGEM, y, contentW, drawHmm)

    sy += slicePxH
    pageIndex += 1
  }
}

export async function exportKickOffApresentacaoPdf({
  ticket,
  unified,
}: KickOffApresentacaoPdfInput): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Kick off — Apresentação · ${ticket}`, MARGEM, MARGEM + 2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(new Date().toLocaleString('pt-BR'), MARGEM, MARGEM + 8)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.text(
    'Análise unificada da base (grupo elegível, contrato e localidade) com validação de inconsistências.',
    MARGEM,
    MARGEM + 13
  )

  await addUnifiedPortraitPages(doc, ticket, unified)

  const safeTicket = ticket.replace(/[^\w-]+/g, '_') || 'cotacao'
  doc.save(`kick-off-apresentacao-${safeTicket}.pdf`)
}
