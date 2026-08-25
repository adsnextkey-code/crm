import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svgSource = path.join(root, 'public', 'icon.svg')
const svg = readFileSync(svgSource)

// Maskable variant: background fills full square (no rounded corners, no transparency)
// and the bolt is ~15% smaller, centered.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4f46e5"/>
  <g transform="translate(256 256) scale(0.85) translate(-256 -256)">
    <polygon points="292,72 148,288 240,288 212,440 364,224 268,224" fill="#ffffff"/>
  </g>
</svg>`

// Apple touch icon: solid full-bleed background (no transparency), standard bolt.
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="102" ry="102" fill="#4f46e5"/>
  <polygon points="292,72 148,288 240,288 212,440 364,224 268,224" fill="#ffffff"/>
</svg>`

async function main() {
  const jobs = [
    { name: 'pwa-192x192.png', size: 192, input: svg },
    { name: 'pwa-512x512.png', size: 512, input: svg },
    { name: 'maskable-192x192.png', size: 192, input: Buffer.from(maskableSvg) },
    { name: 'maskable-512x512.png', size: 512, input: Buffer.from(maskableSvg) },
    { name: 'apple-touch-icon.png', size: 180, input: Buffer.from(appleSvg) },
  ]

  for (const job of jobs) {
    const out = path.join(root, 'public', job.name)
    await sharp(job.input)
      .resize(job.size, job.size)
      .png()
      .toFile(out)
    console.log(`Generated ${job.name} (${job.size}x${job.size})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
