import type { OdFileObject } from '../../types'
import { FC} from 'react'
import { useRouter } from 'next/router'

import DocViewer from 'react-doc-viewer'

import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getStoredToken } from '../../utils/protectedRouteHandler'

const OfficePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  // prepare documents for DocViewer
  const docUrl = encodeURIComponent(
    `${getBaseUrl()}/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  )
  const docs = [{ uri: decodeURIComponent(docUrl) }]

  return (
    <>
      <DocViewer documents={docs} />
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </>
  )
}

export default OfficePreview
