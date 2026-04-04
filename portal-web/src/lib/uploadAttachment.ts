import { api } from './api'

/** Referência guardada em `answers` (JSON no caso) — aponta para objeto no Cloudflare R2. */
export type AttachmentRef = {
  key: string
  fileName: string
  contentType: string
}

function guessContentType(file: File): string {
  if (file.type && file.type !== '') return file.type
  const n = file.name.toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
  if (n.endsWith('.webp')) return 'image/webp'
  if (n.endsWith('.gif')) return 'image/gif'
  if (n.endsWith('.txt')) return 'text/plain'
  if (n.endsWith('.csv')) return 'text/csv'
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'application/octet-stream'
}

export async function uploadAttachment(file: File): Promise<
  { ok: true; ref: AttachmentRef } | { ok: false; error: string }
> {
  const contentType = guessContentType(file)
  const presign = await api<{
    uploadUrl: string
    key: string
    method: string
    headers: { 'Content-Type': string }
    maxFileBytes: number
    expiresIn: number
  }>('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType }),
  })

  if (!presign.ok || !presign.data?.uploadUrl) {
    return {
      ok: false,
      error:
        presign.error ||
        (presign.status === 503
          ? 'Armazenamento de arquivos não configurado na API (Cloudflare R2).'
          : 'Não foi possível preparar o upload.'),
    }
  }

  const max = presign.data.maxFileBytes ?? 25 * 1024 * 1024
  if (file.size > max) {
    return { ok: false, error: `Arquivo acima do limite (${Math.round(max / (1024 * 1024))} MB).` }
  }

  const putRes = await fetch(presign.data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': presign.data.headers?.['Content-Type'] ?? contentType,
    },
    body: file,
  })

  if (!putRes.ok) {
    return { ok: false, error: 'Falha ao enviar o arquivo para o armazenamento (Cloudflare).' }
  }

  return {
    ok: true,
    ref: {
      key: presign.data.key,
      fileName: file.name,
      contentType,
    },
  }
}

export async function getDownloadUrlForKey(key: string): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const r = await api<{ downloadUrl: string; expiresIn: number }>('/uploads/presign-download', {
    method: 'POST',
    body: JSON.stringify({ key }),
  })
  if (!r.ok || !r.data?.downloadUrl) {
    return { ok: false, error: r.error || 'Não foi possível criar o link de download.' }
  }
  return { ok: true, url: r.data.downloadUrl }
}

export function isAttachmentRef(v: unknown): v is AttachmentRef {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.key === 'string' && typeof o.fileName === 'string'
}

/** Valor guardado em `dynValues` para campos `file` (string JSON). */
export function parseAttachmentRefString(raw: string): AttachmentRef | null {
  if (!raw.trim()) return null
  try {
    const o = JSON.parse(raw) as AttachmentRef
    if (o && typeof o.key === 'string' && typeof o.fileName === 'string') return o
  } catch {
    /* ignore */
  }
  return null
}
