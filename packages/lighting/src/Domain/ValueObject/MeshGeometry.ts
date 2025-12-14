import { $Vector3, type Vector3 } from '@practice/vector'
import type { Color } from './Color'
import type { Mesh, MeshVertex } from './Line'
import { $Mesh } from './Line'

type ColorFn = (position: Vector3) => Color

/**
 * Mesh geometry generators for common 3D primitives
 */
export const $MeshGeometry = {
  /**
   * Create a box mesh with vertex colors
   * @param center - Center of the box
   * @param size - Size of the box (width, height, depth)
   * @param resolution - Number of subdivisions per face edge (higher = smoother gradients)
   * @param colorFn - Function to compute vertex color from position
   * @param opacity - Mesh opacity (0-1)
   */
  box: (
    center: Vector3,
    size: Vector3,
    resolution: number,
    colorFn: ColorFn,
    opacity: number = 0.3
  ): Mesh => {
    const vertices: MeshVertex[] = []
    const indices: number[] = []

    const halfSize = $Vector3.scale(size, 0.5)

    // Helper to add a face with subdivisions
    const addFace = (
      axis: 'x' | 'y' | 'z',
      value: -1 | 1, // -1 = min side, 1 = max side
      res: number
    ) => {
      const baseIndex = vertices.length

      // Generate vertices in a grid
      for (let i = 0; i <= res; i++) {
        for (let j = 0; j <= res; j++) {
          const u = i / res
          const v = j / res

          let pos: Vector3
          if (axis === 'x') {
            // X fixed: YZ plane
            pos = $Vector3.create(
              center.x + halfSize.x * value,
              center.y + halfSize.y * (u * 2 - 1),
              center.z + halfSize.z * (v * 2 - 1)
            )
          } else if (axis === 'y') {
            // Y fixed: XZ plane
            pos = $Vector3.create(
              center.x + halfSize.x * (u * 2 - 1),
              center.y + halfSize.y * value,
              center.z + halfSize.z * (v * 2 - 1)
            )
          } else {
            // Z fixed: XY plane
            pos = $Vector3.create(
              center.x + halfSize.x * (u * 2 - 1),
              center.y + halfSize.y * (v * 2 - 1),
              center.z + halfSize.z * value
            )
          }

          vertices.push({ position: pos, color: colorFn(pos) })
        }
      }

      // Generate triangles
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const a = baseIndex + i * (res + 1) + j
          const b = a + 1
          const c = a + (res + 1)
          const d = c + 1

          // Two triangles per quad
          indices.push(a, b, c)
          indices.push(b, d, c)
        }
      }
    }

    // 6 faces of the box
    addFace('x', -1, resolution) // left
    addFace('x', 1, resolution)  // right
    addFace('y', -1, resolution) // bottom
    addFace('y', 1, resolution)  // top
    addFace('z', -1, resolution) // back
    addFace('z', 1, resolution)  // front

    return $Mesh.create(vertices, indices, opacity)
  },

  /**
   * Create a cylinder mesh
   * @param radius - Radius of the cylinder
   * @param height - Height of the cylinder (along Y axis)
   * @param segments - Number of segments around the circumference
   * @param colorFn - Function to compute vertex color from position
   * @param opacity - Mesh opacity (0-1)
   * @param caps - Whether to include top and bottom caps
   */
  cylinder: (
    radius: number,
    height: number,
    segments: number,
    colorFn: ColorFn,
    opacity: number = 0.3,
    caps: boolean = true
  ): Mesh => {
    const vertices: MeshVertex[] = []
    const indices: number[] = []

    const halfHeight = height / 2

    // Generate vertices for top and bottom circles
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      // Bottom vertex
      const bottomPos = $Vector3.create(x, -halfHeight, z)
      vertices.push({ position: bottomPos, color: colorFn(bottomPos) })

      // Top vertex
      const topPos = $Vector3.create(x, halfHeight, z)
      vertices.push({ position: topPos, color: colorFn(topPos) })
    }

    // Side faces (quad strip -> triangles)
    for (let i = 0; i < segments; i++) {
      const bl = i * 2       // bottom-left
      const tl = i * 2 + 1   // top-left
      const br = (i + 1) * 2 // bottom-right
      const tr = (i + 1) * 2 + 1 // top-right

      // Two triangles per quad
      indices.push(bl, br, tr)
      indices.push(bl, tr, tl)
    }

    if (caps) {
      // Bottom cap center
      const bottomCenterIdx = vertices.length
      const bottomCenter = $Vector3.create(0, -halfHeight, 0)
      vertices.push({ position: bottomCenter, color: colorFn(bottomCenter) })

      // Top cap center
      const topCenterIdx = vertices.length
      const topCenter = $Vector3.create(0, halfHeight, 0)
      vertices.push({ position: topCenter, color: colorFn(topCenter) })

      // Bottom cap triangles (wind clockwise when viewed from below)
      for (let i = 0; i < segments; i++) {
        const curr = i * 2
        const next = (i + 1) * 2
        indices.push(bottomCenterIdx, next, curr)
      }

      // Top cap triangles (wind counter-clockwise when viewed from above)
      for (let i = 0; i < segments; i++) {
        const curr = i * 2 + 1
        const next = (i + 1) * 2 + 1
        indices.push(topCenterIdx, curr, next)
      }
    }

    return $Mesh.create(vertices, indices, opacity)
  },

  /**
   * Create a cone mesh
   * @param radius - Radius of the cone base
   * @param height - Height of the cone (along Y axis)
   * @param segments - Number of segments around the circumference
   * @param colorFn - Function to compute vertex color from position
   * @param opacity - Mesh opacity (0-1)
   * @param cap - Whether to include the top cap (base of cone)
   * @param apexAtBottom - If true, apex at y=0 and base at y=height (default: true for HSV-style)
   */
  cone: (
    radius: number,
    height: number,
    segments: number,
    colorFn: ColorFn,
    opacity: number = 0.3,
    cap: boolean = true,
    apexAtBottom: boolean = true
  ): Mesh => {
    const vertices: MeshVertex[] = []
    const indices: number[] = []

    // Apex position (tip of cone)
    const apexY = apexAtBottom ? 0 : height
    const baseY = apexAtBottom ? height : 0

    const apexPos = $Vector3.create(0, apexY, 0)
    const apexIdx = 0
    vertices.push({ position: apexPos, color: colorFn(apexPos) })

    // Base circle vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const pos = $Vector3.create(x, baseY, z)
      vertices.push({ position: pos, color: colorFn(pos) })
    }

    // Side faces (triangles from apex to base)
    for (let i = 0; i < segments; i++) {
      const curr = i + 1
      const next = i + 2
      // Winding order depends on apex position
      if (apexAtBottom) {
        indices.push(apexIdx, curr, next)
      } else {
        indices.push(apexIdx, next, curr)
      }
    }

    if (cap) {
      // Base center
      const baseCenterIdx = vertices.length
      const baseCenter = $Vector3.create(0, baseY, 0)
      vertices.push({ position: baseCenter, color: colorFn(baseCenter) })

      // Base cap triangles
      for (let i = 0; i < segments; i++) {
        const curr = i + 1
        const next = i + 2
        if (apexAtBottom) {
          // Base is on top, wind counter-clockwise when viewed from above
          indices.push(baseCenterIdx, curr, next)
        } else {
          // Base is on bottom, wind clockwise when viewed from below
          indices.push(baseCenterIdx, next, curr)
        }
      }
    }

    return $Mesh.create(vertices, indices, opacity)
  },

  /**
   * Create a disc (flat circle) mesh
   * @param radius - Radius of the disc
   * @param segments - Number of segments
   * @param colorFn - Function to compute vertex color from position
   * @param opacity - Mesh opacity (0-1)
   * @param y - Y position of the disc
   */
  disc: (
    radius: number,
    segments: number,
    colorFn: ColorFn,
    opacity: number = 0.3,
    y: number = 0
  ): Mesh => {
    const vertices: MeshVertex[] = []
    const indices: number[] = []

    // Center vertex
    const centerPos = $Vector3.create(0, y, 0)
    vertices.push({ position: centerPos, color: colorFn(centerPos) })

    // Edge vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const pos = $Vector3.create(x, y, z)
      vertices.push({ position: pos, color: colorFn(pos) })
    }

    // Triangles
    for (let i = 0; i < segments; i++) {
      indices.push(0, i + 1, i + 2)
    }

    return $Mesh.create(vertices, indices, opacity)
  },
}
