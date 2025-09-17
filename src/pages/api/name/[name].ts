import { default as rawFileHandler } from '../raw'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  return rawFileHandler(req, res)
}
