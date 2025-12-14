import type { Vector3 } from '@practice/vector'
import type { Color } from './Color'

/**
 * A single line segment with start/end positions and colors
 */
export interface LineSegment {
  readonly start: Vector3
  readonly startColor: Color
  readonly end: Vector3
  readonly endColor: Color
}

/**
 * Collection of line segments for batch rendering
 */
export interface LineSegments {
  readonly type: 'lines'
  readonly segments: readonly LineSegment[]
}

/**
 * A point with position, color, and size
 */
export interface Point {
  readonly position: Vector3
  readonly color: Color
  readonly size: number  // Size in world units
}

export const $LineSegment = {
  create: (
    start: Vector3,
    end: Vector3,
    startColor: Color,
    endColor?: Color
  ): LineSegment => ({
    start,
    startColor,
    end,
    endColor: endColor ?? startColor,
  }),
}

export const $LineSegments = {
  create: (segments: readonly LineSegment[]): LineSegments => ({
    type: 'lines',
    segments,
  }),

  fromVertices: (
    vertices: readonly { position: Vector3; color: Color }[]
  ): LineSegments => {
    const segments: LineSegment[] = []
    for (let i = 0; i < vertices.length - 1; i += 2) {
      const v0 = vertices[i]!
      const v1 = vertices[i + 1]!
      segments.push({
        start: v0.position,
        startColor: v0.color,
        end: v1.position,
        endColor: v1.color,
      })
    }
    return { type: 'lines', segments }
  },
}

export const $Point = {
  create: (position: Vector3, color: Color, size: number = 0.05): Point => ({
    position,
    color,
    size,
  }),
}

/**
 * A vertex with position and color
 */
export interface MeshVertex {
  readonly position: Vector3
  readonly color: Color
}

/**
 * A triangle mesh with vertex colors and transparency
 */
export interface Mesh {
  readonly vertices: readonly MeshVertex[]
  readonly indices: readonly number[]  // Triangle indices (3 per triangle)
  readonly opacity: number  // 0-1
}

export const $Mesh = {
  create: (
    vertices: readonly MeshVertex[],
    indices: readonly number[],
    opacity: number = 1.0
  ): Mesh => ({
    vertices,
    indices,
    opacity: Math.max(0, Math.min(1, opacity)),
  }),
}
