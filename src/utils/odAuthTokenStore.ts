import { KVNamespace } from '@cloudflare/workers-types'

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  const kv = (process.env.ONEDRIVE_CF_INDEX_KV as any) as KVNamespace
  if (!kv) {
    throw new Error('KV Namespace is not defined')
  }
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
  const kv = (process.env.ONEDRIVE_CF_INDEX_KV as any) as KVNamespace
  if (!kv) {
    throw new Error('KV Namespace is not defined')
  }
  await kv.put('access_token', accessToken, { expirationTtl: accessTokenExpiry })
  await kv.put('refresh_token', refreshToken)
}
