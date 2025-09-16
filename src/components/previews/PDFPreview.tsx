import { useRouter } from 'next/router'
import DocViewer from 'react-doc-viewer'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'
import React from 'react'

const PDFEmbedPreview: React.FC<{ file: any }> = ({ file: _file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const rawUrl = `${getBaseUrl()}/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const docs = [{ uri: rawUrl }]

  return (
    <div>
      <DocViewer documents={docs} />
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </div>
  )
}

export default PDFEmbedPreview
