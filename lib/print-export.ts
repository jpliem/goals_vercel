"use client"

export function exportHtmlToPdf(
  contentHtml: string,
  title = "Export",
  options?: { orientation?: 'portrait' | 'landscape'; pageSize?: string; marginMm?: number }
) {
  if (typeof window === 'undefined') return

  const openDoc = (doc: Document, closeAfter = false) => {
    const pageSize = options?.pageSize ?? 'A4'
    const orientation = options?.orientation ?? 'landscape'
    const margin = options?.marginMm ?? 12
    const styles = `
      @page { size: ${pageSize} ${orientation}; margin: ${margin}mm; }
      html, body { height: auto; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, 'Apple Color Emoji', 'Segoe UI Emoji'; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .container { width: 100%; max-width: 100%; margin: 0 auto; }
      h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
      h2 { font-size: 1.25rem; margin: 1rem 0 0.5rem; }
      h3 { font-size: 1.1rem; margin: 0.75rem 0 0.5rem; }
      p { margin: 0 0 0.6rem; line-height: 1.6; }
      ul, ol { margin: 0 0 0.6rem 1.25rem; }
      li { line-height: 1.5; }
      code { background: #EEF2FF; color: #1E3A8A; padding: 0.1rem 0.25rem; border-radius: 0.25rem; }
      pre { background: #F9FAFB; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 0.375rem; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; margin: 0 0 0.75rem; table-layout: fixed; page-break-inside: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td { border: 1px solid #E5E7EB; padding: 0.5rem; vertical-align: top; word-break: break-word; }
      blockquote { border-left: 4px solid #3B82F6; background: #EFF6FF; padding: 0.5rem 0.75rem; margin: 0 0 0.75rem; }
      a { color: #2563EB; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .page-break { page-break-before: always; }
      img { max-width: 100%; height: auto; }
      .meta { color: #6B7280; font-size: 0.85rem; margin-bottom: 0.75rem; }
      h1, h2 { page-break-after: avoid; page-break-inside: avoid; }
    `

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="container">${contentHtml}</div>
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => { window.print(); ${closeAfter ? 'window.close();' : ''} }, 200);
          });
        </script>
      </body>
    </html>`

    doc.open()
    doc.write(html)
    doc.close()
  }

  // Print via hidden iframe (avoids popup blockers and new windows)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  if (iframe.contentDocument) {
    openDoc(iframe.contentDocument)
  }
}
