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
import { $Vector3, type Vector3 } from '@practice/vector'
import { $Hsl } from '@practice/color'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'

const props = defineProps<{
  h: number // 0-360
  s: number // 0-1
  l: number // 0-1
  lut?: Lut
}>()

const canvas = ref<HTMLCanvasElement>()

let renderer: LineRenderer | null = null
let controls: OrbitControls | null = null
let animationId: number

const BACKGROUND_COLOR = { r: 0.1, g: 0.1, b: 0.18 }

/**
 * Convert HSL to cylindrical coordinates
 * H -> angle, S -> radius, L -> height
 */
function hslToPosition(h: number, s: number, l: number): Vector3 {
  const angle = (h * Math.PI) / 180
  const radius = s * 0.5
  const x = radius * Math.cos(angle) + 0.5
  const z = radius * Math.sin(angle) + 0.5
  const y = l
  return $Vector3.create(x, y, z)
}

/**
 * Convert HSL to RGB color
 */
function hslToColor(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const rgb = $Hsl.toSrgb({ h, s, l })
  return { r: rgb.r, g: rgb.g, b: rgb.b }
}

/**
 * Create axes and hue ring
 */
function createAxes(): LineSegment[] {
  const segments: LineSegment[] = []

  // Center vertical axis (Lightness)
  segments.push($LineSegment.create(
    $Vector3.create(0.5, 0, 0.5),
    $Vector3.create(0.5, 1.2, 0.5),
    { r: 0.53, g: 0.53, b: 0.53 }
  ))

  // Hue ring at L=0.5
  const ringResolution = 64
  for (let i = 0; i < ringResolution; i++) {
    const angle1 = (i / ringResolution) * Math.PI * 2
    const angle2 = ((i + 1) / ringResolution) * Math.PI * 2
    segments.push($LineSegment.create(
      $Vector3.create(0.5 * Math.cos(angle1) + 0.5, 0.5, 0.5 * Math.sin(angle1) + 0.5),
      $Vector3.create(0.5 * Math.cos(angle2) + 0.5, 0.5, 0.5 * Math.sin(angle2) + 0.5),
      { r: 0.27, g: 0.27, b: 0.27 }
    ))
  }

  return segments
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create LUT grid lines in HSL space
 */
function createLutGrid(
  resolution: number = 12,
  transform?: ColorTransform
): LineSegment[] {
  const segments: LineSegment[] = []

  const addLine = (
    h1: number, s1: number, l1: number,
    h2: number, s2: number, l2: number
  ) => {
    const rgb1 = $Hsl.toSrgb({ h: h1, s: s1, l: l1 })
    const rgb2 = $Hsl.toSrgb({ h: h2, s: s2, l: l2 })

    let pos1: Vector3, pos2: Vector3
    let color1: { r: number; g: number; b: number }
    let color2: { r: number; g: number; b: number }

    if (transform) {
      const [r1t, g1t, b1t] = transform(rgb1.r, rgb1.g, rgb1.b)
      const [r2t, g2t, b2t] = transform(rgb2.r, rgb2.g, rgb2.b)
      const hsl1t = $Hsl.fromSrgb({ r: r1t, g: g1t, b: b1t })
      const hsl2t = $Hsl.fromSrgb({ r: r2t, g: g2t, b: b2t })
      pos1 = hslToPosition(hsl1t.h, hsl1t.s, hsl1t.l)
      pos2 = hslToPosition(hsl2t.h, hsl2t.s, hsl2t.l)
      color1 = { r: r1t, g: g1t, b: b1t }
      color2 = { r: r2t, g: g2t, b: b2t }
    } else {
      pos1 = hslToPosition(h1, s1, l1)
      pos2 = hslToPosition(h2, s2, l2)
      color1 = { r: rgb1.r, g: rgb1.g, b: rgb1.b }
      color2 = { r: rgb2.r, g: rgb2.g, b: rgb2.b }
    }

    segments.push($LineSegment.create(pos1, pos2, color1, color2))
  }

  const hueSteps = resolution
  const satSteps = Math.max(2, Math.floor(resolution / 3))
  const lightSteps = Math.max(4, Math.floor(resolution * 2 / 3))

  // Lines along Hue
  for (let si = 1; si <= satSteps; si++) {
    const s = si / satSteps
    for (let li = 0; li <= lightSteps; li++) {
      const l = li / lightSteps
      for (let hi = 0; hi < hueSteps; hi++) {
        const h1 = (hi / hueSteps) * 360
        const h2 = ((hi + 1) / hueSteps) * 360
        addLine(h1, s, l, h2, s, l)
      }
    }
  }

  // Lines along Saturation
  for (let hi = 0; hi < hueSteps; hi++) {
    const h = (hi / hueSteps) * 360
    for (let li = 0; li <= lightSteps; li++) {
      const l = li / lightSteps
      for (let si = 0; si < satSteps; si++) {
        const s1 = si / satSteps
        const s2 = (si + 1) / satSteps
        addLine(h, s1, l, h, s2, l)
      }
    }
  }

  // Lines along Lightness
  for (let hi = 0; hi < hueSteps; hi++) {
    const h = (hi / hueSteps) * 360
    for (let si = 0; si <= satSteps; si++) {
      const s = si / satSteps
      for (let li = 0; li < lightSteps; li++) {
        const l1 = li / lightSteps
        const l2 = (li + 1) / lightSteps
        addLine(h, s, l1, h, s, l2)
      }
    }
  }

  return segments
}

/**
 * Create cylinder shell mesh
 */
function createCylinderShell(): Mesh {
  return $MeshGeometry.cylinder(
    0.5, // radius
    1.0, // height
    48,  // segments
    (pos) => {
      // pos is in cylinder space, center at origin
      // Convert back to HSL for coloring
      const x = pos.x
      const z = pos.z
      const y = pos.y + 0.5 // shift to 0-1 range
      const angle = Math.atan2(z, x)
      const h = ((angle / Math.PI) * 180 + 360) % 360
      const l = y
      return hslToColor(h, 1, l)
    },
    0.2 // opacity
  )
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
  const allSegments: LineSegment[] = [...createAxes()]

  const transform = props.lut ? createLutTransform(props.lut) : undefined
  allSegments.push(...createLutGrid(16, transform))

  // Color points
  const points: Point[] = []
  const pos = hslToPosition(props.h, props.s, props.l)
  const color = hslToColor(props.h, props.s, props.l)

  points.push($Point.create(pos, color, 0.03))

  // After point (if LUT)
  if (props.lut && transform) {
    const rgb = $Hsl.toSrgb({ h: props.h, s: props.s, l: props.l })
    const [rAfter, gAfter, bAfter] = transform(rgb.r, rgb.g, rgb.b)
    const hslAfter = $Hsl.fromSrgb({ r: rAfter, g: gAfter, b: bAfter })
    const posAfter = hslToPosition(hslAfter.h, hslAfter.s, hslAfter.l)
    points.push($Point.create(posAfter, { r: rAfter, g: gAfter, b: bAfter }, 0.03))
  }

  // Cylinder mesh (translated to center at 0.5, 0.5, 0.5)
  const cylinderMesh = createCylinderShell()
  // Translate vertices
  const translatedMesh = {
    ...cylinderMesh,
    vertices: cylinderMesh.vertices.map(v => ({
      ...v,
      position: $Vector3.create(v.position.x + 0.5, v.position.y + 0.5, v.position.z + 0.5)
    }))
  }

  return $LineScene.create(
    $LineSegments.create(allSegments),
    BACKGROUND_COLOR,
    points,
    [translatedMesh]
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

  const initialPosition = $Vector3.create(1.5, 1.5, 1.5)
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

watch(() => [props.h, props.s, props.l, props.lut], () => {
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
