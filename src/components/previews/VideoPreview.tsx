import type { OdFileObject } from '../../types'

import { FC, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import type { PlyrOptions, PlyrSource } from 'plyr-react'
import { useClipboard } from 'use-clipboard-copy'
import dynamic from 'next/dynamic'
import useSWR from 'swr'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import { fetcher } from '../../utils/fetchWithSWR'

import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import Loading from '../Loading'
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu'
// import Plyr from 'plyr-react'
const Plyr: any = dynamic(() => import('plyr-react').then(m => (m as any).default ?? (m as any)), { ssr: false })

import 'plyr-react/plyr.css'

// Helper function to escape characters for inclusion in a regular expression
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitles: {
    label: string
    src: string
  }[]
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitles, isFlv, mpegts }) => {
  useEffect(() => {
    // Really hacky way to inject subtitles as file blobs into the video element
    if (subtitles.length > 0) {
      console.log('Loading subtitles:', subtitles)

      // Wait a bit for Plyr to initialize
      setTimeout(() => {
        subtitles.forEach((subtitle, i) => {
          axios
            .get(subtitle.src, { responseType: 'blob' })
            .then(resp => {
              // More specific track selection - look for tracks in the video element
              const video = document.querySelector('video')
              const tracks = video?.querySelectorAll('track')
              const track = tracks?.[i]

              if (track) {
                const blobUrl = URL.createObjectURL(resp.data)
                track.setAttribute('src', blobUrl)
                console.log(`Loaded subtitle: ${subtitle.label} -> ${blobUrl}`)
              } else {
                console.warn(`Track element not found for subtitle ${i}: ${subtitle.label}`)
              }
            })
            .catch(error => {
              console.error(`Could not load subtitle: ${subtitle.label}`, error)
            })
        })
      }, 500) // Wait 500ms for Plyr to initialize
    }

    if (isFlv) {
      const loadFlv = () => {
        // Really hacky way to get the exposed video element from Plyr
        const video = document.getElementById('plyr') as HTMLVideoElement | null
        if (!video) return
        const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        flv.attachMediaElement(video)
        flv.load()
      }
      loadFlv()
    }
  }, [videoUrl, isFlv, mpegts, subtitles])

  // Common plyr configs, including the video source and plyr options
  const plyrSource = {
    type: 'video',
    title: videoName,
    poster: thumbnail,
    tracks: subtitles.map((subtitle, index) => ({
      kind: 'captions',
      label: subtitle.label,
      src: '', // Will be populated by the useEffect
      default: subtitle.label.toLowerCase() === 'default' || index === 0, // Make first subtitle default if no "default" label
    })),
    sources: !isFlv ? [{ src: videoUrl }] : [],
  }
  const plyrOptions: PlyrOptions = {
    ratio: `${width ?? 16}:${height ?? 9}`,
    fullscreen: { iosNative: true },
    captions: { active: true, update: true },
  }
  if (!isFlv) {
    return <Plyr source={plyrSource as PlyrSource} options={plyrOptions} />
  }
  // For FLV, Plyr is not used for playback, just for UI
  return <video id="plyr" controls poster={thumbnail} style={{ width: '100%', height: '100%' }} />
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)
  const clipboard = useClipboard()

  const [menuOpen, setMenuOpen] = useState(false)

  const parentPath = asPath.substring(0, asPath.lastIndexOf('/'))
  const { data } = useSWR(
    `/api/item?path=${encodeURIComponent(parentPath)}${hashedToken ? `&odpt=${hashedToken}` : ''}`,
    fetcher
  )

  const subtitles = useMemo(() => {
    if (!data || !data.folder) {
      return []
    }
    const videoName = file.name.substring(0, file.name.lastIndexOf('.'))
    const safeVideoName = escapeRegExp(videoName)
    const subtitleRegex = new RegExp(`^${safeVideoName}(\\..*)?\\.vtt$`)

    return data.folder.value.reduce((acc: { label: string; src: string }[], item: OdFileObject) => {
      const match = item.name.match(subtitleRegex)
      if (match) {
        const label = match[1] ? match[1].substring(1) : 'Default'
        const encodedVtt = encodeURIComponent(`${parentPath}/${item.name}`)
        acc.push({
          label,
          src: `/api/raw?path=${encodedVtt}${hashedToken ? `&odpt=${hashedToken}` : ''}`,
        })
      }
      return acc
    }, [])
  }, [data, file.name, hashedToken, parentPath])

  // OneDrive generates thumbnails for its video files, we pick the thumbnail with the highest resolution
  const thumbnail = `/api/thumbnail?path=${encodeURIComponent(asPath)}&size=large${
    hashedToken ? `&odpt=${hashedToken}` : ''
  }`

  // Encode the video path
  const encodedPath = encodeURIComponent(asPath)
  const videoUrl = `/api/raw?path=${encodedPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const isFlv = getExtension(file.name) === 'flv'
  const [mpegts, setMpegts] = useState<any>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !isFlv) return
    import('mpegts.js')
      .then(mod => setMpegts(mod.default))
      .catch(err => console.error('Failed to load mpegts.js:', err))
  }, [isFlv])

  return (
    <>
      <CustomEmbedLinkMenu path={asPath} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <PreviewContainer>
        {isFlv && mpegts === null ? (
          <Loading loadingText={'Loading FLV extension...'} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitles={subtitles}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>

      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={'Download'}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`)
              toast.success('Copied direct link to clipboard.')
            }}
            btnColor="pink"
            btnText={'Copy direct link'}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => setMenuOpen(true)}
            btnColor="teal"
            btnText={'Customise link'}
            btnIcon="pen"
          />

          <DownloadButton
            onClickCallback={() => window.open(`iina://weblink?url=${getBaseUrl()}${videoUrl}`)}
            btnText="IINA"
            btnImage="/players/iina.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`vlc://${getBaseUrl()}${videoUrl}`)}
            btnText="VLC"
            btnImage="/players/vlc.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`potplayer://${getBaseUrl()}${videoUrl}`)}
            btnText="PotPlayer"
            btnImage="/players/potplayer.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`nplayer-http://${window?.location.hostname ?? ''}${videoUrl}`)}
            btnText="nPlayer"
            btnImage="/players/nplayer.png"
          />
          <DownloadButton
            onClickCallback={() =>
              window.open(
                `intent://${getBaseUrl()}${videoUrl}#Intent;type=video/any;package=is.xyz.mpv;scheme=https;end;`,
              )
            }
            btnText="mpv-android"
            btnImage="/players/mpv-android.png"
          />
        </div>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
