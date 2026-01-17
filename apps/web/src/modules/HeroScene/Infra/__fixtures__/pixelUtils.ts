/**
 * Pixel validation utilities for Canvas testing
 */

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Get pixel at (x, y) from ImageData
 */
export function getPixel(imageData: ImageData, x: number, y: number): RGBA {
  const index = (y * imageData.width + x) * 4
  return {
    r: imageData.data[index] ?? 0,
    g: imageData.data[index + 1] ?? 0,
    b: imageData.data[index + 2] ?? 0,
    a: imageData.data[index + 3] ?? 0,
  }
}

/**
 * Get average color of a region
 */
export function getAverageColor(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): RGBA {
  let r = 0, g = 0, b = 0, a = 0
  let count = 0

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = x + dx
      const py = y + dy
      if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
        const pixel = getPixel(imageData, px, py)
        r += pixel.r
        g += pixel.g
        b += pixel.b
        a += pixel.a
        count++
      }
    }
  }

  return count > 0 ? {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    a: Math.round(a / count),
  } : { r: 0, g: 0, b: 0, a: 0 }
}

/**
 * Check if a color is approximately equal (within tolerance)
 */
export function colorsApproximatelyEqual(
  a: RGBA,
  b: RGBA,
  tolerance = 10
): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance &&
    Math.abs(a.a - b.a) <= tolerance
  )
}

/**
 * Check if image contains a color (anywhere)
 */
export function imageContainsColor(
  imageData: ImageData,
  color: RGBA,
  tolerance = 10
): boolean {
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      if (colorsApproximatelyEqual(getPixel(imageData, x, y), color, tolerance)) {
        return true
      }
    }
  }
  return false
}

/**
 * Count pixels matching a color
 */
export function countMatchingPixels(
  imageData: ImageData,
  color: RGBA,
  tolerance = 10
): number {
  let count = 0
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      if (colorsApproximatelyEqual(getPixel(imageData, x, y), color, tolerance)) {
        count++
      }
    }
  }
  return count
}

/**
 * Check if image is NOT entirely transparent
 */
export function hasVisiblePixels(imageData: ImageData): boolean {
  for (let i = 3; i < imageData.data.length; i += 4) {
    if ((imageData.data[i] ?? 0) > 0) {
      return true
    }
  }
  return false
}

/**
 * Check if image is NOT entirely black
 */
export function hasNonBlackPixels(imageData: ImageData): boolean {
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (
      (imageData.data[i] ?? 0) > 0 ||      // R
      (imageData.data[i + 1] ?? 0) > 0 ||  // G
      (imageData.data[i + 2] ?? 0) > 0     // B
    ) {
      return true
    }
  }
  return false
}

/**
 * Get color histogram (count of unique colors)
 */
export function getColorHistogram(imageData: ImageData): Map<string, number> {
  const histogram = new Map<string, number>()
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixel = getPixel(imageData, x, y)
      const key = `${pixel.r},${pixel.g},${pixel.b},${pixel.a}`
      histogram.set(key, (histogram.get(key) ?? 0) + 1)
    }
  }
  return histogram
}

/**
 * Get dominant color (most frequent)
 */
export function getDominantColor(imageData: ImageData): RGBA {
  const histogram = getColorHistogram(imageData)
  let maxCount = 0
  let dominantKey = '0,0,0,0'

  for (const [key, count] of histogram) {
    if (count > maxCount) {
      maxCount = count
      dominantKey = key
    }
  }

  const parts = dominantKey.split(',').map(Number)
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 0 }
}
