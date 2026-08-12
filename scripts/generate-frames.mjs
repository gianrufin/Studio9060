import fs from 'node:fs'
import path from 'node:path'

const out = path.resolve('studio9060-frames')
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true })
fs.copyFileSync('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2', path.join(out, 'fonts', 'space-grotesk-700.woff2'))

const styles = [
  ['victorian-noir', '#171615', '#e7d9ba', 'victorian'],
  ['ivory-lace', '#f0e8d7', '#5b5148', 'victorian'],
  ['sepia-postcard', '#c7a978', '#513a28', 'postcard'],
  ['midnight-deco', '#17252a', '#d7b86b', 'deco'],
  ['silver-screen', '#d8d5ce', '#292929', 'film'],
]

function slots(count) {
  const x = 64, y = 210, w = 952, bottom = 170, gap = 32
  const h = (1920 - y - bottom - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => ({ x, y: y + i * (h + gap), w, h }))
}

function decoration(kind, ink) {
  if (kind === 'victorian') return `<g fill="none" stroke="${ink}" stroke-width="5"><path d="M330 122c70-100 125 80 210 0 85 80 140-100 210 0"/><circle cx="540" cy="122" r="17"/><path d="M410 1810c55-55 85 35 130 0 45 35 75-55 130 0"/></g>`
  if (kind === 'deco') return `<g fill="none" stroke="${ink}" stroke-width="4"><path d="M48 160V48h112M920 48h112v112M48 1760v112h112M920 1872h112v-112"/><path d="M210 106h660l-40 40H250z"/></g>`
  if (kind === 'postcard') return `<g fill="none" stroke="${ink}" stroke-width="4" stroke-dasharray="13 10"><rect x="45" y="45" width="990" height="1830" rx="8"/></g><g opacity=".28" fill="${ink}"><circle cx="95" cy="105" r="30"/><circle cx="985" cy="1815" r="30"/></g>`
  return `<g fill="${ink}">${Array.from({length:18},(_,i)=>`<rect x="${72+i*52}" y="72" width="24" height="34"/><rect x="${72+i*52}" y="1814" width="24" height="34"/>`).join('')}</g>`
}

function svg(name, paper, ink, kind, count) {
  const openings = slots(count).map(({x,y,w,h}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="${ink}" stroke-width="10"/><rect x="${x-13}" y="${y-13}" width="${w+26}" height="${h+26}" rx="18" fill="none" stroke="${ink}" stroke-width="3"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><style>@font-face{font-family:Space Grotesk;src:url('fonts/space-grotesk-700.woff2')} .brand{font-family:'Space Grotesk',sans-serif;font-size:54px;font-weight:700;letter-spacing:5px}</style></defs>
  <rect width="1080" height="1920" fill="${paper}"/><rect x="28" y="28" width="1024" height="1864" rx="20" fill="none" stroke="${ink}" stroke-width="5"/><rect x="42" y="42" width="996" height="1836" rx="16" fill="none" stroke="${ink}" stroke-width="2"/>
  ${decoration(kind, ink)}<text class="brand" x="540" y="142" fill="${ink}" text-anchor="middle">Studio9060</text>${openings}
  <g transform="translate(540 1840)" stroke="${ink}" fill="none" stroke-width="5"><rect x="-31" y="-24" width="62" height="48" rx="10"/><circle r="13"/><path d="M-18-24l8-12h20l8 12"/></g>
  </svg>`
}

const manifest = []
for (const [name, paper, ink, kind] of styles) for (const count of [3, 4]) {
  const filename = `${name}-${count}-photo.svg`
  fs.writeFileSync(path.join(out, filename), svg(name, paper, ink, kind, count))
  manifest.push({ filename, style: name, photo_slots: count, size: '1080x1920', format: 'SVG' })
}
fs.writeFileSync(path.join(out, 'README.md'), `# Studio9060 Frame Pack\n\nTen 1080×1920 SVG frame designs for Story exports. White rectangles are the photo openings. Space Grotesk Bold is included in the fonts folder.\n\n${manifest.map(x=>`- ${x.filename}`).join('\n')}\n`)
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
