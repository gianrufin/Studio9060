import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
      setError(null)
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
        : 'The camera could not be started on this device.')
    }
  }, [])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  return { videoRef, streamRef, ready, error, start }
}
