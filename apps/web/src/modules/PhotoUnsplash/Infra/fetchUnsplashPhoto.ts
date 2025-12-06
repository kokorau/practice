import { $Photo } from '../../Photo/Domain'

const UNSPLASH_API_BASE = 'https://api.unsplash.com'

type UnsplashRandomResponse = {
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  width: number
  height: number
}

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

export type FetchUnsplashPhotoOptions = {
  query?: string
  /** Number of photos to fetch (1-30, default: 1) */
  count?: number
}

export const fetchUnsplashPhoto = async (options: FetchUnsplashPhotoOptions = {}) => {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    throw new Error('VITE_UNSPLASH_ACCESS_KEY is not set')
  }

  const params = new URLSearchParams()
  if (options.query) {
    params.set('query', options.query)
  }

  const url = `${UNSPLASH_API_BASE}/photos/random?${params.toString()}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`)
  }

  const data: UnsplashRandomResponse = await response.json()
  const img = await loadImageFromUrl(data.urls.regular)
  const imageData = extractImageData(img)

  return $Photo.create(imageData)
}

/**
 * Fetch multiple random photos from Unsplash
 */
export const fetchUnsplashPhotos = async (options: FetchUnsplashPhotoOptions = {}) => {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    throw new Error('VITE_UNSPLASH_ACCESS_KEY is not set')
  }

  const count = Math.min(30, Math.max(1, options.count ?? 5))

  const params = new URLSearchParams()
  params.set('count', count.toString())
  if (options.query) {
    params.set('query', options.query)
  }

  const url = `${UNSPLASH_API_BASE}/photos/random?${params.toString()}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`)
  }

  const dataArray: UnsplashRandomResponse[] = await response.json()

  // Load all images in parallel
  const photos = await Promise.all(
    dataArray.map(async (data) => {
      const img = await loadImageFromUrl(data.urls.regular)
      const imageData = extractImageData(img)
      return $Photo.create(imageData)
    })
  )

  return photos
}
