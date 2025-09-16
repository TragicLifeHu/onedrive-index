import { KVNamespace } from '@cloudflare/workers-types'

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  // In development or if KV binding not provided, return empty tokens
  const kv = (process.env as any).ONEDRIVE_CF_INDEX_KV as KVNamespace | undefined
  if (!kv) {
    return { accessToken: undefined, refreshToken: undefined }
  }
  const accessToken = await kv.get('access_token')
  const refreshToken = await kv.get('refresh_token')

  return {
    accessToken,
    refreshToken,
  }
}

export async function storeOdAuthTokens({
  accessToken,
  accessTokenExpiry,
  refreshToken,
}: {
  accessToken: string
  accessTokenExpiry: number
  refreshToken: string
}): Promise<void> {
  // In development or if KV binding not provided, skip storing tokens
  const kv = (process.env as any).ONEDRIVE_CF_INDEX_KV as KVNamespace | undefined
  if (!kv) return
  await kv.put('access_token', accessToken, { expirationTtl: accessTokenExpiry })
  await kv.put('refresh_token', refreshToken)
}
