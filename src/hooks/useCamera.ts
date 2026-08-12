import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const start = useCallback(async (nextFacing?: 'user' | 'environment') => {
    try {
      const camera = nextFacing ?? facingMode
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: camera }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
      setFacingMode(camera)
      setError(null)
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
        : 'The camera could not be started on this device.')
    }
  }, [facingMode])

  const flip = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setReady(false)
    await start(next)
  }, [facingMode, start])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  return { videoRef, streamRef, ready, error, facingMode, start, flip }
}
