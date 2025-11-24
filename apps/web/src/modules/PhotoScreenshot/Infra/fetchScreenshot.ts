import { $Photo } from '../../Photo/Domain'

const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

const extractImageData = (img: HTMLImageElement): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

export type FetchScreenshotOptions = {
  url: string
}

export const fetchScreenshot = async (options: FetchScreenshotOptions) => {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    throw new Error('VITE_API_URL is not set')
  }

  const params = new URLSearchParams()
  params.set('url', options.url)

  const response = await fetch(`${apiUrl}/screenshot?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Screenshot API error: ${response.status}`)
  }

  const blob = await response.blob()
  const imageUrl = URL.createObjectURL(blob)

  try {
    const img = await loadImageFromUrl(imageUrl)
    const imageData = extractImageData(img)
    return $Photo.create(imageData)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}
