import type { OdThumbnail } from '../../types'

import { getQueryParam, normalizePathParam, isMissingPath, getOdProtectedToken } from '../../utils/api-helpers'

import { checkAuthRoute, encodePath, getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'redaxios'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    res.status(403).json({ error: 'No access token.' })
    return
  }

  // Get item thumbnails by its path since we will later check if it is protected
  const path = getQueryParam(req, 'path', '')
  const size = getQueryParam(req, 'size', 'medium') as 'large' | 'medium' | 'small'
  const odpt = getQueryParam(req, 'odpt', '')

  // Check whether the size is valid - must be one of 'large', 'medium', or 'small'
  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    res.status(400).json({ error: 'Invalid size.' })
    return
  }
  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (isMissingPath(path)) {
    res.status(400).json({ error: 'No path specified.' })
    return
  }

  const cleanPath = normalizePathParam(path)

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, getOdProtectedToken(req, odpt))
  // Status code other than 200 means user has not authenticated yet
  if (code !== 200) {
    res.status(code).json({ error: message })
    return
  }

  const requestPath = encodePath(cleanPath)
  const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
  const isRoot = requestPath === ''

  // Prepare headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': apiConfig.cacheControlHeader,
  }
  // If route is protected, disable caching
  if (message !== '') headers['Cache-Control'] = 'no-cache'

  try {
    const { data } = await axios.get(`${requestUrl}${isRoot ? '' : ':'}/thumbnails`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const thumbnailUrl = data.value && data.value.length > 0 ? (data.value[0] as OdThumbnail)[size].url : null
    if (thumbnailUrl) {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
      res.status(302).setHeader('Location', thumbnailUrl)
      res.end()
      return
    } else {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
      res.status(400).json({ error: "The item doesn't have a valid thumbnail." })
      return
    }
  } catch (error: any) {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
    res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
  }
}
