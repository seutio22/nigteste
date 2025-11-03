import { FastifyInstance } from 'fastify'
import puppeteer from 'puppeteer'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle } from 'docx'

export async function convertToWordRoutes(app: FastifyInstance) {
  // Endpoint para converter HTML para Word usando Puppeteer + docx
  app.post('/convert-html-to-word', async (request: any, reply) => {
    let browser: any = null
    try {
      const { html } = request.body as { html: string }

      if (!html) {
        return reply.code(400).send({ error: 'HTML é obrigatório' })
      }

      // Inicializar Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      
      // Definir viewport e carregar HTML
      await page.setViewport({ width: 800, height: 1200 })
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      // Aguardar renderização completa
      await page.waitForTimeout(1000)
      
      // Extrair dados do HTML renderizado de forma mais precisa
      const data = await page.evaluate(() => {
        const getComputedStyleValue = (element: Element, property: string) => {
          const computed = window.getComputedStyle(element)
          return computed.getPropertyValue(property) || computed.getPropertyValue(property.replace(/-([a-z])/g, (g) => g[1].toUpperCase()))
        }
        
        const rgbToHex = (rgb: string): string => {
          if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'FFFFFF'
          
          // rgb(r, g, b) ou rgba(r, g, b, a)
          const match = rgb.match(/\d+/g)
          if (match && match.length >= 3) {
            const r = parseInt(match[0])
            const g = parseInt(match[1])
            const b = parseInt(match[2])
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
          }
          
          // #hex
          if (rgb.startsWith('#')) {
            return rgb.slice(1).toUpperCase().padEnd(6, '0')
          }
          
          // Nomes de cores
          const colorMap: Record<string, string> = {
            'black': '000000', 'white': 'FFFFFF', 'red': 'FF0000', 'green': '00FF00', 'blue': '0000FF',
            'darkblue': '00008B', 'darkgreen': '006400', 'darkred': '8B0000'
          }
          return colorMap[rgb.toLowerCase()] || '000000'
        }
        
        const extractTextWithStyles = (element: Element): any[] => {
          const result: any[] = []
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
          let node
          
          while (node = walker.nextNode()) {
            if (node.textContent?.trim()) {
              const parent = node.parentElement
              if (parent) {
                const computed = window.getComputedStyle(parent)
                const textColor = rgbToHex(computed.color)
                const fontWeight = computed.fontWeight
                const fontSize = computed.fontSize
                const fontSizeNum = fontSize ? Math.round(parseFloat(fontSize)) : 12
                const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 600
                
                result.push({
                  text: node.textContent.trim(),
                  color: textColor,
                  bold: isBold,
                  size: fontSizeNum
                })
              }
            }
          }
          return result
        }
        
        const processTable = (table: HTMLTableElement) => {
          const rows: any[] = []
          const allRows = table.querySelectorAll('tr')
          
          allRows.forEach(tr => {
            const cells: any[] = []
            tr.querySelectorAll('td, th').forEach(cell => {
              const computed = window.getComputedStyle(cell)
              const bgColor = rgbToHex(computed.backgroundColor)
              const textParts = extractTextWithStyles(cell)
              
              cells.push({
                parts: textParts,
                bgColor: bgColor,
                isHeader: cell.tagName === 'TH'
              })
            })
            rows.push({ cells })
          })
          
          return { type: 'table', rows }
        }
        
        const sections: any[] = []
        const body = document.body
        const mainContainer = body.querySelector('div[style*="background: white"]') || body
        
        const processChild = (el: Element) => {
          const tagName = el.tagName.toLowerCase()
          const computed = window.getComputedStyle(el)
          
          // Cabeçalho com fundo escuro
          if (el.querySelector('h1') && computed.backgroundColor && rgbToHex(computed.backgroundColor) !== 'FFFFFF') {
            const h1 = el.querySelector('h1')
            const p = el.querySelector('p')
            if (h1) {
              sections.push({
                type: 'header',
                title: h1.textContent?.trim() || '',
                subtitle: p?.textContent?.trim() || '',
                bgColor: rgbToHex(computed.backgroundColor),
                textColor: rgbToHex(computed.color)
              })
            }
            return
          }
          
          // Tabelas
          if (tagName === 'table') {
            sections.push(processTable(el as HTMLTableElement))
            return
          }
          
          // Blocos com fundo colorido
          if (computed.backgroundColor && rgbToHex(computed.backgroundColor) !== 'FFFFFF' && rgbToHex(computed.backgroundColor) !== 'F8F9FA') {
            const textParts = extractTextWithStyles(el)
            if (textParts.length > 0) {
              sections.push({
                type: 'colored-box',
                parts: textParts,
                bgColor: rgbToHex(computed.backgroundColor),
                borderColor: rgbToHex(computed.borderColor) !== '000000' ? rgbToHex(computed.borderColor) : undefined
              })
            }
            return
          }
          
          // Parágrafos normais
          const textParts = extractTextWithStyles(el)
          if (textParts.length > 0 && tagName !== 'script' && tagName !== 'style') {
            sections.push({
              type: 'paragraph',
              parts: textParts
            })
          }
        }
        
        // Processar elementos principais recursivamente
        const walkElements = (parent: Element) => {
          Array.from(parent.children).forEach(child => {
            processChild(child)
            // Processar filhos recursivamente (mas não muito profundo)
            if (child.children.length > 0 && child.children.length < 10) {
              walkElements(child)
            }
          })
        }
        
        walkElements(mainContainer)
        
        return { sections }
      })
      
      await browser.close()
      
      // Criar documento Word usando docx com dados extraídos
      const docElements: any[] = []
      
      data.sections.forEach((section: any) => {
        if (section.type === 'header') {
          // Cabeçalho com fundo escuro
          docElements.push(new Paragraph({
            children: [new TextRun({
              text: section.title,
              bold: true,
              size: 36, // 18pt
              color: section.textColor || 'FFFFFF'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            shading: {
              fill: section.bgColor,
              type: ShadingType.SOLID
            },
            indent: { left: -720, right: -720 }
          }))
          if (section.subtitle) {
            docElements.push(new Paragraph({
              children: [new TextRun({
                text: section.subtitle,
                size: 28, // 14pt
                color: section.textColor || 'FFFFFF'
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 },
              shading: {
                fill: section.bgColor,
                type: ShadingType.SOLID
              },
              indent: { left: -720, right: -720 }
            }))
          }
        } else if (section.type === 'table' && section.rows.length > 0) {
          // Tabela com células coloridas
          const tableRows = section.rows.map((row: any) => {
            const cells = row.cells.map((cell: any, idx: number) => {
              const cellParts = cell.parts.map((part: any) => {
                return new TextRun({
                  text: part.text,
                  bold: part.bold || cell.isHeader,
                  color: part.color || '000000',
                  size: part.size ? part.size * 2 : 28
                })
              })
              
              return new TableCell({
                children: [new Paragraph({
                  children: cellParts.length > 0 ? cellParts : [new TextRun({ text: '' })]
                })],
                shading: cell.bgColor && cell.bgColor !== 'FFFFFF' ? {
                  fill: cell.bgColor,
                  type: ShadingType.SOLID
                } : undefined,
                width: { size: 100 / row.cells.length, type: WidthType.PERCENTAGE },
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
        } else if (section.type === 'colored-box') {
          // Bloco com fundo colorido
          const parts = section.parts.map((part: any) => {
            return new TextRun({
              text: part.text,
              bold: part.bold,
              color: part.color || 'FFFFFF',
              size: part.size ? part.size * 2 : 28
            })
          })
          
          docElements.push(new Paragraph({
            children: parts.length > 0 ? parts : [new TextRun({ text: '' })],
            spacing: { before: 300, after: 480 },
            shading: {
              fill: section.bgColor,
              type: ShadingType.SOLID
            },
            indent: { left: 240 },
            border: section.borderColor ? {
              top: { style: BorderStyle.SINGLE, size: 1, color: section.borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: section.borderColor },
              left: { style: BorderStyle.SINGLE, size: 1, color: section.borderColor },
              right: { style: BorderStyle.SINGLE, size: 1, color: section.borderColor }
            } : undefined
          }))
        } else if (section.type === 'paragraph' && section.parts.length > 0) {
          // Parágrafos normais
          const parts = section.parts.map((part: any) => {
            return new TextRun({
              text: part.text,
              bold: part.bold,
              color: part.color || '000000',
              size: part.size ? part.size * 2 : 24
            })
          })
          
          docElements.push(new Paragraph({
            children: parts,
            spacing: { after: 200 }
          }))
        }
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

