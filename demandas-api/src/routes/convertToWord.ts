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

function createParagraph(text: string, options: Partial<TextRun> & { bold?: boolean; size?: number; color?: string } = {}) {
  const runs = text.split('\n').map((line, idx) => new TextRun({
    text: line,
    break: idx > 0,
    ...options
  }))
  return new Paragraph({ children: runs })
}

function buildResumoTable(rows: any[]) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      'Contrato',
      'Operadora',
      'Produto',
      'Atualização',
      'Subtipo',
      'Tipo'
    ].map((label) =>
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: label, bold: true, color: 'FFFFFF' })
            ]
          })
        ],
        shading: { type: ShadingType.SOLID, fill: '1F2937' }
      })
    )
  })

  const bodyRows = rows.map((row, index) =>
    new TableRow({
      children: [
        row.contrato,
        row.operadora,
        row.produto,
        row.atualizacao,
        row.subtipo,
        row.tipo
      ].map((value: string) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: value || 'N/A' })]
            })
          ],
          shading:
            index % 2 === 1
              ? { type: ShadingType.SOLID, fill: 'F3F4F6' }
              : undefined
        })
      )
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' }
    },
    rows: [headerRow, ...bodyRows]
  })
}

function sanitizeTextValue(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim()
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
        if (tagName === 'div' && (bgColor === '1A1A2E' || bgColor === '000000' || bgColor === '2D3748') && el.querySelector('h1')) {
          const h1 = el.querySelector('h1')
          const p = el.querySelector('p')
          const h1Text = h1?.text?.trim() || ''
          const pText = p?.text?.trim() || ''
          const h1Style = parseStyle(h1.getAttribute('style') || '')
          const pStyle = parseStyle(p?.getAttribute('style') || '')
          
          // Cor do texto: branco para fundo escuro
          const textColor = 'FFFFFF'
          const h1Size = parseInt(h1Style.fontSize || '24') * 2
          const pSize = parseInt(pStyle.fontSize || '14') * 2
          
          if (h1Text) {
            docElements.push(new Paragraph({
              children: [new TextRun({
                text: h1Text,
                bold: true,
                size: h1Size || 48, // 24pt
                color: textColor
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              shading: { fill: bgColor, type: ShadingType.SOLID },
              indent: { left: -720, right: -720 }
            }))
          }
          
          if (pText) {
            docElements.push(new Paragraph({
              children: [new TextRun({
                text: pText,
                size: pSize || 28, // 14pt
                color: textColor
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 },
              shading: { fill: bgColor, type: ShadingType.SOLID },
              indent: { left: -720, right: -720 }
            }))
          }
          return
        }
        
        // Tabelas - EXATAMENTE como na imagem
        if (tagName === 'table') {
          const theadRows = el.querySelectorAll('thead tr')
          const tbodyRows = el.querySelectorAll('tbody tr')
          const allRows = [...Array.from(theadRows), ...Array.from(tbodyRows)]
          
          const tableRows = allRows.map((tr: any) => {
            // Pegar estilo da linha (para fundo alternado nas linhas de dados)
            const trStyle = parseStyle(tr.getAttribute('style') || '')
            const rowBgColor = cssColorToHex(trStyle.background || trStyle.backgroundColor || '#FFFFFF')
            
            const cells = Array.from(tr.querySelectorAll('td, th')).map((cell: any) => {
              // Estilos da célula - EXTRAIR TODOS OS ESTILOS INLINE
              const cellStyle = parseStyle(cell.getAttribute('style') || '')
              const cellText = cell.text?.trim() || cell.structuredText?.trim() || ''
              
              const isHeader = cell.tagName === 'TH'
              
              // FUNDO: Célula tem prioridade, depois linha, depois padrão
              let cellBgColor = 'FFFFFF'
              if (cellStyle.background || cellStyle.backgroundColor) {
                // Célula tem fundo próprio - usar esse
                cellBgColor = cssColorToHex(cellStyle.background || cellStyle.backgroundColor)
              } else if (isHeader) {
                // É cabeçalho - usar fundo da linha ou padrão escuro
                const headerRowBg = cssColorToHex(trStyle.background || trStyle.backgroundColor || '#2d3748')
                cellBgColor = (headerRowBg === '2D3748' || headerRowBg === '000000' || headerRowBg === '1A1A2E') 
                  ? headerRowBg 
                  : '2D3748'
              } else {
                // Linha de dados - usar fundo da linha (alternado) OU branco
                cellBgColor = (rowBgColor !== 'FFFFFF' && rowBgColor !== '000000') ? rowBgColor : 'FFFFFF'
              }
              
              // COR DO TEXTO: Célula tem prioridade
              let cellTextColor = '000000' // Padrão preto
              if (cellStyle.color) {
                cellTextColor = cssColorToHex(cellStyle.color)
              } else if (isHeader || cellBgColor === '2D3748' || cellBgColor === '000000' || cellBgColor === '1A1A2E') {
                // Fundo escuro = texto branco
                cellTextColor = 'FFFFFF'
              } else {
                // Fundo claro - determinar cor baseado na cor de fundo
                // Cores específicas do HTML:
                // #e6fffa (verde claro) -> #234e52 (verde escuro)
                // #fef5e7 (amarelo claro) -> #7c2d12 (marrom)
                // #f3e8ff (roxo claro) -> #581c87 (roxo escuro)
                // #ecfdf5 (verde claro) -> #064e3b (verde escuro)
                // #f8f9fa (cinza claro) -> #2d3748 (cinza escuro)
                // #2b6cb0 (azul) para contrato
                
                if (cellBgColor === 'E6FFFA') cellTextColor = '234E52'
                else if (cellBgColor === 'FEF5E7') cellTextColor = '7C2D12'
                else if (cellBgColor === 'F3E8FF') cellTextColor = '581C87'
                else if (cellBgColor === 'ECFDF5') cellTextColor = '064E3B'
                else if (cellBgColor === 'F8F9FA') cellTextColor = '2D3748'
                else cellTextColor = '000000'
              }
              
              const isBold = cellStyle.fontWeight === 'bold' || 
                            parseInt(cellStyle.fontWeight || '400') >= 600 || 
                            isHeader
              
              const fontSize = parseInt(cellStyle.fontSize || '14') * 2 || 28
              
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: cellText,
                    bold: isBold,
                    color: cellTextColor,
                    size: fontSize
                  })]
                })],
                shading: { 
                  fill: cellBgColor, 
                  type: ShadingType.SOLID 
                },
                width: { 
                  size: 100 / (tr.querySelectorAll('td, th').length || 6), 
                  type: WidthType.PERCENTAGE 
                },
                margins: { top: 360, bottom: 360, left: 288, right: 288 }
              })
            })
            return new TableRow({ children: cells })
          })
          
          docElements.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
            }
          }))
          return
        }
        
        // Blocos coloridos (descrição, conclusão, etc.) - capturar corretamente
        if (bgColor && bgColor !== 'FFFFFF' && bgColor !== 'F8F9FA' && bgColor !== 'F7FAFC' && text) {
          // Extrair texto preservando emojis e formatação
          const fullText = el.text?.trim() || el.structuredText?.trim() || ''
          
          // Processar elementos filhos para manter <strong>, etc.
          const textParts: any[] = []
          const processTextNode = (node: any) => {
            if (node.nodeType === 3) { // Text node
              const txt = node.text?.trim()
              if (txt) {
                textParts.push({
                  text: txt,
                  bold: false,
                  color: cssColorToHex(styles.color || '#000000')
                })
              }
            } else if (node.tagName) {
              const tag = node.tagName.toLowerCase()
              if (tag === 'strong' || tag === 'b') {
                const txt = node.text?.trim()
                if (txt) {
                  textParts.push({
                    text: txt,
                    bold: true,
                    color: cssColorToHex(styles.color || '#000000')
                  })
                }
              } else {
                // Processar filhos
                node.childNodes?.forEach(processTextNode)
              }
            }
          }
          
          // Tentar processar nós de texto primeiro
          if (el.childNodes && el.childNodes.length > 0) {
            el.childNodes.forEach(processTextNode)
          }
          
          // Se não conseguiu processar, usar texto simples
          if (textParts.length === 0) {
            textParts.push({
              text: fullText,
              bold: styles.fontWeight === 'bold' || parseInt(styles.fontWeight || '400') >= 600,
              color: cssColorToHex(styles.color || '#000000')
            })
          }
          
          const textColor = cssColorToHex(styles.color || '#000000')
          const borderLeft = styles.borderLeft || styles.border || ''
          const borderColor = borderLeft.includes('#') 
            ? cssColorToHex(borderLeft.match(/#[0-9a-fA-F]{6}/)?.[0] || '')
            : cssColorToHex(styles.borderColor || '')
          
          const runs = textParts.map((part: any) => {
            return new TextRun({
              text: part.text,
              bold: part.bold,
              color: part.color || textColor,
              size: 28
            })
          })
          
          docElements.push(new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: fullText, color: textColor, size: 28 })],
            spacing: { before: 300, after: 480 },
            shading: { fill: bgColor, type: ShadingType.SOLID },
            indent: { left: 240 },
            border: borderColor && borderColor !== '000000' ? {
              top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
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
      console.error('Erro ao converter HTML para Word:', error)
      return reply.code(500).send({ 
        error: 'Erro ao converter HTML para Word',
        details: error?.message 
      })
    }
  })

  app.post('/comunicacao-word', async (request: any, reply) => {
    try {
      const {
        titulo,
        subtitulo,
        saudacao,
        informacao,
        cliente,
        operadora,
        produto,
        sistema,
        resumo,
        descricao,
        conclusao,
        ticket
      } = request.body as {
        titulo: string
        subtitulo: string
        saudacao: string
        informacao: string
        cliente: string
        operadora: string
        produto: string
        sistema: string
        resumo: Array<{
          contrato: string
          operadora: string
          produto: string
          atualizacao: string
          subtipo: string
          tipo: string
        }>
        descricao: string
        conclusao: string
        ticket: string
      }

      const safeResumo = Array.isArray(resumo) && resumo.length > 0 ? resumo : [
        {
          contrato: 'N/A',
          operadora: 'N/A',
          produto: 'N/A',
          atualizacao: 'N/A',
          subtipo: 'N/A',
          tipo: 'N/A'
        }
      ]

      const doc = new Document({
        sections: [
          {
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
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: sanitizeTextValue(titulo) || 'Comunicado NIG',
                    bold: true,
                    size: 48
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: sanitizeTextValue(subtitulo) || 'Notificação Automática - Sistema NIG',
                    size: 24,
                    color: '6B7280'
                  })
                ]
              }),
              createParagraph(sanitizeTextValue(saudacao) || 'Prezados,'),
              createParagraph(
                sanitizeTextValue(informacao) ||
                  'Informamos que houve alteração nos dados do cliente a seguir:'
              ),
              new Paragraph({ spacing: { after: 200 } }),
              createParagraph(`Cliente: ${sanitizeTextValue(cliente) || 'N/A'}`),
              createParagraph(`Operadora: ${sanitizeTextValue(operadora) || 'N/A'}`),
              createParagraph(`Produto: ${sanitizeTextValue(produto) || 'N/A'}`),
              createParagraph(`Sistema: ${sanitizeTextValue(sistema) || 'N/A'}`),
              new Paragraph({ spacing: { after: 300 } }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Resumo da alteração', bold: true })
                ],
                spacing: { after: 200 }
              }),
              buildResumoTable(
                safeResumo.map((row) => ({
                  contrato: sanitizeTextValue(row.contrato) || 'N/A',
                  operadora: sanitizeTextValue(row.operadora) || 'N/A',
                  produto: sanitizeTextValue(row.produto) || 'N/A',
                  atualizacao: sanitizeTextValue(row.atualizacao) || 'N/A',
                  subtipo: sanitizeTextValue(row.subtipo) || 'N/A',
                  tipo: sanitizeTextValue(row.tipo) || 'N/A'
                }))
              ),
              new Paragraph({ spacing: { after: 300 } }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Descrição', bold: true })
                ],
                spacing: { after: 120 }
              }),
              createParagraph(descricao || '-'),
              new Paragraph({ spacing: { after: 240 } }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Conclusão', bold: true })
                ],
                spacing: { after: 120 }
              }),
              createParagraph(conclusao || '-'),
              new Paragraph({ spacing: { after: 240 } }),
              createParagraph('Atenciosamente,'),
              createParagraph('NIG - Núcleo de Informações Gerenciais'),
              createParagraph('Mensagem gerada automaticamente pelo sistema NIG.'),
              new Paragraph({ spacing: { before: 480 } }),
              createParagraph(`Ticket: ${sanitizeTextValue(ticket) || 'N/A'}`, {
                color: '6B7280',
                size: 20
              })
            ]
          }
        ]
      })

      const buffer = await Packer.toBuffer(doc)
      const fileName = `comunicacao-${sanitizeTextValue(ticket) || 'NIG'}.docx`

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(buffer)
    } catch (error) {
      request.log.error(error)
      reply.code(500).send({ error: 'Erro ao gerar documento Word' })
    }
  })
}

