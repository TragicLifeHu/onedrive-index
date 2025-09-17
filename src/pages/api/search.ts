import axios from 'redaxios'

import { encodePath, getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import siteConfig from '../../../config/site.config'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Sanitize the search query
 *
 * @param query User search query, which may contain special characters
 * @returns Sanitised query string, which:
 * - encodes the '<' and '>' characters,
 * - replaces '?' and '/' characters with ' ',
 * - replaces ''' with ''''
 * Reference: https://stackoverflow.com/questions/41491222/single-quote-escaping-in-microsoft-graph.
 */
function sanitiseQuery(query: string): string {
  const sanitisedQuery = query
    .replace(/'/g, "''")
    .replace('<', ' &lt; ')
    .replace('>', ' &gt; ')
    .replace('?', ' ')
    .replace('/', ' ')
  return encodeURIComponent(sanitisedQuery)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Get access token from storage
  const accessToken = await getAccessToken()

  // Query parameter from request
  const qParam = req.query.q
  const searchQuery = Array.isArray(qParam) ? (qParam[0] ?? '') : ((qParam as string) ?? '')

  // TODO: Set edge function caching for faster load times

  // Construct Microsoft Graph Search API URL, and perform search only under the base directory
  const searchRootPath = encodePath('/')
  const encodedPath = searchRootPath === '' ? searchRootPath : searchRootPath + ':'
  const searchApi = `${apiConfig.driveApi}/root${encodedPath}/search(q='${sanitiseQuery(searchQuery)}')`
  try {
    const { data } = await axios.get(searchApi, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        select: 'id,name,file,folder,parentReference',
        top: siteConfig.maxItems,
      },
    })
    res.status(200).json(data.value)
  } catch (error: any) {
    res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
  }
}
