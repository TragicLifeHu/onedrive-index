import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'
import React from 'react'

// Dynamically import DocViewer to avoid SSR issues where document is not defined
const DocViewer: any = dynamic(() => import('react-doc-viewer').then(m => (m as any).default ?? (m as any)), {
  ssr: false,
})

const PDFEmbedPreview: React.FC<{ file: any }> = ({ file: _file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const rawUrl = `${getBaseUrl()}/api/raw?path=${encodeURIComponent(asPath)}${hashedToken ? `&odpt=${hashedToken}` : ''}`
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
