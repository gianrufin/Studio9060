import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

export type Layout = 'vertical' | 'horizontal'
export type FrameStyle = 'noir' | 'ivory' | 'sepia' | 'deco' | 'silver'
export type FilterStyle = 'clean' | 'vintage' | 'sepia' | 'mono' | 'cinema' | 'chrome'

export const filterStyles: { id: FilterStyle; name: string; css: string; ffmpeg: string }[] = [
  { id: 'clean', name: 'Original', css: 'none', ffmpeg: 'null' },
  { id: 'vintage', name: 'Vintage Fade', css: 'sepia(.22) saturate(.78) contrast(.92) brightness(1.06)', ffmpeg: 'eq=contrast=0.92:brightness=0.04:saturation=0.78,colorbalance=rs=.08:gs=.03:bs=-.04' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(.78) saturate(.82) contrast(1.04)', ffmpeg: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131' },
  { id: 'mono', name: 'B&W Film', css: 'grayscale(1) contrast(1.18) brightness(.96)', ffmpeg: 'hue=s=0,eq=contrast=1.18:brightness=-.02' },
  { id: 'cinema', name: 'Cinematic', css: 'contrast(1.12) saturate(.86) sepia(.12) hue-rotate(-6deg)', ffmpeg: 'eq=contrast=1.12:saturation=.86,colorbalance=rs=.06:gs=.01:bs=-.06' },
  { id: 'chrome', name: 'Cool Chrome', css: 'contrast(1.1) saturate(.72) hue-rotate(8deg) brightness(1.02)', ffmpeg: 'eq=contrast=1.1:saturation=.72:brightness=.02,colorbalance=rs=-.05:gs=.01:bs=.08' },
]

export const frameStyles: { id: FrameStyle; name: string; note: string; ink: string; paper: string }[] = [
  { id: 'noir', name: 'Victorian Noir', note: 'Ornate & dramatic', ink: '#e7d9ba', paper: '#171615' },
  { id: 'ivory', name: 'Ivory Lace', note: 'Soft & romantic', ink: '#5b5148', paper: '#f0e8d7' },
  { id: 'sepia', name: 'Sepia Postcard', note: 'Warm & nostalgic', ink: '#513a28', paper: '#c7a978' },
  { id: 'deco', name: 'Midnight Deco', note: 'Geometric & elegant', ink: '#d7b86b', paper: '#17252a' },
  { id: 'silver', name: 'Silver Screen', note: 'Classic cinema', ink: '#292929', paper: '#d8d5ce' },
]

export function frameGeometry(layout: Layout, scale = 1, count: 3 | 4 = 3) {
  const width = 1080 * scale
  const height = 1920 * scale
  const edge = 58 * scale
  const title = 180 * scale
  const gap = 30 * scale
  const footer = 160 * scale
  const slots = layout === 'vertical'
    ? Array.from({ length: count }, (_, index) => ({ x: edge, y: title + index * ((height - title - footer - gap * (count - 1)) / count + gap), width: width - edge * 2, height: (height - title - footer - gap * (count - 1)) / count }))
    : Array.from({ length: 3 }, (_, index) => ({ x: edge + index * ((width - edge * 2 - gap * 2) / 3 + gap), y: height * .29, width: (width - edge * 2 - gap * 2) / 3, height: height * .43 }))
  return { width, height, edge, slots }
}

function ornament(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, size * .035)
  ctx.beginPath(); ctx.moveTo(-size, 0); ctx.bezierCurveTo(-size * .55, -size * .55, -size * .25, size * .55, 0, 0); ctx.bezierCurveTo(size * .25, size * .55, size * .55, -size * .55, size, 0); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, size * .12, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
}

