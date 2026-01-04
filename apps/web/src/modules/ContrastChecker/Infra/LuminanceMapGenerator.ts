import { $APCA, $Srgb } from '@practice/color'
import { type LuminanceMap, createLuminanceMap } from '../Domain'

/**
 * Generate a luminance map from ImageData
 * Uses APCA-specific luminance calculation
 */
export function generateLuminanceMap(imageData: ImageData): LuminanceMap {
  const { width, height, data } = imageData
  const luminanceMap = createLuminanceMap(width, height)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const pixelIndex = i / 4

    const y = $APCA.srgbToY($Srgb.from255(r, g, b))
    luminanceMap.data[pixelIndex] = y
  }

  return luminanceMap
}

/**
 * Generate a luminance map from a canvas element
 */
export function generateLuminanceMapFromCanvas(canvas: HTMLCanvasElement): LuminanceMap | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return generateLuminanceMap(imageData)
}

/**
 * Convert luminance map to grayscale ImageData for visualization
 */
export function luminanceMapToImageData(map: LuminanceMap): ImageData {
  const imageData = new ImageData(map.width, map.height)
  const data = imageData.data

  for (let i = 0; i < map.data.length; i++) {
    const y = map.data[i]!
    const gray = Math.round(y * 255)
    const idx = i * 4

    data[idx] = gray
    data[idx + 1] = gray
    data[idx + 2] = gray
    data[idx + 3] = 255
  }

  return imageData
}

export const $LuminanceMapGenerator = {
  fromImageData: generateLuminanceMap,
  fromCanvas: generateLuminanceMapFromCanvas,
  toImageData: luminanceMapToImageData,
}
