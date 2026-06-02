/**
 * Incorpora imagens do comunicado (header + logo MDS) como data URI no HTML,
 * para o Outlook exibir as mesmas imagens que o ficheiro .eml (CID inline).
 */

const HEADER_PATH = '/email/MDS_NIG_Header_Email_02.png'
const LOGO_PATH = '/email/MDS_LOGObranco.png'
const HUBSPOT_LOGO_URL =
  'https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function fetchAsDataUri(path: string, mimeType = 'image/png'): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Falha ao carregar imagem: ${path}`)
  const buf = await res.arrayBuffer()
  return `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buf))}`
}

/**
 * Substitui URLs relativas/absolutas das imagens do template por data URI (base64).
 */
export async function embedEmailImagesForOutlookClipboard(html: string): Promise<string> {
  const [headerUri, logoUri] = await Promise.all([
    fetchAsDataUri(HEADER_PATH),
    fetchAsDataUri(LOGO_PATH),
  ])

  let out = html
  out = out.split(HEADER_PATH).join(headerUri)
  out = out.split(HUBSPOT_LOGO_URL).join(logoUri)
  return out
}
