/**
 * Cloudflare R2 — armazenamento de objetos barato (API compatível com S3).
 * Crie um bucket em Cloudflare Dashboard → R2 → Create bucket → API Tokens (S3).
 *
 * No bucket R2, em Settings → CORS, permita PUT/GET do teu domínio do front (origem)
 * para uploads/downloads diretos com URL pré-assinada.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const PRESIGN_PUT_SECONDS = 60 * 15
const PRESIGN_GET_SECONDS = 60 * 60

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  )
}

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID!
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME!
}

export function sanitizeOriginalFileName(name: string): string {
  const base = name.replace(/[/\\]/g, '').replace(/\0/g, '').trim().slice(0, 180)
  return base || 'file'
}

export async function presignPut(
  key: string,
  contentType: string
): Promise<{ url: string; expiresIn: number }> {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_PUT_SECONDS })
  return { url, expiresIn: PRESIGN_PUT_SECONDS }
}

export async function presignGet(key: string): Promise<{ url: string; expiresIn: number }> {
  const client = getClient()
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  })
  const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_GET_SECONDS })
  return { url, expiresIn: PRESIGN_GET_SECONDS }
}
