import { posix as pathPosix } from 'path-browserify'
import axios from 'redaxios'

import { cacheControlHeader, driveApi } from '../../../config/api.config'
import { checkAuthRoute, encodePath, getAccessToken } from '.'
import { NextRequest } from 'next/server'

import '../../polyfills'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), { status: 403 })
  }

  const { path = '/', odpt = '', proxy = false } = Object.fromEntries(req.nextUrl.searchParams)

  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (path === '[...path]') {
    return new Response(JSON.stringify({ error: 'No path specified.' }), { status: 400 })
  }

  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))

  // Handle protected routes authentication
  const odTokenHeader = (req.headers.get('od-protected-token') as string) ?? odpt

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odTokenHeader)
  // Status code other than 200 means user has not authenticated yet
  if (code !== 200) {
    return new Response(JSON.stringify({ error: message }), { status: code })
  }

  let headers = {
    'Cache-Control': cacheControlHeader,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  // If message is empty, then the path is not protected.
  // Conversely, protected routes are not allowed to serve from cache.
  if (message !== '') {
    headers['Cache-Control'] = 'no-cache'
  }

  try {
    // Handle response from OneDrive API
    const requestUrl = `${driveApi}/root${encodePath(cleanPath)}`
    const { data } = await axios.get(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        // OneDrive international version fails when only selecting the downloadUrl (what a stupid bug)
        select: 'id,size,@microsoft.graph.downloadUrl',
      },
    })

    if ('@microsoft.graph.downloadUrl' in data) {
      // Only proxy raw file content response for files up to 4MB
      if (proxy && 'size' in data && data['size'] < 4194304) {
        // Fetch and proxy the file content using Web Streams API
        const fileResponse = await fetch(data['@microsoft.graph.downloadUrl'] as string)
        // Prepare headers for the proxied response
        headers['Content-Type'] = fileResponse.headers.get('Content-Type') || 'application/octet-stream'
        headers['Content-Length'] = String(data['size'])
        // Return the streamed response
        return new Response(fileResponse.body, { status: 200, headers })
      } else {
        headers['Location'] = data['@microsoft.graph.downloadUrl'] as string
        return new Response(null, { status: 302, headers: headers})
      }
    } else {
      return new Response(JSON.stringify({ error: 'No download url found.' }), { status: 404, headers: headers })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
      status: error?.response?.status ?? 500,
      headers: headers
    })
  }
}
