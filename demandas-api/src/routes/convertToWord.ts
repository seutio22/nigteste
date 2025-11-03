import { FastifyInstance } from 'fastify'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle } from 'docx'
import { parse } from 'node-html-parser'

// Função auxiliar para converter cores CSS para hexadecimal
function cssColorToHex(color: string): string {
  if (!color || color === 'transparent') return 'FFFFFF'
  
  // Já é hex (#rrggbb)
  if (color.startsWith('#')) {
    const hex = color.slice(1).replace(/[^0-9A-F]/gi, '')
    return hex.length === 3 ? hex.split('').map(c => c + c).join('').toUpperCase() : hex.padEnd(6, '0').toUpperCase()
  }
  
  // rgb/rgba
  const rgbMatch = color.match(/\d+/g)
  if (rgbMatch && rgbMatch.length >= 3) {
    const r = parseInt(rgbMatch[0])
    const g = parseInt(rgbMatch[1])
    const b = parseInt(rgbMatch[2])
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  }
  
  // Nomes de cores
  const colorMap: Record<string, string> = {
    'black': '000000', 'white': 'FFFFFF', 'red': 'FF0000', 'green': '00FF00', 'blue': '0000FF',
    'darkblue': '00008B', 'darkgreen': '006400', 'darkred': '8B0000', 'gray': '808080', 'grey': '808080'
  }
  return colorMap[color.toLowerCase()] || '000000'
}

