import { $LineSegments, $LineSegment, $Color, $Camera, $MeshGeometry, type Color } from '@practice/lighting'
import { $LineScene } from '@practice/lighting/Infra'
import { $Vector3 } from '@practice/vector'
import type { LineSceneDefinition } from './RgbCube'

/**
 * HSL Cylinder scene
 * Shows a 3D HSL color cylinder with hue around the circumference,
 * saturation as radius, and lightness as height
 */

const RADIUS = 1
const HEIGHT = 2
const SEGMENTS = 32

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): Color {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0
  if (h < 1/6) { r = c; g = x; b = 0 }
  else if (h < 2/6) { r = x; g = c; b = 0 }
  else if (h < 3/6) { r = 0; g = c; b = x }
  else if (h < 4/6) { r = 0; g = x; b = c }
  else if (h < 5/6) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return $Color.create(r + m, g + m, b + m)
}

/**
 * Map cylinder position to HSL color
 * X,Z -> Hue (angle), Y -> Lightness
 */
function positionToHslColor(pos: { x: number; y: number; z: number }): Color {
  const angle = Math.atan2(pos.z, pos.x)
  const h = (angle + Math.PI) / (2 * Math.PI) // 0-1
  const s = Math.sqrt(pos.x * pos.x + pos.z * pos.z) / RADIUS // 0-1
  const l = (pos.y + HEIGHT / 2) / HEIGHT // 0-1
  return hslToRgb(h, Math.min(1, s), l)
}

/**
 * Create wireframe lines for the cylinder
 */
function createCylinderWireframe() {
  const segments: ReturnType<typeof $LineSegment.create>[] = []
  const halfHeight = HEIGHT / 2

  // Vertical lines
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2
    const x = Math.cos(angle) * RADIUS
    const z = Math.sin(angle) * RADIUS

    const bottom = $Vector3.create(x, -halfHeight, z)
    const top = $Vector3.create(x, halfHeight, z)
    segments.push($LineSegment.create(bottom, top, positionToHslColor(bottom), positionToHslColor(top)))
  }

  // Horizontal rings
  const ringCount = 8
  for (let j = 0; j <= ringCount; j++) {
    const y = -halfHeight + (j / ringCount) * HEIGHT
    for (let i = 0; i < SEGMENTS; i++) {
      const angle1 = (i / SEGMENTS) * Math.PI * 2
      const angle2 = ((i + 1) / SEGMENTS) * Math.PI * 2

      const p1 = $Vector3.create(Math.cos(angle1) * RADIUS, y, Math.sin(angle1) * RADIUS)
      const p2 = $Vector3.create(Math.cos(angle2) * RADIUS, y, Math.sin(angle2) * RADIUS)
      segments.push($LineSegment.create(p1, p2, positionToHslColor(p1), positionToHslColor(p2)))
    }
  }

  return segments
}

export const HslCylinder: LineSceneDefinition = {
  id: 'hsl-cylinder',
  name: 'HSL Cylinder',
  description: 'HSL color space cylinder with hue/saturation/lightness',
  rendererType: 'line',

  createCamera(aspectRatio) {
    const baseSize = 4
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(3, 2, 3),
      $Vector3.create(0, 0, 0),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(_time) {
    const wireframe = createCylinderWireframe()
    const mesh = $MeshGeometry.cylinder(RADIUS, HEIGHT, SEGMENTS, positionToHslColor, 0.15, true)

    const lines = $LineSegments.create(wireframe)
    return $LineScene.create(lines, { r: 0.1, g: 0.1, b: 0.12 }, [], [mesh])
  },
}
