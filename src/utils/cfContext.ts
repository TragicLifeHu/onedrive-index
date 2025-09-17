import { KVNamespace } from '@cloudflare/workers-types'

interface CloudflareEnv {
  ONEDRIVE_CF_INDEX_KV: KVNamespace
  // Add other environment variables as needed
}

let cfEnv: CloudflareEnv | null = null

export function setCfEnv(env: CloudflareEnv): void {
  cfEnv = env
}

export function getCfEnv(): CloudflareEnv | null {
  return cfEnv
}
