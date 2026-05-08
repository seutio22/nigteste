/**
 * Copia HTML formatado para a área de transferência, com fallbacks para
 * Word / Outlook no Windows (CF_HTML + evento copy + execCommand).
 */

/** Texto plano a partir de HTML completo (reutilizável em exportação .eml, etc.). */
export function htmlToPlainTextFromHtml(fullHtml: string): string {
  const d = document.createElement('div')
  d.innerHTML = fullHtml
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '')
  return (d.innerText || d.textContent || '').replace(/\r\n/g, '\n').trim()
}

function htmlToPlainText(fullHtml: string): string {
  return htmlToPlainTextFromHtml(fullHtml)
}

/**
 * Formato HTML Clipboard do Windows (CF_HTML), usado pelo Word e Outlook desktop.
 * @see https://learn.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format
 */
function buildWindowsCfHtml(htmlFragment: string): string {
  const htmlPrefix = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>'
  const htmlSuffix = '</body></html>'
  const startFragment = '<!--StartFragment-->'
  const endFragment = '<!--EndFragment-->'
  const body = htmlPrefix + startFragment + htmlFragment + endFragment + htmlSuffix

  const headerPrefix = 'Version:0.9\r\n'
  const pad = (n: number) => String(n).padStart(9, '0')

  const placeholderHeader =
    headerPrefix +
    'StartHTML:000000000\r\n' +
    'EndHTML:000000000\r\n' +
    'StartFragment:000000000\r\n' +
    'EndFragment:000000000\r\n'

  const enc = new TextEncoder()
  const fullStr = placeholderHeader + body
  const fullBytes = enc.encode(fullStr)

  const startHtml = enc.encode(placeholderHeader).length
  const endHtml = fullBytes.length
  const startFrag = enc.encode(placeholderHeader + htmlPrefix + startFragment).length
  const endFrag = enc.encode(placeholderHeader + htmlPrefix + startFragment + htmlFragment + endFragment).length

  const header =
    headerPrefix +
    `StartHTML:${pad(startHtml)}\r\n` +
    `EndHTML:${pad(endHtml)}\r\n` +
    `StartFragment:${pad(startFrag)}\r\n` +
    `EndFragment:${pad(endFrag)}\r\n`

  return header + body
}

function extractBodyInnerHtml(fullHtml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(fullHtml, 'text/html')
  return doc.body.innerHTML
}

/**
 * Word/Outlook: interceptar o evento copy e injetar text/html (gera CF_HTML corretamente no Edge/Chrome).
 */
function copyUsingCopyEvent(fullHtml: string, plain: string): boolean {
  const fragment = extractBodyInnerHtml(fullHtml)

  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  container.tabIndex = -1
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none'
  })
  container.innerHTML = fragment
  document.body.appendChild(container)

  const onCopy = (e: ClipboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dt = e.clipboardData
    if (!dt) return
    try {
      // IMPORTANTE: não enviar payload CF_HTML (com header "Version:0.9...") em text/html,
      // pois algumas versões do Outlook colam esse header como texto no início do e-mail.
      // Enviando apenas HTML "limpo", o browser/Windows geram o formato nativo quando aplicável.
      dt.setData('text/html', fullHtml)
      dt.setData('text/plain', plain)
    } catch {
      try {
        dt.setData('text/html', fullHtml)
        dt.setData('text/plain', plain)
      } catch {
        /* ignore */
      }
    }
  }

  try {
    document.addEventListener('copy', onCopy, true)
    container.focus()
    const range = document.createRange()
    range.selectNodeContents(container)
    const sel = window.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    const ok = document.execCommand('copy')
    sel.removeAllRanges()
    return ok
  } catch {
    return false
  } finally {
    document.removeEventListener('copy', onCopy, true)
    document.body.removeChild(container)
  }
}

function copyHtmlUsingIframeExecCommand(fullHtml: string): boolean {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '-9999px',
    width: '960px',
    height: '800px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none'
  })
  document.body.appendChild(iframe)
  try {
    const win = iframe.contentWindow
    if (!win) return false
    const doc = win.document
    doc.open()
    doc.write(fullHtml)
    doc.close()
    win.focus()
    const range = doc.createRange()
    range.selectNodeContents(doc.body)
    const sel = win.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    const ok = doc.execCommand('copy')
    sel.removeAllRanges()
    return ok
  } catch {
    return false
  } finally {
    document.body.removeChild(iframe)
  }
}

function copyHtmlUsingContentEditableExecCommand(fullHtml: string): boolean {
  const inner = extractBodyInnerHtml(fullHtml)
  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: '900px',
    opacity: '0',
    pointerEvents: 'none'
  })
  container.innerHTML = inner
  document.body.appendChild(container)

  try {
    const range = document.createRange()
    range.selectNodeContents(container)
    const sel = window.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    const ok = document.execCommand('copy')
    sel.removeAllRanges()
    return ok
  } catch {
    return false
  } finally {
    document.body.removeChild(container)
  }
}

async function copyWithClipboardApi(fullHtml: string, plain: string, useCfHtml: boolean): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false
  }
  try {
    // IMPORTANTE: não enviar CF_HTML (com header) como text/html.
    // Isso pode aparecer como texto em alguns Outlooks.
    // Mantemos o HTML completo; o SO/cliente decide como interpretar.
    const htmlBlob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const textBlob = new Blob([plain], { type: 'text/plain;charset=utf-8' })
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      })
    ])
    return true
  } catch {
    return false
  }
}

/**
 * Copia HTML rico para uso em Outlook / Word / e-mail.
 */
export async function copyRichHtmlToClipboard(fullHtml: string): Promise<void> {
  const plain = htmlToPlainText(fullHtml)

  if (copyUsingCopyEvent(fullHtml, plain)) {
    return
  }

  // Não usar CF_HTML header via Clipboard API (evita texto "Version:0.9..." em alguns Outlooks).
  if (await copyWithClipboardApi(fullHtml, plain, false)) {
    return
  }

  if (copyHtmlUsingIframeExecCommand(fullHtml)) {
    return
  }

  if (copyHtmlUsingContentEditableExecCommand(fullHtml)) {
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plain)
    return
  }

  throw new Error('Clipboard não disponível')
}
