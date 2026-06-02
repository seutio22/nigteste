import type { ComunicarMercadoConteudoCompartilhado, ComunicarMercadoTopico } from './placementComunicarMercado'

/** Ordem das seções conforme modelo de e-mail Placement / MDS. */
export const EMAIL_GRUPO_ORDER = [
  'Fornecedor',
  'Estipulante',
  'Subfaturas',
  'Dados gerais',
  'Dados gerais (Kick off)',
  'Sinistralidade',
  'Planos atuais',
  'Beneficiários',
  'Localidades',
  'Premissas para cotação',
] as const

const FF = 'font-family:Arial, Helvetica, sans-serif'
const COLOR_PRIMARY = '#002561'
const COLOR_MUTED = '#475569'
const BG_PAGE = '#cbd6e2'
const BG_WHITE = '#ffffff'
const BG_ALT = '#e6f6fc'
const BG_CARD = '#f7fbfe'
const BORDER_CARD = '#cfeaf6'
const ACCENT = '#009fdf'
const LOGO_FOOTER =
  'https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlBreaks(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>')
}

export function sortTopicosForEmail(topicos: ComunicarMercadoTopico[]): ComunicarMercadoTopico[] {
  const rank = (grupo: string) => {
    const idx = EMAIL_GRUPO_ORDER.indexOf(grupo as (typeof EMAIL_GRUPO_ORDER)[number])
    return idx >= 0 ? idx : EMAIL_GRUPO_ORDER.length + 1
  }
  return [...topicos].sort((a, b) => {
    const dr = rank(a.grupo) - rank(b.grupo)
    if (dr !== 0) return dr
    return a.rotulo.localeCompare(b.rotulo, 'pt-BR')
  })
}

