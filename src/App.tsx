import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Download, Grid2X2, Images, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { useCamera } from './hooks/useCamera'
import { captureFrame, compileReel, composePhotos, Layout, preferredRecordingType } from './lib/media'

type Screen = 'welcome' | 'camera' | 'processing' | 'results'
type Status = 'idle' | 'countdown' | 'flash' | 'review'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function App() {
  const { videoRef, streamRef, ready, error, start } = useCamera()
  const [screen, setScreen] = useState<Screen>('welcome')
  const [layout, setLayout] = useState<Layout>('strip')
  const [status, setStatus] = useState<Status>('idle')
  const [count, setCount] = useState(5)
  const [shot, setShot] = useState(0)
  const [progress, setProgress] = useState('Building your strip')
  const [jpeg, setJpeg] = useState<Blob | null>(null)
  const [reel, setReel] = useState<Blob | null>(null)
  const [videoWarning, setVideoWarning] = useState<string | null>(null)
  const running = useRef(false)

  const quota = layout === 'strip' ? 3 : 4
  const jpegUrl = useMemo(() => jpeg ? URL.createObjectURL(jpeg) : null, [jpeg])
  const reelUrl = useMemo(() => reel ? URL.createObjectURL(reel) : null, [reel])
  useEffect(() => () => { if (jpegUrl) URL.revokeObjectURL(jpegUrl); if (reelUrl) URL.revokeObjectURL(reelUrl) }, [jpegUrl, reelUrl])

  const openCamera = async () => { setScreen('camera'); await sleep(80); await start() }

  const runSession = useCallback(async () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream || running.current) return
    running.current = true
    const photos: Blob[] = []
    const clips: Blob[] = []
    setVideoWarning(null)
    try {
      for (let index = 0; index < quota; index += 1) {
        setShot(index + 1)
        const chunks: BlobPart[] = []
        let recorder: MediaRecorder | null = null
        if ('MediaRecorder' in window) {
          const mimeType = preferredRecordingType()
          recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined)
          recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
          recorder.start(250)
        }
        setStatus('countdown')
        for (let second = 5; second > 0; second -= 1) { setCount(second); await sleep(1000) }
        photos.push(await captureFrame(video))
        setStatus('flash')
        if (recorder) {
          const clip = await new Promise<Blob>((resolve) => {
            recorder!.onstop = () => resolve(new Blob(chunks, { type: recorder!.mimeType || 'video/webm' }))
            recorder!.stop()
          })
          clips.push(clip)
        }
        await sleep(180)
        setStatus('review')
        await sleep(1200)
      }
      setScreen('processing')
      const strip = await composePhotos(photos, layout)
      setJpeg(strip)
      if (clips.length === quota) {
        try { setProgress('Starting the local video engine'); setReel(await compileReel(clips, setProgress)) }
        catch { setVideoWarning('The photo strip is ready, but this browser could not create the MP4 reel.'); setReel(null) }
      } else setVideoWarning('Video recording is not supported by this browser. Your photo strip is ready.')
      setScreen('results')
    } catch {
      setVideoWarning('The session was interrupted. Please try again.')
      setStatus('idle')
      setScreen('camera')
    } finally { running.current = false }
  }, [layout, quota, streamRef, videoRef])

  const files = () => [
    jpeg && new File([jpeg], `studio9060-${Date.now()}-strip.jpg`, { type: 'image/jpeg' }),
    reel && new File([reel], `studio9060-${Date.now()}-reel.mp4`, { type: 'video/mp4' }),
  ].filter(Boolean) as File[]

  const share = async () => {
    const output = files()
    if (navigator.canShare?.({ files: output })) await navigator.share({ title: 'Studio 9060', files: output })
  }

  const reset = () => { setJpeg(null); setReel(null); setShot(0); setStatus('idle'); setVideoWarning(null); setScreen('camera') }

  if (screen === 'welcome') return <main className="welcome">
    <div className="brand">STUDIO <span>9060</span></div>
    <section><p className="eyebrow"><Sparkles size={14}/> PRIVATE BY DESIGN</p><h1>Your pocket<br/><em>photo studio.</em></h1><p className="lede">No uploads. No accounts. Just you, your camera, and a little bit of magic.</p></section>
    <button className="primary dark" onClick={openCamera}><Camera size={20}/> Open camera</button>
    <p className="privacy">Everything stays on this device.</p>
  </main>

  if (screen === 'processing') return <main className="processing"><div className="spinner"/><p className="eyebrow">KEEP THIS SCREEN OPEN</p><h2>{progress}</h2><p>Everything is being made privately on your device.</p></main>

  if (screen === 'results') return <main className="results">
    <header><div className="brand">STUDIO <span>9060</span></div><button className="iconButton" onClick={reset} aria-label="New session"><RotateCcw/></button></header>
    <section><p className="eyebrow">SESSION COMPLETE</p><h2>Made in the moment.</h2></section>
    <div className="resultCards">
      {jpegUrl && <img src={jpegUrl} alt="Your finished photo layout" />}
      {reelUrl && <video src={reelUrl} autoPlay loop muted playsInline controls />}
    </div>
    {videoWarning && <p className="warning">{videoWarning}</p>}
    {navigator.canShare?.({ files: files() }) && <button className="primary dark" onClick={share}><Share2 size={20}/> Share or save both</button>}
    <div className="downloads">
      {jpegUrl && <a href={jpegUrl} download="studio9060-strip.jpg"><Download size={18}/> Save strip</a>}
      {reelUrl && <a href={reelUrl} download="studio9060-reel.mp4"><Download size={18}/> Save reel</a>}
    </div>
  </main>

  return <main className="cameraScreen">
    <video ref={videoRef} muted playsInline className="viewfinder" />
    <div className="shade" />
    <header><div className="brand light">STUDIO <span>9060</span></div><div className="shotCount">{status === 'idle' ? 'READY' : `${shot} / ${quota}`}</div></header>
    {error && <div className="cameraError"><p>{error}</p><button onClick={start}>Try again</button></div>}
    {status === 'countdown' && <div key={count} className="countdown">{count}</div>}
    {status === 'flash' && <div className="flash" />}
    {status === 'review' && <div className="reviewMark">Beautiful.</div>}
    <div className="cameraControls">
      <div className="layoutToggle" aria-label="Photo layout">
        <button disabled={status !== 'idle'} className={layout === 'strip' ? 'active' : ''} onClick={() => setLayout('strip')}><Images size={18}/> Strip <small>3 shots</small></button>
        <button disabled={status !== 'idle'} className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')}><Grid2X2 size={18}/> Grid <small>4 shots</small></button>
      </div>
      <button className="shutter" disabled={!ready || status !== 'idle'} onClick={runSession}><span>{ready ? 'START SESSION' : 'STARTING CAMERA'}</span></button>
      <p>{status === 'idle' ? 'Five seconds between each photo' : status === 'review' ? 'Get ready for the next one' : 'Look right here'}</p>
    </div>
  </main>
}

export default App
