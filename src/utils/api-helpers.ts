import type { NextApiRequest } from 'next'
import { posix as pathPosix } from 'path-browserify'

export function getQueryParam(req: NextApiRequest, key: string, def: string = ''): string {
  const v = req.query[key]
  if (Array.isArray(v)) return (v[0] ?? def) as string
  return (v as string) ?? def
}

export function normalizePathParam(path: string): string {
  return pathPosix.resolve('/', pathPosix.normalize(path))
}

export function isMissingPath(path: string): boolean {
  return path === '[...path]'
}

export function getOdProtectedToken(req: NextApiRequest, fallback: string = ''): string {
  return (req.headers['od-protected-token'] as string) ?? fallback
}

export function parseBooleanParam(val: string): boolean {
  const s = (val || '').toString().trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}