function topicoRow(rotulo: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0; vertical-align:top; ${FF};">
      <p style="margin:0; line-height:165%; font-size:14px; color:${COLOR_PRIMARY}; ${FF};">
        <strong style="color:${COLOR_PRIMARY};">${escapeHtml(rotulo)}:</strong>
        ${htmlBreaks(valor)}
      </p>
    </td>
  </tr>`
}

function sectionBlock(
  title: string,
  bg: string,
  innerRows: string,
  alt = false
): string {
  if (!innerRows.trim()) return ''
  const headingColor = alt ? COLOR_PRIMARY : COLOR_PRIMARY
  return `<tr>
    <td bgcolor="${bg}" style="background-color:${bg}; padding:24px 40px; ${FF};">
      <p style="margin:0 0 12px 0; font-size:16px; font-weight:700; line-height:150%; color:${headingColor}; border-bottom:2px solid ${ACCENT}; padding-bottom:6px; ${FF};">
        ${escapeHtml(title)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        ${innerRows}
      </table>
    </td>
  </tr>`
}

function imageSection(title: string, dataUri: string, alt: string, altBg: boolean): string {
  if (!dataUri) return ''
  const bg = altBg ? BG_ALT : BG_WHITE
  return `<tr>
    <td bgcolor="${bg}" style="background-color:${bg}; padding:24px 40px; ${FF};">
      <p style="margin:0 0 12px 0; font-size:16px; font-weight:700; color:${COLOR_PRIMARY}; border-bottom:2px solid ${ACCENT}; padding-bottom:6px; ${FF};">
        ${escapeHtml(title)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;">
            <img src="${dataUri}" alt="${escapeHtml(alt)}" width="520" style="display:block; max-width:100%; height:auto; border:1px solid ${BORDER_CARD}; border-radius:4px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

export type BuildMdsEmailHtmlParams = {
  assuntoTitulo: string
  fornecedorNome: string
  introHtml: string
  topicos: ComunicarMercadoTopico[]
  shared: ComunicarMercadoConteudoCompartilhado
  analistaNome: string
  ticket?: string
}

export function buildComunicarMercadoMdsEmailHtml(params: BuildMdsEmailHtmlParams): string {
  const sorted = sortTopicosForEmail(params.topicos)
  const skipTextForImage = (t: ComunicarMercadoTopico) =>
    (t.grupo === 'Sinistralidade' && !!params.shared.sinistralidade.imagemDataUri) ||
    (t.grupo === 'Localidades' &&
      params.shared.localidades.incluirNoEmail &&
      !!params.shared.localidades.imagemDataUri)

  const byGrupo = new Map<string, ComunicarMercadoTopico[]>()
  for (const t of sorted) {
    if (skipTextForImage(t)) continue
    if (!t.valor.trim() || t.valor.trim() === '—') continue
    const list = byGrupo.get(t.grupo) ?? []
    list.push(t)
    byGrupo.set(t.grupo, list)
  }

  let sectionIndex = 0
  let sectionsHtml = ''
  for (const grupo of EMAIL_GRUPO_ORDER) {
    const items = byGrupo.get(grupo)
    if (!items?.length) continue
    const bg = sectionIndex % 2 === 0 ? BG_WHITE : BG_ALT
    const rows = items.map((t) => topicoRow(t.rotulo, t.valor)).join('')
    sectionsHtml += sectionBlock(grupo, bg, rows, sectionIndex % 2 === 1)
    sectionIndex += 1
    byGrupo.delete(grupo)
  }
  for (const [grupo, items] of byGrupo) {
    const bg = sectionIndex % 2 === 0 ? BG_WHITE : BG_ALT
    const rows = items.map((t) => topicoRow(t.rotulo, t.valor)).join('')
    sectionsHtml += sectionBlock(grupo, bg, rows, sectionIndex % 2 === 1)
    sectionIndex += 1
  }

  if (params.shared.sinistralidade.imagemDataUri) {
    sectionsHtml += imageSection(
      'Sinistralidade — gráfico / relatório',
      params.shared.sinistralidade.imagemDataUri,
      'Sinistralidade',
      sectionIndex % 2 === 1
    )
    sectionIndex += 1
  }
  if (params.shared.localidades.incluirNoEmail && params.shared.localidades.imagemDataUri) {
    sectionsHtml += imageSection(
      'Distribuição por localidade',
      params.shared.localidades.imagemDataUri,
      'Localidades',
      sectionIndex % 2 === 1
    )
  }

  const analista = escapeHtml(params.analistaNome.trim() || 'Equipe Placement MDS')
  const ticketLine = params.ticket?.trim()
    ? `<p style="margin:8px 0 0 0; font-size:13px; color:${COLOR_MUTED}; ${FF};">Processo: ${escapeHtml(params.ticket.trim())}</p>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.assuntoTitulo)}</title>
</head>
<body bgcolor="${BG_PAGE}" style="margin:0 !important; padding:0 !important; ${FF}; font-size:15px; color:${COLOR_PRIMARY}; word-break:break-word;">
  <div style="background-color:${BG_PAGE};" bgcolor="${BG_PAGE}">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:0; width:100% !important; min-width:320px !important; border-collapse:collapse;">
      <tr>
        <td align="center" valign="top" style="padding:20px 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; border-collapse:collapse;">
            <tr>
              <td bgcolor="${BG_WHITE}" style="background-color:${BG_WHITE}; padding:28px 40px 22px 40px; ${FF};">
                <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${ACCENT}; ${FF};">Placement · Comunicação ao mercado</p>
                <h1 style="margin:0; font-size:20px; line-height:150%; color:${COLOR_PRIMARY}; ${FF};">${escapeHtml(params.assuntoTitulo)}</h1>
                ${ticketLine}
                <p style="margin:16px 0 0 0; line-height:175%; font-size:15px; color:${COLOR_PRIMARY}; ${FF};">
                  ${params.introHtml}
                </p>
              </td>
            </tr>
            ${sectionsHtml}
            <tr>
              <td bgcolor="${BG_WHITE}" style="background-color:${BG_WHITE}; padding:24px 40px; ${FF};">
                <p style="margin:0; line-height:175%; color:${COLOR_PRIMARY}; ${FF};">Atenciosamente,</p>
                <p style="margin:8px 0 0 0; line-height:175%; font-weight:700; color:${COLOR_PRIMARY}; ${FF};">${analista}</p>
                <p style="margin:4px 0 0 0; line-height:175%; font-size:13px; color:${COLOR_MUTED}; ${FF};">MDS Corretor de Seguros · Placement</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLOR_PRIMARY}" style="background-color:${COLOR_PRIMARY}; padding:22px 40px; ${FF};">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="middle" style="${FF}; color:#ffffff;">
                      <p style="margin:0; font-size:13px; line-height:150%; color:#ffffff; ${FF};">Proteger seu mundo é a nossa ambição.</p>
                      <p style="margin:8px 0 0 0; font-size:11px; line-height:150%; color:#cfe8ff; ${FF};">Mensagem gerada pelo NIG · Núcleo de Informações Gerenciais</p>
                    </td>
                    <td align="right" valign="middle">
                      <img alt="MDS" src="${LOGO_FOOTER}" width="63" style="display:block; border:0; width:63px; height:auto;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}