// Função para extrair estilos do atributo style
function parseStyle(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {}
  if (!styleStr) return styles
  
  styleStr.split(';').forEach(rule => {
    const [prop, value] = rule.split(':').map(s => s.trim())
    if (prop && value) {
      styles[prop.toLowerCase().replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value
    }
  })
  return styles
}

export async function convertToWordRoutes(app: FastifyInstance) {
  // Endpoint para converter HTML para Word - ABORDAGEM LEVE SEM PUPPETEER
  app.post('/convert-html-to-word', async (request: any, reply) => {
    try {
      const { html } = request.body as { html: string }

      if (!html) {
        return reply.code(400).send({ error: 'HTML é obrigatório' })
      }

      // Parse do HTML
      const root = parse(html)
      const body = root.querySelector('body') || root
      const mainContainer = body.querySelector('div[style*="background: white"]') || body
      
      const docElements: any[] = []
      
      // Processar elementos principais
      const processElement = (el: any): void => {
        if (!el || !el.tagName) return
        
        const tagName = el.tagName.toLowerCase()
        const styleStr = el.getAttribute('style') || ''
        const styles = parseStyle(styleStr)
        const text = el.text?.trim() || el.structuredText?.trim() || ''
        
        // Ignorar scripts e estilos
        if (tagName === 'script' || tagName === 'style' || tagName === 'head') return
        
        // Cabeçalho com fundo escuro (#1a1a2e ou similar)
        const bgColor = cssColorToHex(styles.background || styles.backgroundColor || '')
        if (tagName === 'div' && (bgColor === '1A1A2E' || bgColor === '000000') && el.querySelector('h1')) {
          const h1 = el.querySelector('h1')
          const p = el.querySelector('p')
          const h1Text = h1?.text?.trim() || ''
          const pText = p?.text?.trim() || ''
          const textColor = cssColorToHex(styles.color || 'white')
          
          if (h1Text) {
            docElements.push(new Paragraph({
              children: [new TextRun({
                text: h1Text,
                bold: true,
                size: 36,
                color: textColor || 'FFFFFF'
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              shading: { fill: bgColor, type: ShadingType.SOLID },
              indent: { left: -720, right: -720 }
            }))
          }
          
          if (pText) {
            docElements.push(new Paragraph({
              children: [new TextRun({
                text: pText,
                size: 28,
                color: textColor || 'FFFFFF'
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 },
              shading: { fill: bgColor, type: ShadingType.SOLID },
              indent: { left: -720, right: -720 }
            }))
          }
          return
        }
        
        // Tabelas - EXATAMENTE como na imagem (fundo preto)
        if (tagName === 'table') {
          const theadRows = el.querySelectorAll('thead tr')
          const tbodyRows = el.querySelectorAll('tbody tr')
          const allRows = [...Array.from(theadRows), ...Array.from(tbodyRows)]
          
          const tableRows = allRows.map((tr: any) => {
            const cells = Array.from(tr.querySelectorAll('td, th')).map((cell: any) => {
              const cellStyle = parseStyle(cell.getAttribute('style') || '')
              const cellText = cell.text?.trim() || ''
              const cellBgColor = cssColorToHex(cellStyle.background || cellStyle.backgroundColor || '#000000')
              const cellTextColor = cssColorToHex(cellStyle.color || '#FFFFFF')
              const isBold = cellStyle.fontWeight === 'bold' || parseInt(cellStyle.fontWeight || '400') >= 600
              
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: cellText,
                    bold: isBold || cell.tagName === 'TH',
                    color: cellTextColor,
                    size: 28
                  })]
                })],
                shading: { fill: cellBgColor || '000000', type: ShadingType.SOLID },
                width: { size: 100 / (tr.querySelectorAll('td, th').length || 6), type: WidthType.PERCENTAGE },
                margins: { top: 300, bottom: 300, left: 240, right: 240 }
              })
            })
            return new TableRow({ children: cells })
          })
          
          docElements.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' }
            }
          }))
          return
        }
        
        // Blocos coloridos (descrição, conclusão, etc.)
        if (bgColor && bgColor !== 'FFFFFF' && bgColor !== 'F8F9FA' && text) {
          const textColor = cssColorToHex(styles.color || '#FFFFFF')
          const isBold = styles.fontWeight === 'bold' || parseInt(styles.fontWeight || '400') >= 600
          const borderColor = cssColorToHex(styles.borderColor || '')
          
          docElements.push(new Paragraph({
            children: [new TextRun({
              text: text,
              bold: isBold,
              color: textColor,
              size: 28
            })],
            spacing: { before: 300, after: 480 },
            shading: { fill: bgColor, type: ShadingType.SOLID },
            indent: { left: 240 },
            border: borderColor && borderColor !== '000000' ? {
              top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              right: { style: BorderStyle.SINGLE, size: 1, color: borderColor }
            } : undefined
          }))
          return
        }
        
        // Parágrafos normais (h3, p, div com texto)
        if (text && (tagName === 'h3' || tagName === 'p' || tagName === 'div') && tagName !== 'table') {
          const textColor = cssColorToHex(styles.color || '#000000')
          const isBold = styles.fontWeight === 'bold' || parseInt(styles.fontWeight || '400') >= 600
          const fontSize = parseInt(styles.fontSize || '14')
          
          docElements.push(new Paragraph({
            children: [new TextRun({
              text: text,
              bold: isBold || tagName === 'h3',
              color: textColor,
              size: fontSize * 2
            })],
            spacing: { after: 200 }
          }))
        }
      }
      
      // Processar todos os elementos principais
      const children = mainContainer.childNodes || []
      children.forEach((child: any) => {
        if (child.tagName) {
          processElement(child)
        }
      })
      
      // Processar elementos em ordem (respeitando a estrutura do HTML)
      const elementsToProcess = mainContainer.querySelectorAll('div, table, h1, h2, h3, p')
      const processed = new Set()
      
      elementsToProcess.forEach((el: any) => {
        // Evitar processar células de tabela individualmente (já processadas pela tabela)
        if (el.closest('table') && el.tagName !== 'TABLE') return
        if (processed.has(el)) return
        processed.add(el)
        processElement(el)
      })
      
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720
              }
            }
          },
          children: docElements.length > 0 ? docElements : [
            new Paragraph({
              children: [new TextRun({ text: 'Documento gerado com sucesso' })]
            })
          ]
        }]
      })
      
      const buffer = await Packer.toBuffer(doc)
      
      // Retornar arquivo Word
      reply
        .code(200)
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .header('Content-Disposition', 'attachment; filename="email-comunicacao.docx"')
        .send(Buffer.from(buffer))

    } catch (error: any) {
      if (browser) {
        try {
          await browser.close()
        } catch (e) {}
      }
      console.error('Erro ao converter HTML para Word:', error)
      return reply.code(500).send({ 
        error: 'Erro ao converter HTML para Word',
        details: error?.message 
      })
    }
  })
}

