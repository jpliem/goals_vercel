"use client"

declare global {
  interface Window {
    htmlToImage?: any
  }
}

// Dynamically load html-to-image from CDN if not already available
export async function ensureHtmlToImage(): Promise<any> {
  if (typeof window === 'undefined') return null
  if (window.htmlToImage) return window.htmlToImage

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load html-to-image'))
    document.body.appendChild(script)
  })

  return window.htmlToImage
}

export async function captureElementAsPng(
  el: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number; backgroundColor?: string }
): Promise<void> {
  const hti = await ensureHtmlToImage()
  if (!hti) throw new Error('html-to-image not available')

  const width = Math.max(el.scrollWidth, el.clientWidth, el.offsetWidth)
  const height = Math.max(el.scrollHeight, el.clientHeight, el.offsetHeight)

  // Clone into an offscreen container to avoid ancestor transforms/overflow clipping
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.overflow = 'visible'
  wrapper.style.background = opts?.backgroundColor ?? '#ffffff'

  const clone = el.cloneNode(true) as HTMLElement
  clone.style.width = `${width}px`
  clone.style.minWidth = `${width}px`
  clone.style.height = `${height}px`
  clone.style.maxHeight = 'none'
  clone.style.overflow = 'visible'
  clone.style.display = 'block'

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    const dataUrl = await hti.toPng(wrapper, {
      pixelRatio: opts?.pixelRatio ?? 2,
      backgroundColor: opts?.backgroundColor ?? '#ffffff',
      width,
      height,
      style: { overflow: 'visible' },
      skipFonts: false,
      cacheBust: true,
    })

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    document.body.removeChild(wrapper)
  }
}
