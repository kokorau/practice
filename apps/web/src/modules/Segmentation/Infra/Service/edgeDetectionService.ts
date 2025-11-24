/**
 * Edge Detection Service
 * Sobelフィルタを使ったエッジ検出
 */

/**
 * Sobelエッジ検出を実行
 * @returns エッジ強度マップ (0-255のUint8Array, width*height)
 */
export const detectEdges = (imageData: ImageData): Uint8Array => {
  const { data, width, height } = imageData
  const edges = new Uint8Array(width * height)

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  // Convert to grayscale and compute gradients
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0
      let gy = 0

      // Apply 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          // Grayscale using luminance
          const gray = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114

          const ki = (ky + 1) * 3 + (kx + 1)
          gx += gray * sobelX[ki]!
          gy += gray * sobelY[ki]!
        }
      }

      // Magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      edges[y * width + x] = Math.min(255, Math.round(magnitude))
    }
  }

  return edges
}

/**
 * エッジマップを2値化
 * @param threshold 閾値 (0-255)
 */
export const thresholdEdges = (
  edges: Uint8Array,
  threshold: number = 50
): Uint8Array => {
  const binary = new Uint8Array(edges.length)

  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i]! >= threshold ? 255 : 0
  }

  return binary
}

/**
 * エッジマップをImageDataに変換（可視化用）
 */
export const edgesToImageData = (
  edges: Uint8Array,
  width: number,
  height: number
): ImageData => {
  const output = new ImageData(width, height)
  const { data } = output

  for (let i = 0; i < edges.length; i++) {
    const v = edges[i]!
    const idx = i * 4
    data[idx] = v     // R
    data[idx + 1] = v // G
    data[idx + 2] = v // B
    data[idx + 3] = 255 // A
  }

  return output
}
