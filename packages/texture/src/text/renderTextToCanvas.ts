/**
 * Text rendering utilities using Canvas 2D
 */

export interface TextRenderOptions {
  text: string
  fontFamily: string
  fontSize: number        // px
  fontWeight: number      // 100-900
  letterSpacing: number   // em units
  lineHeight: number      // multiplier
  color: string           // CSS color
  maxWidth?: number       // optional max width for wrapping
}

export interface TextRenderResult {
  bitmap: ImageBitmap
  width: number
  height: number
}

/**
 * Render text to an ImageBitmap using Canvas 2D
 * Returns the bitmap along with its dimensions
 */
export async function renderTextToBitmap(
  options: TextRenderOptions,
  scale: number = 2  // Higher scale for sharper text
): Promise<TextRenderResult> {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight,
    color,
    // maxWidth is reserved for future wrapping implementation
  } = options

  // Create offscreen canvas for measuring
  const measureCanvas = new OffscreenCanvas(1, 1)
  const measureCtx = measureCanvas.getContext('2d')!

  // Set font for measuring
  const font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`
  measureCtx.font = font

  // Split text into lines
  const lines = text.split('\n')

  // Calculate letter spacing in pixels
  const letterSpacingPx = letterSpacing * fontSize * scale

  // Measure each line with letter spacing
  const lineMetrics = lines.map(line => {
    const baseWidth = measureCtx.measureText(line).width
    // Add letter spacing for each character except the last
    const spacingWidth = Math.max(0, line.length - 1) * letterSpacingPx
    return {
      text: line,
      width: baseWidth + spacingWidth,
    }
  })

  // Calculate total dimensions
  const maxLineWidth = Math.max(...lineMetrics.map(m => m.width), 1)
  const lineHeightPx = fontSize * scale * lineHeight
  const totalHeight = lines.length * lineHeightPx

  // Add padding for descenders and effects
  const padding = fontSize * scale * 0.2
  const canvasWidth = Math.ceil(maxLineWidth + padding * 2)
  const canvasHeight = Math.ceil(totalHeight + padding * 2)

  // Create the actual canvas
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')!

  // Clear with transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Set text rendering properties
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'top'

  // Render each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const y = padding + i * lineHeightPx

    if (letterSpacingPx === 0) {
      // No letter spacing - use native fillText
      ctx.fillText(line, padding, y)
    } else {
      // Manual letter spacing
      let x = padding
      for (const char of line) {
        ctx.fillText(char, x, y)
        x += measureCtx.measureText(char).width + letterSpacingPx
      }
    }
  }

  // Convert to ImageBitmap
  const bitmap = await createImageBitmap(canvas)

  return {
    bitmap,
    width: canvasWidth / scale,
    height: canvasHeight / scale,
  }
}