function paintFrame(ctx: CanvasRenderingContext2D, layout: Layout, styleId: FrameStyle, count: 3 | 4 = 3, transparent = false) {
  const style = frameStyles.find((item) => item.id === styleId)!
  const { width, height, edge, slots } = frameGeometry(layout, widthScale(ctx.canvas.width, layout), count)
  if (!transparent) { ctx.fillStyle = style.paper; ctx.fillRect(0, 0, width, height) }
  ctx.strokeStyle = style.ink; ctx.fillStyle = style.ink
  const line = Math.max(4, width / 300)
  ctx.lineWidth = line
  ctx.strokeRect(edge * .35, edge * .35, width - edge * .7, height - edge * .7)
  ctx.strokeRect(edge * .52, edge * .52, width - edge * 1.04, height - edge * 1.04)
  slots.forEach((slot) => {
    ctx.lineWidth = line * 2; ctx.strokeRect(slot.x - line * 2, slot.y - line * 2, slot.width + line * 4, slot.height + line * 4)
    ctx.lineWidth = line * .65; ctx.strokeRect(slot.x - line * 5, slot.y - line * 5, slot.width + line * 10, slot.height + line * 10)
  })
  if (styleId === 'noir' || styleId === 'ivory') {
    ornament(ctx, width / 2, edge * 1.65, edge * 1.1, style.ink); ornament(ctx, width / 2, height - edge * 1.5, edge * .9, style.ink)
  } else if (styleId === 'deco') {
    for (let i = 0; i < 3; i += 1) { ctx.strokeRect(edge * (.65 + i * .16), edge * (.65 + i * .16), width - edge * (1.3 + i * .32), height - edge * (1.3 + i * .32)) }
  } else if (styleId === 'sepia') {
    ctx.setLineDash([line * 2, line * 2]); ctx.strokeRect(edge * .7, edge * .7, width - edge * 1.4, height - edge * 1.4); ctx.setLineDash([])
  } else {
    for (let x = edge; x < width - edge; x += edge * .42) { ctx.fillRect(x, edge * .55, line * 1.2, line * 2); ctx.fillRect(x, height - edge * .72, line * 1.2, line * 2) }
  }
  ctx.textAlign = 'center'; ctx.fillStyle = style.ink
  ctx.font = `700 ${Math.round(edge * .42)}px Georgia, serif`; ctx.fillText('STUDIO9060', width / 2, edge * 1.18)
  ctx.font = `italic ${Math.round(edge * .28)}px Georgia, serif`; ctx.fillText(style.name.toUpperCase(), width / 2, height - edge * .82)
  ctx.lineWidth = line
  ctx.beginPath(); ctx.arc(width / 2, height - edge * 1.42, edge * .25, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(width / 2, height - edge * 1.42, edge * .09, 0, Math.PI * 2); ctx.fill()
  ctx.strokeRect(width / 2 - edge * .42, height - edge * 1.77, edge * .84, edge * .68)
}

export function framePreview(style: FrameStyle, count: 3 | 4) {
  const canvas = document.createElement('canvas')
  canvas.width = 270; canvas.height = 480
  const ctx = canvas.getContext('2d')!
  const frame = frameStyles.find((item) => item.id === style)!
  ctx.fillStyle = frame.paper; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const { slots } = frameGeometry('vertical', .25, count)
  slots.forEach((slot, index) => {
    const gradient = ctx.createLinearGradient(slot.x, slot.y, slot.x + slot.width, slot.y + slot.height)
    gradient.addColorStop(0, ['#62564d', '#8b8179', '#93724f'][index]); gradient.addColorStop(1, ['#c8b5a0', '#afa299', '#d1b389'][index])
    ctx.fillStyle = gradient; ctx.fillRect(slot.x, slot.y, slot.width, slot.height)
  })
  paintFrame(ctx, 'vertical', style, count, true)
  return canvas.toDataURL('image/png')
}

function widthScale(width: number, _layout: Layout) { return width / 1080 }

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')), type, quality),
  )
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number, filter = 'none') {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const cropWidth = width / scale
  const cropHeight = height / scale
  const sourceX = (sourceWidth - cropWidth) / 2
  const sourceY = (sourceHeight - cropHeight) / 2
  ctx.save(); ctx.filter = filter; ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height); ctx.restore()
}

export async function captureFrame(video: HTMLVideoElement, mirror = true) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
  ctx.drawImage(video, 0, 0)
  return canvasBlob(canvas, 'image/jpeg', 0.94)
}

