<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Hsl } from '@practice/color'

const props = defineProps<{
  h: number // 0-360 (hue)
  s: number // 0-1 (saturation)
  l: number // 0-1 (lightness)
  lut?: Lut // Optional LUT for color transform
}>()

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let colorPoint: THREE.Mesh
let colorPointAfter: THREE.Mesh
let lutGrid: THREE.LineSegments | null = null

/**
 * Convert HSL to cylindrical coordinates (for 3D positioning)
 * H -> angle, S -> radius, L -> height
 */
function hslToPosition(h: number, s: number, l: number): THREE.Vector3 {
  const angle = (h * Math.PI) / 180
  const radius = s * 0.5 // radius 0-0.5
  const x = radius * Math.cos(angle) + 0.5
  const z = radius * Math.sin(angle) + 0.5
  const y = l
  return new THREE.Vector3(x, y, z)
}

/**
 * Convert HSL to RGB color
 */
function hslToColor(h: number, s: number, l: number): THREE.Color {
  const rgb = $Hsl.toSrgb({ h, s, l })
  // THREE.Color expects 0-1 values, toSrgb already returns 0-1
  return new THREE.Color(rgb.r, rgb.g, rgb.b)
}

function createAxes(): THREE.Group {
  const group = new THREE.Group()

  // Center vertical axis (Lightness)
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(0.5, 1.2, 0.5),
  ])
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x888888 })
  group.add(new THREE.Line(yGeometry, yMaterial))

  // Hue ring at L=0.5 (equator)
  const ringPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2
    ringPoints.push(new THREE.Vector3(
      0.5 * Math.cos(angle) + 0.5,
      0.5,
      0.5 * Math.sin(angle) + 0.5
    ))
  }
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints)
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x444444 })
  group.add(new THREE.Line(ringGeometry, ringMaterial))

  return group
}

/**
 * Create cylinder shell with HSL colors
 */
