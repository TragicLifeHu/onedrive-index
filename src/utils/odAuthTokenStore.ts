import { KVNamespace } from '@cloudflare/workers-types'

function getKvBinding(): KVNamespace {
  const kv = (globalThis as any).ONEDRIVE_CF_INDEX_KV as KVNamespace | undefined
  if (!kv) {
    throw new Error('KV Namespace not found. Ensure ONEDRIVE_CF_INDEX_KV is bound correctly.')
  }
  return kv
}

export async function getOdAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const kv = getKvBinding()
  const accessToken = await kv.get('access_token')
  const refreshToken = await kv.get('refresh_token')

  return {
    accessToken,
    refreshToken,
  }
}

export async function storeOdAuthTokens(
  {
    accessToken,
    accessTokenExpiry,
    refreshToken,
  }: {
    accessToken: string
    accessTokenExpiry: number
    refreshToken: string
  }
): Promise<void> {
  const kv = getKvBinding()
  // expirationTtl expects seconds; ensure it's a positive integer
  const ttl = Math.max(0, Math.floor(accessTokenExpiry || 0))
  await kv.put('access_token', accessToken, { expirationTtl: ttl })
  await kv.put('refresh_token', refreshToken)
}
