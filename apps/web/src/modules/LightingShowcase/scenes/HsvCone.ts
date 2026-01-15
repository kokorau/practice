import { $LineSegments, $LineSegment, $Color, $Camera, $MeshGeometry, type Color } from '@practice/lighting'
import { $LineScene } from '@practice/lighting/Infra'
import { $Vector3 } from '@practice/vector'
import type { LineSceneDefinition } from './RgbCube'
import { hsvToRgbNormalized } from '../../Filter/Domain/ValueObject/colors'

/**
 * HSV Cone scene
 * Shows a 3D HSV color cone with hue around the circumference,
 * saturation as radius, and value as height
 */

const RADIUS = 1
const HEIGHT = 2
const SEGMENTS = 32

/**
 * Convert HSV (h: 0-1, s: 0-1, v: 0-1) to Color
 */
function hsvToColor(h: number, s: number, v: number): Color {
  const { r, g, b } = hsvToRgbNormalized(h, s, v)
  return $Color.create(r, g, b)
}

/**
 * Map cone position to HSV color
 * Cone apex (black) at bottom, full colors at top edge
 * X,Z -> Hue (angle), distance from axis -> Saturation, Y -> Value
 */
function positionToHsvColor(pos: { x: number; y: number; z: number }): Color {
  const angle = Math.atan2(pos.z, pos.x)
  const h = (angle + Math.PI) / (2 * Math.PI) // 0-1
  const v = pos.y / HEIGHT // 0-1 (value = height)

  // At height y, max radius is (y/HEIGHT) * RADIUS
  const maxRadius = (pos.y / HEIGHT) * RADIUS
  const currentRadius = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
  const s = maxRadius > 0 ? Math.min(1, currentRadius / maxRadius) : 0 // saturation

  return hsvToColor(h, s, v)
}

/**
 * Create wireframe lines for the cone
 */
function createConeWireframe() {
  const segments: ReturnType<typeof $LineSegment.create>[] = []

  const apex = $Vector3.create(0, 0, 0)
  const apexColor = positionToHsvColor(apex) // Black

  // Lines from apex to base edge
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2
    const x = Math.cos(angle) * RADIUS
    const z = Math.sin(angle) * RADIUS
    const basePoint = $Vector3.create(x, HEIGHT, z)
    segments.push($LineSegment.create(apex, basePoint, apexColor, positionToHsvColor(basePoint)))
  }

  // Horizontal rings at different heights
  const ringCount = 8
  for (let j = 1; j <= ringCount; j++) {
    const y = (j / ringCount) * HEIGHT
    const ringRadius = (j / ringCount) * RADIUS

    for (let i = 0; i < SEGMENTS; i++) {
      const angle1 = (i / SEGMENTS) * Math.PI * 2
      const angle2 = ((i + 1) / SEGMENTS) * Math.PI * 2

      const p1 = $Vector3.create(Math.cos(angle1) * ringRadius, y, Math.sin(angle1) * ringRadius)
      const p2 = $Vector3.create(Math.cos(angle2) * ringRadius, y, Math.sin(angle2) * ringRadius)
      segments.push($LineSegment.create(p1, p2, positionToHsvColor(p1), positionToHsvColor(p2)))
    }
  }

  return segments
}

export const HsvCone: LineSceneDefinition = {
  id: 'hsv-cone',
  name: 'HSV Cone',
  description: 'HSV color space cone with hue/saturation/value',
  rendererType: 'line',

  createCamera(aspectRatio) {
    const baseSize = 4
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(3, 2, 3),
      $Vector3.create(0, 0.8, 0),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(_time) {
    const wireframe = createConeWireframe()
    const mesh = $MeshGeometry.cone(RADIUS, HEIGHT, SEGMENTS, positionToHsvColor, 0.15, true)

    const lines = $LineSegments.create(wireframe)
    return $LineScene.create(lines, { r: 0.1, g: 0.1, b: 0.12 }, [], [mesh])
  },
}