function createCylinderShell(resolution: number = 32): THREE.Mesh {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Create vertices on cylinder surface (S=1)
  for (let li = 0; li <= resolution; li++) {
    const l = li / resolution
    for (let hi = 0; hi <= resolution; hi++) {
      const h = (hi / resolution) * 360

      const pos = hslToPosition(h, 1, l)
      positions.push(pos.x, pos.y, pos.z)

      const color = hslToColor(h, 1, l)
      colors.push(color.r, color.g, color.b)
    }
  }

  // Create triangles for shell
  for (let li = 0; li < resolution; li++) {
    for (let hi = 0; hi < resolution; hi++) {
      const a = li * (resolution + 1) + hi
      const b = a + 1
      const c = a + (resolution + 1)
      const d = c + 1

      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = -1 // ラインより先に描画
  return mesh
}

/**
 * Create a disc cap for the cylinder (top or bottom)
 * L=0 (bottom) shows gradient from black center to colored edge
 * L=1 (top) shows gradient from white center to colored edge
 */
function createCylinderCap(l: number, resolution: number = 32): THREE.Mesh {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Center vertex
  const centerPos = hslToPosition(0, 0, l)
  positions.push(centerPos.x, centerPos.y, centerPos.z)
  const centerColor = hslToColor(0, 0, l) // S=0 at center
  colors.push(centerColor.r, centerColor.g, centerColor.b)

  // Concentric rings for gradient
  const ringCount = 8
  for (let ri = 1; ri <= ringCount; ri++) {
    const s = ri / ringCount
    for (let hi = 0; hi <= resolution; hi++) {
      const h = (hi / resolution) * 360
      const pos = hslToPosition(h, s, l)
      positions.push(pos.x, pos.y, pos.z)

      const color = hslToColor(h, s, l)
      colors.push(color.r, color.g, color.b)
    }
  }

  // Triangles from center to first ring
  for (let hi = 0; hi < resolution; hi++) {
    const a = 0 // center
    const b = 1 + hi
    const c = 1 + hi + 1
    if (l === 0) {
      // Bottom cap: reverse winding
      indices.push(a, c, b)
    } else {
      // Top cap: normal winding
      indices.push(a, b, c)
    }
  }

  // Triangles between rings
  for (let ri = 0; ri < ringCount - 1; ri++) {
    const ringStart = 1 + ri * (resolution + 1)
    const nextRingStart = 1 + (ri + 1) * (resolution + 1)
    for (let hi = 0; hi < resolution; hi++) {
      const a = ringStart + hi
      const b = ringStart + hi + 1
      const c = nextRingStart + hi
      const d = nextRingStart + hi + 1
      if (l === 0) {
        indices.push(a, c, b)
        indices.push(b, c, d)
      } else {
        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = -1
  return mesh
}

function createHslCylinder(): THREE.Group {
  const group = new THREE.Group()

  const resolution = 48
  group.add(createCylinderShell(resolution))
  group.add(createCylinderCap(0, resolution)) // Bottom cap (L=0, black center)
  group.add(createCylinderCap(1, resolution)) // Top cap (L=1, white center)

  return group
}

function createColorPoint(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.03, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
  return new THREE.Mesh(geometry, material)
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create a wireframe grid in HSL cylinder space that can be transformed by a LUT
 */
function createLutGrid(
  resolution: number = 12,
  transform?: ColorTransform
): THREE.LineSegments {
  const positions: number[] = []
  const colors: number[] = []

  const addLine = (
    h1: number, s1: number, l1: number,
    h2: number, s2: number, l2: number
  ) => {
    // Convert HSL to RGB for color
    const rgb1 = $Hsl.toSrgb({ h: h1, s: s1, l: l1 })
    const rgb2 = $Hsl.toSrgb({ h: h2, s: s2, l: l2 })

    let pos1: THREE.Vector3, pos2: THREE.Vector3

    if (transform) {
      // Apply LUT transform to RGB (both expect 0-1), then convert back to HSL for positioning
      const [r1t, g1t, b1t] = transform(rgb1.r, rgb1.g, rgb1.b)
      const [r2t, g2t, b2t] = transform(rgb2.r, rgb2.g, rgb2.b)

      const hsl1t = $Hsl.fromSrgb({ r: r1t, g: g1t, b: b1t })
      const hsl2t = $Hsl.fromSrgb({ r: r2t, g: g2t, b: b2t })

      pos1 = hslToPosition(hsl1t.h, hsl1t.s, hsl1t.l)
      pos2 = hslToPosition(hsl2t.h, hsl2t.s, hsl2t.l)

      colors.push(r1t, g1t, b1t, r2t, g2t, b2t)
    } else {
      pos1 = hslToPosition(h1, s1, l1)
      pos2 = hslToPosition(h2, s2, l2)

      colors.push(
        rgb1.r, rgb1.g, rgb1.b,
        rgb2.r, rgb2.g, rgb2.b
      )
    }

    positions.push(pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z)
  }

  // Grid lines along each HSL dimension
  const hueSteps = resolution
  const satSteps = Math.max(2, Math.floor(resolution / 3))
  const lightSteps = Math.max(4, Math.floor(resolution * 2 / 3))

  // Lines along Hue (circles at different L and S)
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

  // Lines along Saturation (radial lines)
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

  // Lines along Lightness (vertical lines)
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

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  })

  return new THREE.LineSegments(geometry, material)
}

/**
 * Create transform function from LUT
 */
function createLutTransform(lut: Lut): ColorTransform {
  if ($Lut3D.is(lut)) {
    // 3D LUT expects and returns 0-1 values
    return (r: number, g: number, b: number): [number, number, number] => {
      return $Lut3D.lookup(lut, r, g, b)
    }
  } else {
    // 1D LUT uses 0-255 indices, values are already 0-1
    return (r: number, g: number, b: number): [number, number, number] => {
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)
      // LUT values are already 0-1
      return [lut.r[ri]!, lut.g[gi]!, lut.b[bi]!]
    }
  }
}

function updateLutGrid() {
  if (!scene) return

  if (lutGrid) {
    scene.remove(lutGrid)
    lutGrid.geometry.dispose()
    ;(lutGrid.material as THREE.Material).dispose()
  }

  const transform = props.lut ? createLutTransform(props.lut) : undefined
  lutGrid = createLutGrid(16, transform)
  scene.add(lutGrid)
}

function updateColorPoint() {
  if (!colorPoint || !colorPointAfter) return

  const pos = hslToPosition(props.h, props.s, props.l)
  colorPoint.position.copy(pos)

  const color = hslToColor(props.h, props.s, props.l)
  ;(colorPoint.material as THREE.MeshBasicMaterial).color.copy(color)

  // After point (LUT applied)
  if (props.lut) {
    const rgb = $Hsl.toSrgb({ h: props.h, s: props.s, l: props.l })
    const transform = createLutTransform(props.lut)
    const [rAfter, gAfter, bAfter] = transform(rgb.r, rgb.g, rgb.b)  // rgb is already 0-1
    const hslAfter = $Hsl.fromSrgb({ r: rAfter, g: gAfter, b: bAfter })  // fromSrgb expects 0-1
    const posAfter = hslToPosition(hslAfter.h, hslAfter.s, hslAfter.l)
    colorPointAfter.position.copy(posAfter)
    ;(colorPointAfter.material as THREE.MeshBasicMaterial).color.setRGB(rAfter, gAfter, bAfter)
    colorPointAfter.visible = true
  } else {
    colorPointAfter.visible = false
  }
}

function init() {
  if (!container.value) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(1.5, 1.5, 1.5)
  camera.lookAt(0.5, 0.5, 0.5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0.5, 0.5, 0.5)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  scene.add(createAxes())
  scene.add(createHslCylinder())

  updateLutGrid()

  colorPoint = createColorPoint()
  scene.add(colorPoint)

  colorPointAfter = createColorPoint()
  ;(colorPointAfter.material as THREE.MeshBasicMaterial).wireframe = true
  colorPointAfter.visible = false
  scene.add(colorPointAfter)

  updateColorPoint()

  animate()
}

watch(() => [props.h, props.s, props.l], updateColorPoint)
watch(() => props.lut, () => {
  updateLutGrid()
  updateColorPoint()
})

function animate() {
  animationId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function handleResize() {
  if (!container.value) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

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
  <div ref="container" class="w-full h-full" />
</template>
