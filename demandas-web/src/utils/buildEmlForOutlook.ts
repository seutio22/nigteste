/**
 * Gera ficheiro .eml (RFC 822) para abrir no Outlook.
 *
 * Usa corpo **apenas em HTML** (uma única parte MIME). Incluir também `text/plain`
 * em multipart/alternative faz o Outlook abrir por vezes só o texto — sem o layout da pré-visualização.
 *
 * Corpo em base64 (UTF-8), compatível com caracteres especiais e estilos inline.
 */

const CRLF = '\r\n'

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function foldBase64(b64: string): string {
  const w = 76
  const parts: string[] = []
  for (let i = 0; i < b64.length; i += w) {
    parts.push(b64.slice(i, i + w))
  }
  return parts.join(CRLF)
}

function encodeSubjectRfc2047(subject: string): string {
  return `=?UTF-8?B?${utf8ToBase64(subject)}?=`
}

export type InlineAttachment = {
  /** Ex.: "header-image" (sem <>). */
  contentId: string
  filename: string
  mimeType: string
  content: Uint8Array
}

export type BuildEmlParams = {
  html: string
  subject: string
  /** Preenche o campo "Para" no Outlook (opcional). */
  toAddresses?: string[]
  /** Imagens inline (CID) para `multipart/related`. */
  inlineAttachments?: InlineAttachment[]
}

/**
 * Mensagem com uma única parte `text/html` (sem multipart/alternative),
 * para o Outlook mostrar o mesmo HTML da pré-visualização (estilos inline, cores, etc.).
 * Nota: o motor HTML do Outlook ignora alguns CSS (ex.: linear-gradient); o restante costuma aplicar-se.
 */
export function buildEmlForOutlook(params: BuildEmlParams): string {
  const { html, subject, toAddresses, inlineAttachments } = params
  const htmlB64 = foldBase64(utf8ToBase64(html))
  const date = new Date().toUTCString()
  const lines: string[] = []

  if (toAddresses && toAddresses.length > 0) {
    lines.push(`To: ${toAddresses.map((e) => e.trim()).filter(Boolean).join(', ')}`)
  }
  lines.push(`Subject: ${encodeSubjectRfc2047(subject)}`)
  lines.push(`Date: ${date}`)
  lines.push('MIME-Version: 1.0')

  const atts = (inlineAttachments || []).filter((a) => a?.contentId && a?.mimeType && a?.content?.length)
  if (!atts.length) {
    lines.push('Content-Type: text/html; charset="UTF-8"')
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(htmlB64)
    return lines.join(CRLF)
  }

  // multipart/related: HTML + imagens inline via CID
  const boundary = `----=_Part_${Math.random().toString(16).slice(2)}_${Date.now()}`
  lines.push(`Content-Type: multipart/related; boundary="${boundary}"`)
  lines.push('')

  // Part: HTML
  lines.push(`--${boundary}`)
  lines.push('Content-Type: text/html; charset="UTF-8"')
  lines.push('Content-Transfer-Encoding: base64')
  lines.push('')
  lines.push(htmlB64)

  // Parts: inline images
  for (const a of atts) {
    const b64 = foldBase64(bytesToBase64(a.content))
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: ${a.mimeType}; name="${a.filename}"`)
    lines.push('Content-Transfer-Encoding: base64')
    lines.push(`Content-ID: <${a.contentId}>`)
    lines.push(`Content-Disposition: inline; filename="${a.filename}"`)
    lines.push('')
    lines.push(b64)
  }

  lines.push(`--${boundary}--`)

  return lines.join(CRLF)
}
