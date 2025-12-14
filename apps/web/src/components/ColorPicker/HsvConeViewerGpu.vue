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
import { $Hsv } from '@practice/color'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'

const props = defineProps<{
  h: number // 0-360
  s: number // 0-1
  v: number // 0-1
  lut?: Lut
}>()

const canvas = ref<HTMLCanvasElement>()

let renderer: LineRenderer | null = null
let controls: OrbitControls | null = null
let animationId: number

const BACKGROUND_COLOR = { r: 0.1, g: 0.1, b: 0.18 }

/**
 * Convert HSV to cone coordinates
 * H -> angle, S -> radius (scaled by V), V -> height
 */
function hsvToPosition(h: number, s: number, v: number): Vector3 {
  const angle = (h * Math.PI) / 180
  const radius = s * v * 0.5
  const x = radius * Math.cos(angle) + 0.5
  const z = radius * Math.sin(angle) + 0.5
  const y = v
  return $Vector3.create(x, y, z)
}

/**
 * Convert HSV to RGB color
 */
function hsvToColor(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const rgb = $Hsv.toSrgb({ h, s, v })
  return { r: rgb.r, g: rgb.g, b: rgb.b }
}

/**
 * Create axes and hue ring
 */
function createAxes(): LineSegment[] {
  const segments: LineSegment[] = []

  // Center vertical axis (Value)
  segments.push($LineSegment.create(
    $Vector3.create(0.5, 0, 0.5),
    $Vector3.create(0.5, 1.2, 0.5),
    { r: 0.53, g: 0.53, b: 0.53 }
  ))

  // Hue ring at V=1 (base of cone)
  const ringResolution = 64
  for (let i = 0; i < ringResolution; i++) {
    const angle1 = (i / ringResolution) * Math.PI * 2
    const angle2 = ((i + 1) / ringResolution) * Math.PI * 2
    segments.push($LineSegment.create(
      $Vector3.create(0.5 * Math.cos(angle1) + 0.5, 1.0, 0.5 * Math.sin(angle1) + 0.5),
      $Vector3.create(0.5 * Math.cos(angle2) + 0.5, 1.0, 0.5 * Math.sin(angle2) + 0.5),
      { r: 0.27, g: 0.27, b: 0.27 }
    ))
  }

  return segments
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create LUT grid lines in HSV space
 */
function createLutGrid(
  resolution: number = 12,
  transform?: ColorTransform
): LineSegment[] {
  const segments: LineSegment[] = []

  const addLine = (
    h1: number, s1: number, v1: number,
    h2: number, s2: number, v2: number
  ) => {
    const rgb1 = $Hsv.toSrgb({ h: h1, s: s1, v: v1 })
    const rgb2 = $Hsv.toSrgb({ h: h2, s: s2, v: v2 })

    let pos1: Vector3, pos2: Vector3
    let color1: { r: number; g: number; b: number }
    let color2: { r: number; g: number; b: number }

    if (transform) {
      const [r1t, g1t, b1t] = transform(rgb1.r, rgb1.g, rgb1.b)
      const [r2t, g2t, b2t] = transform(rgb2.r, rgb2.g, rgb2.b)
      const hsv1t = $Hsv.fromSrgb({ r: r1t, g: g1t, b: b1t })
      const hsv2t = $Hsv.fromSrgb({ r: r2t, g: g2t, b: b2t })
      pos1 = hsvToPosition(hsv1t.h, hsv1t.s, hsv1t.v)
      pos2 = hsvToPosition(hsv2t.h, hsv2t.s, hsv2t.v)
      color1 = { r: r1t, g: g1t, b: b1t }
      color2 = { r: r2t, g: g2t, b: b2t }
    } else {
      pos1 = hsvToPosition(h1, s1, v1)
      pos2 = hsvToPosition(h2, s2, v2)
      color1 = { r: rgb1.r, g: rgb1.g, b: rgb1.b }
      color2 = { r: rgb2.r, g: rgb2.g, b: rgb2.b }
    }

    segments.push($LineSegment.create(pos1, pos2, color1, color2))
  }

  const hueSteps = resolution
  const satSteps = Math.max(2, Math.floor(resolution / 3))
  const valSteps = Math.max(4, Math.floor(resolution * 2 / 3))

  // Lines along Hue
  for (let si = 1; si <= satSteps; si++) {
    const s = si / satSteps
    for (let vi = 1; vi <= valSteps; vi++) {
      const v = vi / valSteps
      for (let hi = 0; hi < hueSteps; hi++) {
        const h1 = (hi / hueSteps) * 360
        const h2 = ((hi + 1) / hueSteps) * 360
        addLine(h1, s, v, h2, s, v)
      }
    }
  }

  // Lines along Saturation
  for (let hi = 0; hi < hueSteps; hi++) {
    const h = (hi / hueSteps) * 360
    for (let vi = 1; vi <= valSteps; vi++) {
      const v = vi / valSteps
      for (let si = 0; si < satSteps; si++) {
        const s1 = si / satSteps
        const s2 = (si + 1) / satSteps
        addLine(h, s1, v, h, s2, v)
      }
    }
  }

  // Lines along Value
  for (let hi = 0; hi < hueSteps; hi++) {
    const h = (hi / hueSteps) * 360
    for (let si = 0; si <= satSteps; si++) {
      const s = si / satSteps
      for (let vi = 0; vi < valSteps; vi++) {
        const v1 = vi / valSteps
        const v2 = (vi + 1) / valSteps
        addLine(h, s, v1, h, s, v2)
      }
    }
  }

  return segments
}

/**
 * Create cone shell mesh
 */
function createConeShell(): Mesh {
  return $MeshGeometry.cone(
    0.5,  // radius
    1.0,  // height
    48,   // segments
    (pos) => {
      // pos is in cone space, apex at y=0, base at y=height
      const x = pos.x
      const z = pos.z
      const y = pos.y
      const angle = Math.atan2(z, x)
      const h = ((angle / Math.PI) * 180 + 360) % 360
      const v = y
      return hsvToColor(h, 1, v)
    },
    0.2,  // opacity
    true, // cap
    true  // apexAtBottom (apex at V=0)
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
  const pos = hsvToPosition(props.h, props.s, props.v)
  const color = hsvToColor(props.h, props.s, props.v)

  points.push($Point.create(pos, color, 0.03))

  // After point (if LUT)
  if (props.lut && transform) {
    const rgb = $Hsv.toSrgb({ h: props.h, s: props.s, v: props.v })
    const [rAfter, gAfter, bAfter] = transform(rgb.r, rgb.g, rgb.b)
    const hsvAfter = $Hsv.fromSrgb({ r: rAfter, g: gAfter, b: bAfter })
    const posAfter = hsvToPosition(hsvAfter.h, hsvAfter.s, hsvAfter.v)
    points.push($Point.create(posAfter, { r: rAfter, g: gAfter, b: bAfter }, 0.03))
  }

  // Cone mesh (translated to center at x=0.5, z=0.5)
  const coneMesh = createConeShell()
  const translatedMesh = {
    ...coneMesh,
    vertices: coneMesh.vertices.map(v => ({
      ...v,
      position: $Vector3.create(v.position.x + 0.5, v.position.y, v.position.z + 0.5)
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

watch(() => [props.h, props.s, props.v, props.lut], () => {
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
