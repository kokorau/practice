<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { LineRenderer, $LineScene, type LineScene } from '@practice/lighting/Infra/WebGPU'
import { OrbitControls } from '@practice/lighting/Application'
import {
  $LineSegment,
  $LineSegments,
  $Point,
  $MeshGeometry,
  type LineSegment,
  type Point,
  type Mesh,
} from '@practice/lighting'
import { $Vector3 } from '@practice/vector'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'

const props = defineProps<{
  r: number // 0-1
  g: number // 0-1
  b: number // 0-1
  lut?: Lut
}>()

const canvas = ref<HTMLCanvasElement>()

let renderer: LineRenderer | null = null
let controls: OrbitControls | null = null
let animationId: number

const BACKGROUND_COLOR = { r: 0.1, g: 0.1, b: 0.18 }

/**
 * Create RGB axes lines
 */
function createAxes(): LineSegment[] {
  const axisLength = 1.2
  return [
    // X axis (Red)
    $LineSegment.create(
      $Vector3.create(0, 0, 0),
      $Vector3.create(axisLength, 0, 0),
      { r: 1, g: 0, b: 0 }
    ),
    // Y axis (Green)
    $LineSegment.create(
      $Vector3.create(0, 0, 0),
      $Vector3.create(0, axisLength, 0),
      { r: 0, g: 1, b: 0 }
    ),
    // Z axis (Blue)
    $LineSegment.create(
      $Vector3.create(0, 0, 0),
      $Vector3.create(0, 0, axisLength),
      { r: 0, g: 0, b: 1 }
    ),
  ]
}

/**
 * Create cube edge lines with vertex colors
 */
function createCubeEdges(): LineSegment[] {
  const corners: [number, number, number][] = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ]

  const edges: [number, number][] = [
    // Bottom face (z=0)
    [0, 1], [1, 3], [3, 2], [2, 0],
    // Top face (z=1)
    [4, 5], [5, 7], [7, 6], [6, 4],
    // Vertical edges
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]

  return edges.map(([i, j]) => {
    const c1 = corners[i]!
    const c2 = corners[j]!
    return $LineSegment.create(
      $Vector3.create(c1[0], c1[1], c1[2]),
      $Vector3.create(c2[0], c2[1], c2[2]),
      { r: c1[0], g: c1[1], b: c1[2] },
      { r: c2[0], g: c2[1], b: c2[2] }
    )
  })
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create LUT grid lines
 */
function createLutGrid(
  resolution: number = 8,
  transform: ColorTransform = (r, g, b) => [r, g, b]
): LineSegment[] {
  const segments: LineSegment[] = []

  const addLine = (
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
  ) => {
    const [x1, y1, z1] = transform(r1, g1, b1)
    const [x2, y2, z2] = transform(r2, g2, b2)
    segments.push($LineSegment.create(
      $Vector3.create(x1, y1, z1),
      $Vector3.create(x2, y2, z2),
      { r: r1, g: g1, b: b1 },
      { r: r2, g: g2, b: b2 }
    ))
  }

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const u = i / resolution
      const v = j / resolution

      // Lines along R axis
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(w1, u, v, w2, u, v)
      }

      // Lines along G axis
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(u, w1, v, u, w2, v)
      }

      // Lines along B axis
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(u, v, w1, u, v, w2)
      }
    }
  }

  return segments
}

/**
 * Create cube face meshes with vertex colors
 */
function createCubeFaces(): Mesh[] {
  const center = $Vector3.create(0.5, 0.5, 0.5)
  const size = $Vector3.create(1, 1, 1)

  // Use box mesh generator with RGB color function
  const mesh = $MeshGeometry.box(
    center,
    size,
    16, // resolution
    (pos) => ({ r: pos.x, g: pos.y, b: pos.z }),
    0.3 // opacity
  )

  return [mesh]
}

/**
 * Create LUT transform function
 */
function createLutTransform(lut: Lut): ColorTransform {
  if ($Lut3D.is(lut)) {
    return (r, g, b) => $Lut3D.lookup(lut, r, g, b)
  } else {
    return (r, g, b) => {
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)
      return [lut.r[ri]!, lut.g[gi]!, lut.b[bi]!]
    }
  }
}

/**
 * Build the complete scene
 */
function buildScene(): LineScene {
  const allSegments: LineSegment[] = [
    ...createAxes(),
    ...createCubeEdges(),
  ]

  // LUT grid
  const transform = props.lut ? createLutTransform(props.lut) : undefined
  allSegments.push(...createLutGrid(8, transform))

  // Color points
  const points: Point[] = []
  const { r, g, b } = props

  // Before point
  points.push($Point.create(
    $Vector3.create(r, g, b),
    { r, g, b },
    0.03
  ))

  // After point (if LUT)
  if (props.lut && transform) {
    const [rAfter, gAfter, bAfter] = transform(r, g, b)
    points.push($Point.create(
      $Vector3.create(rAfter, gAfter, bAfter),
      { r: rAfter, g: gAfter, b: bAfter },
      0.03
    ))
  }

  // Cube faces
  const meshes = createCubeFaces()

  return $LineScene.create(
    $LineSegments.create(allSegments),
    BACKGROUND_COLOR,
    points,
    meshes
  )
}

function render() {
  if (!renderer || !controls || !canvas.value) return

  controls.update()

  const width = canvas.value.clientWidth
  const height = canvas.value.clientHeight

  const camera = controls.createPerspectiveCamera(45, width / height)
  const scene = buildScene()

  renderer.render(scene, camera)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  render()
}

async function init() {
  if (!canvas.value) return

  const width = canvas.value.clientWidth
  const height = canvas.value.clientHeight
  canvas.value.width = width * window.devicePixelRatio
  canvas.value.height = height * window.devicePixelRatio

  try {
    renderer = await LineRenderer.create(canvas.value)
  } catch (e) {
    console.error('WebGPU not supported:', e)
    return
  }

  const initialPosition = $Vector3.create(2, 2, 2)
  controls = new OrbitControls(canvas.value, initialPosition, {
    target: $Vector3.create(0.5, 0.5, 0.5),
    enableDamping: true,
    dampingFactor: 0.05,
  })

  animate()
}

function handleResize() {
  if (!canvas.value) return
  const width = canvas.value.clientWidth
  const height = canvas.value.clientHeight
  canvas.value.width = width * window.devicePixelRatio
  canvas.value.height = height * window.devicePixelRatio
}

watch(() => [props.r, props.g, props.b, props.lut], () => {
  // Scene will be rebuilt on next render
})

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationId)
  renderer?.dispose()
  controls?.dispose()
})
</script>

<template>
  <canvas ref="canvas" class="w-full h-full" />
</template>
