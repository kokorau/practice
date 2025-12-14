import { $LineSegments, $LineSegment, $Color, $Camera, $Point } from '@practice/lighting'
import { $LineScene, type LineScene } from '@practice/lighting/Infra'
import { $Vector3 } from '@practice/vector'
import type { OrthographicCamera, Point } from '@practice/lighting'

/**
 * RGB Cube wireframe scene
 * Shows a 3D RGB color cube with vertex colors
 */

// Cube corners: RGB values map to XYZ positions
const corners = [
  { pos: $Vector3.create(0, 0, 0), color: $Color.create(0, 0, 0) },       // Black
  { pos: $Vector3.create(1, 0, 0), color: $Color.create(1, 0, 0) },       // Red
  { pos: $Vector3.create(0, 1, 0), color: $Color.create(0, 1, 0) },       // Green
  { pos: $Vector3.create(1, 1, 0), color: $Color.create(1, 1, 0) },       // Yellow
  { pos: $Vector3.create(0, 0, 1), color: $Color.create(0, 0, 1) },       // Blue
  { pos: $Vector3.create(1, 0, 1), color: $Color.create(1, 0, 1) },       // Magenta
  { pos: $Vector3.create(0, 1, 1), color: $Color.create(0, 1, 1) },       // Cyan
  { pos: $Vector3.create(1, 1, 1), color: $Color.create(1, 1, 1) },       // White
]

// Cube edges: pairs of corner indices
const edges: [number, number][] = [
  // Bottom face (Z=0)
  [0, 1], [1, 3], [3, 2], [2, 0],
  // Top face (Z=1)
  [4, 5], [5, 7], [7, 6], [6, 4],
  // Vertical edges
  [0, 4], [1, 5], [2, 6], [3, 7],
]

/**
 * Create edge segments for the cube
 */
function createCubeEdges() {
  return edges.map(([i, j]) => {
    const c1 = corners[i]!
    const c2 = corners[j]!
    return $LineSegment.create(c1.pos, c2.pos, c1.color, c2.color)
  })
}

/**
 * Create internal grid lines for the cube
 * resolution: number of divisions per axis
 */
function createCubeGrid(resolution: number = 8) {
  const segments: ReturnType<typeof $LineSegment.create>[] = []

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const u = i / resolution
      const v = j / resolution

      // Lines along R axis (X)
      segments.push($LineSegment.create(
        $Vector3.create(0, u, v),
        $Vector3.create(1, u, v),
        $Color.create(0, u, v),
        $Color.create(1, u, v)
      ))

      // Lines along G axis (Y)
      segments.push($LineSegment.create(
        $Vector3.create(u, 0, v),
        $Vector3.create(u, 1, v),
        $Color.create(u, 0, v),
        $Color.create(u, 1, v)
      ))

      // Lines along B axis (Z)
      segments.push($LineSegment.create(
        $Vector3.create(u, v, 0),
        $Vector3.create(u, v, 1),
        $Color.create(u, v, 0),
        $Color.create(u, v, 1)
      ))
    }
  }

  return segments
}

export interface LineSceneDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly rendererType: 'line'
  readonly createScene: (time: number) => LineScene
  readonly createCamera: (aspectRatio: number) => OrthographicCamera
}

export const RgbCube: LineSceneDefinition = {
  id: 'rgb-cube',
  name: 'RGB Cube',
  description: 'Wireframe RGB color cube with vertex colors',
  rendererType: 'line',

  createCamera(aspectRatio) {
    const baseSize = 2.5
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(2, 2, 2),
      $Vector3.create(0.5, 0.5, 0.5),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(time) {
    const edgeSegments = createCubeEdges()
    const gridSegments = createCubeGrid(8)

    // Animated color point that moves through the cube
    const t = time * 0.3
    const r = (Math.sin(t) + 1) / 2
    const g = (Math.sin(t * 1.3 + 1) + 1) / 2
    const b = (Math.sin(t * 0.7 + 2) + 1) / 2

    const points: Point[] = [
      $Point.create(
        $Vector3.create(r, g, b),
        $Color.create(r, g, b),
        0.08  // Size
      ),
    ]

    const lines = $LineSegments.create([...edgeSegments, ...gridSegments])
    return $LineScene.create(lines, { r: 0.1, g: 0.1, b: 0.12 }, points)
  },
}
