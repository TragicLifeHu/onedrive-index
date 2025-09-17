import {
  getQueryParam,
  normalizePathParam,
  isMissingPath,
  getOdProtectedToken,
  parseBooleanParam,
} from '../../utils/api-helpers'
import axios from 'redaxios'

import apiConfig from '../../../config/api.config'
import { checkAuthRoute, encodePath, getAccessToken } from '.'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    res.status(403).json({ error: 'No access token.' })
    return
  }

  // Parse query
  const path = getQueryParam(req, 'path', '/') || '/'
  const odpt = getQueryParam(req, 'odpt', '')
  const proxy = parseBooleanParam(getQueryParam(req, 'proxy', 'false'))

  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (isMissingPath(path)) {
    res.status(400).json({ error: 'No path specified.' })
    return
  }

  const cleanPath = normalizePathParam(path)

  // Handle protected routes authentication
  const odTokenHeader = getOdProtectedToken(req, odpt)

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odTokenHeader)
  if (code !== 200) {
    res.status(code).json({ error: message })
    return
  }

  // Prepare headers
  const headers: Record<string, string> = {
    'Cache-Control': apiConfig.cacheControlHeader,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
  if (message !== '') headers['Cache-Control'] = 'no-cache'

  try {
    // Handle response from OneDrive API
    const requestUrl = `${apiConfig.driveApi}/root${encodePath(cleanPath)}`
    const { data } = await axios.get(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        // OneDrive international version fails when only selecting the downloadUrl (what a stupid bug)
        select: 'id,size,@microsoft.graph.downloadUrl',
      },
    })

    if ('@microsoft.graph.downloadUrl' in data) {
      const size: number | undefined = 'size' in data ? Number(data['size']) : undefined
      const downloadUrl: string = data['@microsoft.graph.downloadUrl'] as string

      if (proxy) {
        // Proxy file through the API when requested
        const fileResponse = await fetch(downloadUrl)
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'
        const ab = await fileResponse.arrayBuffer()
        headers['Content-Type'] = contentType
        if (size) headers['Content-Length'] = String(size)
        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
        res.status(200).send(Buffer.from(ab))
        return
      } else {
        // Redirect to download url
        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
        res.status(302).setHeader('Location', downloadUrl)
        res.end()
        return
      }
    } else {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
      res.status(404).json({ error: 'No download url found.' })
      return
    }
  } catch (error: any) {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
    res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
  }
}
