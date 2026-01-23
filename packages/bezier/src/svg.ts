/**
 * SVG path rendering for bezier paths
 */

import type { BezierPath } from './types'

/**
 * Generate SVG path string for the curve (for rendering)
 * Coordinates are scaled to the specified width/height.
 * Y axis is inverted (SVG coordinate system).
 */
export const toSvgPath = (path: BezierPath, width: number, height: number): string => {
  const { anchors } = path
  if (anchors.length < 2) return ''

  const toSvgX = (x: number) => x * width
  const toSvgY = (y: number) => (1 - y) * height // SVG Y is inverted

  const parts: string[] = []

  // Move to first point
  const first = anchors[0]!
  parts.push(`M ${toSvgX(first.x)} ${toSvgY(first.y)}`)

  // Cubic bezier to each subsequent point
  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[i]!
    const p1 = anchors[i + 1]!

    const cp1x = toSvgX(p0.x + p0.handleOut.dx)
    const cp1y = toSvgY(p0.y + p0.handleOut.dy)
    const cp2x = toSvgX(p1.x + p1.handleIn.dx)
    const cp2y = toSvgY(p1.y + p1.handleIn.dy)
    const endX = toSvgX(p1.x)
    const endY = toSvgY(p1.y)

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`)
  }

  return parts.join(' ')
}