export async function composePhotos(blobs: Blob[], layout: Layout, style: FrameStyle, count: 3 | 4, filter: FilterStyle) {
  const canvas = document.createElement('canvas')
  const geometry = frameGeometry(layout, 1, count)
  canvas.width = geometry.width
  canvas.height = geometry.height
  const ctx = canvas.getContext('2d')!
  const frame = frameStyles.find((item) => item.id === style)!
  ctx.fillStyle = frame.paper; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const images = await Promise.all(blobs.map(async (blob) => {
    const bitmap = await createImageBitmap(blob)
    return bitmap
  }))

  const photoFilter = filterStyles.find((item) => item.id === filter)!.css
  images.forEach((image, index) => { const slot = geometry.slots[index]; drawCover(ctx, image, image.width, image.height, slot.x, slot.y, slot.width, slot.height, photoFilter) })
  paintFrame(ctx, layout, style, count, true)
  images.forEach((image) => image.close())
  return canvasBlob(canvas, 'image/jpeg', 0.9)
}

export async function createVideoFrame(layout: Layout, style: FrameStyle, count: 3 | 4) {
  const canvas = document.createElement('canvas')
  const geometry = frameGeometry(layout, 2 / 3, count)
  canvas.width = geometry.width; canvas.height = geometry.height
  paintFrame(canvas.getContext('2d')!, layout, style, count, true)
  return canvasBlob(canvas, 'image/png')
}

export function preferredRecordingType() {
  const types = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export async function compileReel(clips: Blob[], layout: Layout, style: FrameStyle, count: 3 | 4, selectedFilter: FilterStyle, onProgress: (message: string) => void, signal?: AbortSignal) {
  const ffmpeg = new FFmpeg()
  let timeoutId: number | undefined
  const stop = () => ffmpeg.terminate()
  signal?.addEventListener('abort', stop, { once: true })
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => { stop(); reject(new Error('Video processing timed out')) }, 75_000)
    })
    return await Promise.race([(async () => {
      const ffmpegBase = `${import.meta.env.BASE_URL}ffmpeg/`
      onProgress('Loading the video engine')
      await ffmpeg.load({ coreURL: `${ffmpegBase}ffmpeg-core.js`, wasmURL: `${ffmpegBase}ffmpeg-core.wasm` })
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      for (let index = 0; index < clips.length; index += 1) {
        await ffmpeg.writeFile(`clip${index}.webm`, await fetchFile(clips[index]))
      }
      onProgress('Composing your moving frame')
      await ffmpeg.writeFile('frame.png', await fetchFile(await createVideoFrame(layout, style, count)))
      const geometry = frameGeometry(layout, 2 / 3, count)
      const inputs = clips.flatMap((_, index) => ['-i', `clip${index}.webm`])
      const prepared: string = clips.map((_, index): string => {
        const slot = geometry.slots[index]
        const videoFilter: string = filterStyles.find((item) => item.id === selectedFilter)!.ffmpeg
        return `[${index}:v]scale=${Math.round(slot.width)}:${Math.round(slot.height)}:force_original_aspect_ratio=increase,crop=${Math.round(slot.width)}:${Math.round(slot.height)},${videoFilter},fps=15,setsar=1[v${index}]`
      }).join(';')
      let overlays = `[v0]pad=${geometry.width}:${geometry.height}:${Math.round(geometry.slots[0].x)}:${Math.round(geometry.slots[0].y)}:color=${frameStyles.find((item) => item.id === style)!.paper.replace('#', '0x')}[stage0]`
      for (let index = 1; index < clips.length; index += 1) { const slot = geometry.slots[index]; overlays += `;[stage${index - 1}][v${index}]overlay=${Math.round(slot.x)}:${Math.round(slot.y)}[stage${index}]` }
      const filterGraph = `${prepared};${overlays};[stage${clips.length - 1}][${clips.length}:v]overlay=0:0[outv]`
      await ffmpeg.exec([
        ...inputs, '-loop', '1', '-i', 'frame.png', '-filter_complex', filterGraph, '-map', '[outv]', '-t', '5', '-an',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '29', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', 'studio9060-reel.mp4',
      ])
      onProgress('Finishing your files')
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
