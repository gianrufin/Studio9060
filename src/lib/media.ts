import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

export type Layout = 'strip' | 'grid'

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')), type, quality),
  )
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const cropWidth = width / scale
  const cropHeight = height / scale
  const sourceX = (sourceWidth - cropWidth) / 2
  const sourceY = (sourceHeight - cropHeight) / 2
  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height)
}

export async function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  return canvasBlob(canvas, 'image/jpeg', 0.94)
}

export async function composePhotos(blobs: Blob[], layout: Layout) {
  const border = 28
  const canvas = document.createElement('canvas')
  canvas.width = layout === 'strip' ? 1080 : 1600
  canvas.height = layout === 'strip' ? 1920 : 1200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f5f1e7'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const images = await Promise.all(blobs.map(async (blob) => {
    const bitmap = await createImageBitmap(blob)
    return bitmap
  }))

  if (layout === 'strip') {
    const cellHeight = (canvas.height - border * 4) / 3
    images.forEach((image, index) => drawCover(ctx, image, image.width, image.height, border, border + index * (cellHeight + border), canvas.width - border * 2, cellHeight))
  } else {
    const cellWidth = (canvas.width - border * 3) / 2
    const cellHeight = (canvas.height - border * 3) / 2
    images.forEach((image, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      drawCover(ctx, image, image.width, image.height, border + column * (cellWidth + border), border + row * (cellHeight + border), cellWidth, cellHeight)
    })
  }
  images.forEach((image) => image.close())
  return canvasBlob(canvas, 'image/jpeg', 0.9)
}

export function preferredRecordingType() {
  const types = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export async function compileReel(clips: Blob[], onProgress: (message: string) => void, signal?: AbortSignal) {
  const ffmpeg = new FFmpeg()
  let timeoutId: number | undefined
  const stop = () => ffmpeg.terminate()
  signal?.addEventListener('abort', stop, { once: true })
  ffmpeg.on('progress', ({ progress }) => onProgress(`Making your reel ${Math.max(1, Math.round(progress * 100))}%`))
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => { stop(); reject(new Error('Video processing timed out')) }, 75_000)
    })
    return await Promise.race([(async () => {
      const ffmpegBase = `${import.meta.env.BASE_URL}ffmpeg/`
      await ffmpeg.load({ coreURL: `${ffmpegBase}ffmpeg-core.js`, wasmURL: `${ffmpegBase}ffmpeg-core.wasm` })
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      for (let index = 0; index < clips.length; index += 1) {
        await ffmpeg.writeFile(`clip${index}.webm`, await fetchFile(clips[index]))
      }
      const inputs = clips.flatMap((_, index) => ['-i', `clip${index}.webm`])
      const filter = clips.map((_, index) => `[${index}:v]scale=720:-2:force_original_aspect_ratio=decrease,fps=15,setsar=1[v${index}]`).join(';')
        + ';' + clips.map((_, index) => `[v${index}]`).join('') + `concat=n=${clips.length}:v=1:a=0[outv]`
      await ffmpeg.exec([
        ...inputs, '-filter_complex', filter, '-map', '[outv]', '-an',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '29', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', 'studio9060-reel.mp4',
      ])
      const data = await ffmpeg.readFile('studio9060-reel.mp4')
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
      return new Blob([new Uint8Array(bytes)], { type: 'video/mp4' })
    })(), timeout])
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', stop)
    stop()
  }
}
