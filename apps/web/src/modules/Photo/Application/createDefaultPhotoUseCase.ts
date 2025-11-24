import { $Oklch } from '../../Color/Domain'
import { $Photo, $PhotoColorPalette, type Photo } from '../Domain'

/**
 * Create a default Photo with the color palette grid
 * Layout: 20 hues (columns) × 10 shades (rows)
 * Aspect ratio: 16:9
 */
export const createDefaultPhotoUseCase = (): Photo => {
  const palette = $PhotoColorPalette.create()
  const { columns, rows } = $PhotoColorPalette.dimensions(palette)

  // Calculate cell size to achieve 16:9 aspect ratio
  // width = columns * cellWidth, height = rows * cellHeight
  // width / height = 16/9
  // (columns * cellWidth) / (rows * cellHeight) = 16/9
  // cellWidth / cellHeight = (16 * rows) / (9 * columns) = (16 * 10) / (9 * 20) = 160/180 = 8/9
  // Use cellWidth=32, cellHeight=36 for clean integers (32/36 = 8/9)
  const cellWidth = 32
  const cellHeight = 36

  const width = columns * cellWidth   // 20 * 32 = 640
  const height = rows * cellHeight    // 10 * 36 = 360 → 640:360 = 16:9

  const imageData = new ImageData(width, height)
  const data = imageData.data

  for (const color of palette.colors) {
    const hueIndex = palette.hues.indexOf(color.hue)
    const shadeIndex = palette.shades.indexOf(color.shade)

    const srgb = $Oklch.toSrgb(color.oklch)

    // Fill the cell
    const startX = hueIndex * cellWidth
    const startY = shadeIndex * cellHeight

    for (let dy = 0; dy < cellHeight; dy++) {
      for (let dx = 0; dx < cellWidth; dx++) {
        const x = startX + dx
        const y = startY + dy
        const i = (y * width + x) * 4

        data[i] = srgb.r
        data[i + 1] = srgb.g
        data[i + 2] = srgb.b
        data[i + 3] = 255
      }
    }
  }

  return $Photo.create(imageData)
}
