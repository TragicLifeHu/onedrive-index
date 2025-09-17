import axios from 'redaxios'

import { getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Get access token from storage
  const accessToken = await getAccessToken()

  // Get item details (specifically, its path) by its unique ID in OneDrive
  const idParam = req.query.id
  const id = Array.isArray(idParam) ? (idParam[0] ?? '') : (idParam ?? '')

  // TODO: Set edge function caching for faster load times

  const idPattern = /^[a-zA-Z0-9]+$/
  if (!idPattern.test(id)) {
    // ID contains characters other than letters and numbers
    res.status(400).json({ error: 'Invalid driveItem ID.' })
    return
  }
  const itemApi = `${apiConfig.driveApi}/items/${id}`
  try {
    const { data } = await axios.get(itemApi, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        select: 'id,name,parentReference',
      },
    })
    res.status(200).json(data)
  } catch (error: any) {
    res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
  }
}
