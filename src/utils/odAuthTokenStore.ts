import { KVNamespace } from '@cloudflare/workers-types'

interface Env {
  ONEDRIVE_CF_INDEX_KV: KVNamespace
}

export async function getOdAuthTokens(env: Env): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  const kv = env.ONEDRIVE_CF_INDEX_KV
  const accessToken = await kv.get('access_token')
  const refreshToken = await kv.get('refresh_token')

  return {
    accessToken,
    refreshToken,
  }
}

export async function storeOdAuthTokens(
  env: Env,
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
  const kv = env.ONEDRIVE_CF_INDEX_KV
  await kv.put('access_token', accessToken, { expirationTtl: accessTokenExpiry })
  await kv.put('refresh_token', refreshToken)
}
