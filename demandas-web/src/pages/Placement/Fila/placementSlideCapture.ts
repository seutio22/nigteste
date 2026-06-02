/** Captura elemento DOM como PNG (data URI) — usado em slides Placement. */
export async function captureElementAsPngDataUri(
  element: HTMLElement,
  width: number,
  height: number,
  onClone?: (doc: Document) => void
): Promise<string> {
  await new Promise((r) => setTimeout(r, 400))
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width,
    height,
    onclone: (doc) => {
      onClone?.(doc)
      doc.querySelectorAll('svg').forEach((svg) => {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      })
    },
  })
  return canvas.toDataURL('image/png')
}

export async function readImageFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Erro ao ler imagem.'))
    reader.readAsDataURL(file)
  })
}
