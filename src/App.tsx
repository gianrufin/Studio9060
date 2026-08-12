import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Download, RefreshCw, RotateCcw, Share2, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useCamera } from './hooks/useCamera'
import { captureFrame, compileReel, composePhotos, FrameStyle, frameStyles, Layout, preferredRecordingType } from './lib/media'

type Screen = 'welcome' | 'frames' | 'camera' | 'processing' | 'results'
type Status = 'idle' | 'countdown' | 'flash' | 'review'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function App() {
  const { videoRef, streamRef, ready, error, facingMode, start, flip } = useCamera()
  const [screen, setScreen] = useState<Screen>('welcome')
  const layout: Layout = 'vertical'
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('noir')
  const [status, setStatus] = useState<Status>('idle')
  const [count, setCount] = useState(5)
  const [shot, setShot] = useState(0)
  const [progress, setProgress] = useState('Building your strip')
  const [jpeg, setJpeg] = useState<Blob | null>(null)
  const [reel, setReel] = useState<Blob | null>(null)
  const [videoWarning, setVideoWarning] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const running = useRef(false)
  const reelAbort = useRef<AbortController | null>(null)
  const audioContext = useRef<AudioContext | null>(null)

  const quota = 3
  const jpegUrl = useMemo(() => jpeg ? URL.createObjectURL(jpeg) : null, [jpeg])
  const reelUrl = useMemo(() => reel ? URL.createObjectURL(reel) : null, [reel])
  useEffect(() => () => { if (jpegUrl) URL.revokeObjectURL(jpegUrl); if (reelUrl) URL.revokeObjectURL(reelUrl) }, [jpegUrl, reelUrl])

  const openCamera = async () => { setScreen('camera'); await sleep(80); await start() }

  const beep = async (second: number) => {
    if (muted) return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = audioContext.current ?? new AudioContextClass()
    audioContext.current = context
    await context.resume()
    const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.frequency.value = second === 1 ? 980 : 620
    gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.2, context.currentTime + .015); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .13)
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .14)
  }

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
        for (let second = 5; second > 0; second -= 1) { setCount(second); void beep(second); await sleep(1000) }
        photos.push(await captureFrame(video, facingMode === 'user'))
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
      const strip = await composePhotos(photos, layout, frameStyle)
      setJpeg(strip)
      if (clips.length === quota) {
        try {
          reelAbort.current = new AbortController()
          setProgress('Starting the local video engine')
          setReel(await compileReel(clips, layout, frameStyle, setProgress, reelAbort.current.signal))
        }
        catch { setVideoWarning('The photo strip is ready, but this browser could not create the MP4 reel.'); setReel(null) }
      } else setVideoWarning('Video recording is not supported by this browser. Your photo strip is ready.')
      setScreen('results')
    } catch {
      setVideoWarning('The session was interrupted. Please try again.')
      setStatus('idle')
      setScreen('camera')
    } finally { reelAbort.current = null; running.current = false }
  }, [facingMode, frameStyle, layout, muted, quota, streamRef, videoRef])

  const files = () => [
    jpeg && new File([jpeg], `studio9060-${Date.now()}-strip.jpg`, { type: 'image/jpeg' }),
    reel && new File([reel], `studio9060-${Date.now()}-reel.mp4`, { type: 'video/mp4' }),
  ].filter(Boolean) as File[]

  const saveFile = async (kind: 'photo' | 'video') => {
    setSaveError(null)
    const blob = kind === 'photo' ? jpeg : reel
    if (!blob) return
    const extension = kind === 'photo' ? 'jpg' : 'mp4'
    const type = kind === 'photo' ? 'image/jpeg' : 'video/mp4'
    const file = new File([blob], `Studio9060-${kind}.${extension}`, { type })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ title: `Studio9060 ${kind}`, files: [file] }); return }
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setSaveError(`Could not save the ${kind}. Try opening this page in Safari or Chrome and use the share sheet.`)
    }
  }

  const reset = () => { setJpeg(null); setReel(null); setShot(0); setStatus('idle'); setVideoWarning(null); setScreen('camera') }

  const skipReel = () => {
    reelAbort.current?.abort()
    setVideoWarning('Video processing was skipped. Your photo strip is ready to save.')
    setReel(null)
    setScreen('results')
  }

  if (screen === 'welcome') return <main className="welcome">
    <div className="brand">STUDIO <span>9060</span></div>
    <section><p className="eyebrow"><Sparkles size={14}/> PRIVATE BY DESIGN</p><h1>Your pocket<br/><em>photo studio.</em></h1><p className="lede">No uploads. No accounts. Just you, your camera, and a little bit of magic.</p></section>
    <button className="primary dark" onClick={() => setScreen('frames')}><Sparkles size={20}/> Choose your frame</button>
    <p className="privacy">Everything stays on this device.</p>
  </main>

  if (screen === 'frames') return <main className="frameScreen">
    <header><div className="brand">STUDIO <span>9060</span></div><p>1 / 2</p></header>
    <section className="frameIntro"><p className="eyebrow">CHOOSE YOUR LOOK</p><h2>A frame for<br/><em>every story.</em></h2><p>Choose a vintage finish for your three-photo Story strip.</p></section>
    <div className="frameList">
      {frameStyles.map((frame) => <button key={frame.id} className={`frameCard ${frameStyle === frame.id ? 'selected' : ''}`} onClick={() => setFrameStyle(frame.id)} style={{ '--paper': frame.paper, '--ink': frame.ink } as React.CSSProperties}>
        <span className="miniFrame"><b>STUDIO9060</b><i/><i/><i/><em>◉</em></span><span className="frameMeta"><strong>{frame.name}</strong><small>{frame.note}</small></span><span className="radio">{frameStyle === frame.id && <Check/>}</span>
      </button>)}
    </div>
    <button className="primary dark" onClick={openCamera}><Camera size={20}/> Continue to camera</button>
  </main>

  if (screen === 'processing') return <main className="processing"><div className="spinner"/><p className="eyebrow">KEEP THIS SCREEN OPEN</p><h2>{progress}</h2><p>Everything is being made privately on your device.</p>{jpeg && <button className="skipButton" onClick={skipReel}>Skip reel and show photos</button>}</main>

  if (screen === 'results') return <main className="results">
    <header><div className="brand">STUDIO <span>9060</span></div><button className="iconButton" onClick={reset} aria-label="New session"><RotateCcw/></button></header>
    <section><p className="eyebrow">SESSION COMPLETE</p><h2>Made in the moment.</h2></section>
    <div className="resultCards">
      {jpegUrl && <img src={jpegUrl} alt="Your finished photo layout" />}
      {reelUrl && <video src={reelUrl} autoPlay loop muted playsInline controls />}
    </div>
    {videoWarning && <p className="warning">{videoWarning}</p>}
    {saveError && <p className="warning">{saveError}</p>}
    <div className="downloads">
      {jpegUrl && <button onClick={() => saveFile('photo')}><Share2 size={18}/> Save photo</button>}
      {reelUrl && <button onClick={() => saveFile('video')}><Download size={18}/> Save video</button>}
    </div>
  </main>

  return <main className="cameraScreen">
    <video ref={videoRef} muted playsInline className={`viewfinder ${facingMode === 'environment' ? 'rear' : ''}`} />
    <div className="shade" />
    <header><div className="brand light">STUDIO<span>9060</span></div><div className="cameraActions"><button onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Turn sound on' : 'Mute countdown'}>{muted ? <VolumeX/> : <Volume2/>}</button><button onClick={flip} disabled={status !== 'idle'} aria-label="Switch camera"><RefreshCw/></button></div></header>
    {error && <div className="cameraError"><p>{error}</p><button onClick={() => start()}>Try again</button></div>}
    {status === 'countdown' && <div key={count} className="countdown">{count}</div>}
    {status === 'flash' && <div className="flash" />}
    {status === 'review' && <div className="reviewMark">Beautiful.</div>}
    {status === 'idle' && <div className={`cropGuide ${layout}`}><span>YOUR PHOTO AREA</span></div>}
    <div className="cameraControls">
      <div className="captureInfo"><span>3-PHOTO STORY</span><span>{frameStyles.find((frame) => frame.id === frameStyle)?.name}</span></div>
      <button className="shutter" disabled={!ready || status !== 'idle'} onClick={runSession}><span>{ready ? 'START SESSION' : 'STARTING CAMERA'}</span></button>
      <p>{status === 'idle' ? 'Five seconds between each photo' : status === 'review' ? 'Get ready for the next one' : 'Look right here'}</p>
    </div>
  </main>
}

export default App
