<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Hsv } from '../../modules/Color/Domain/ValueObject'

const props = defineProps<{
  h: number // 0-360 (hue)
  s: number // 0-1 (saturation)
  v: number // 0-1 (value)
  lut?: Lut
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
 * Convert HSV to cone coordinates (for 3D positioning)
 * H -> angle, S -> radius (scaled by V), V -> height
 * HSV cone: apex at V=0 (black), base at V=1
 */
function hsvToPosition(h: number, s: number, v: number): THREE.Vector3 {
  const angle = (h * Math.PI) / 180
  // In HSV cone, radius is S * V (cone shape: radius increases with V)
  const radius = s * v * 0.5
  const x = radius * Math.cos(angle) + 0.5
  const z = radius * Math.sin(angle) + 0.5
  const y = v
  return new THREE.Vector3(x, y, z)
}

/**
 * Convert HSV to RGB color
 */
function hsvToColor(h: number, s: number, v: number): THREE.Color {
  const rgb = $Hsv.toSrgb({ h, s, v })
  return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255)
}

function createAxes(): THREE.Group {
  const group = new THREE.Group()

  // Center vertical axis (Value)
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(0.5, 1.2, 0.5),
  ])
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x888888 })
  group.add(new THREE.Line(yGeometry, yMaterial))

  // Hue ring at V=1 (base of cone)
  const ringPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2
    ringPoints.push(new THREE.Vector3(
      0.5 * Math.cos(angle) + 0.5,
      1.0,
      0.5 * Math.sin(angle) + 0.5
    ))
  }
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints)
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x444444 })
  group.add(new THREE.Line(ringGeometry, ringMaterial))

  return group
}

/**
 * Create cone shell with HSV colors
 */
function createConeShell(resolution: number = 32): THREE.Mesh {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Create vertices on cone surface (S=1)
  for (let vi = 0; vi <= resolution; vi++) {
    const v = vi / resolution
    for (let hi = 0; hi <= resolution; hi++) {
      const h = (hi / resolution) * 360

      const pos = hsvToPosition(h, 1, v)
      positions.push(pos.x, pos.y, pos.z)

      const color = hsvToColor(h, 1, v)
      colors.push(color.r, color.g, color.b)
    }
  }

  // Create triangles
  for (let vi = 0; vi < resolution; vi++) {
    for (let hi = 0; hi < resolution; hi++) {
      const a = vi * (resolution + 1) + hi
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
  mesh.renderOrder = -1
  return mesh
}

function createHsvCone(): THREE.Group {
  const group = new THREE.Group()
  group.add(createConeShell(48))
  return group
}

function createColorPoint(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.03, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
  return new THREE.Mesh(geometry, material)
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create a wireframe grid in HSV cone space that can be transformed by a LUT
 */
function createLutGrid(
  resolution: number = 12,
  transform?: ColorTransform
): THREE.LineSegments {
  const positions: number[] = []
  const colors: number[] = []

  const addLine = (
    h1: number, s1: number, v1: number,
    h2: number, s2: number, v2: number
  ) => {
    // Convert HSV to RGB for color
    const rgb1 = $Hsv.toSrgb({ h: h1, s: s1, v: v1 })
    const rgb2 = $Hsv.toSrgb({ h: h2, s: s2, v: v2 })

    let pos1: THREE.Vector3, pos2: THREE.Vector3

    if (transform) {
      // Apply LUT transform to RGB, then convert back to HSV for positioning
      const [r1t, g1t, b1t] = transform(rgb1.r / 255, rgb1.g / 255, rgb1.b / 255)
      const [r2t, g2t, b2t] = transform(rgb2.r / 255, rgb2.g / 255, rgb2.b / 255)

      const hsv1t = $Hsv.fromSrgb({ r: Math.round(r1t * 255), g: Math.round(g1t * 255), b: Math.round(b1t * 255) })
      const hsv2t = $Hsv.fromSrgb({ r: Math.round(r2t * 255), g: Math.round(g2t * 255), b: Math.round(b2t * 255) })

      pos1 = hsvToPosition(hsv1t.h, hsv1t.s, hsv1t.v)
      pos2 = hsvToPosition(hsv2t.h, hsv2t.s, hsv2t.v)

      colors.push(r1t, g1t, b1t, r2t, g2t, b2t)
    } else {
      pos1 = hsvToPosition(h1, s1, v1)
      pos2 = hsvToPosition(h2, s2, v2)

      colors.push(
        rgb1.r / 255, rgb1.g / 255, rgb1.b / 255,
        rgb2.r / 255, rgb2.g / 255, rgb2.b / 255
      )
    }

    positions.push(pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z)
  }

  // Grid lines along each HSV dimension
  const hueSteps = resolution
  const satSteps = Math.max(2, Math.floor(resolution / 3))
  const valSteps = Math.max(4, Math.floor(resolution * 2 / 3))

  // Lines along Hue (circles at different V and S)
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

  // Lines along Saturation (radial lines)
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

  // Lines along Value (vertical lines from apex)
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
    return (r: number, g: number, b: number): [number, number, number] => {
      return $Lut3D.lookup(lut, r, g, b)
    }
  } else {
    return (r: number, g: number, b: number): [number, number, number] => {
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)
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
  lutGrid = createLutGrid(24, transform)
  scene.add(lutGrid)
}

function updateColorPoint() {
  if (!colorPoint || !colorPointAfter) return

  const pos = hsvToPosition(props.h, props.s, props.v)
  colorPoint.position.copy(pos)

  const color = hsvToColor(props.h, props.s, props.v)
  ;(colorPoint.material as THREE.MeshBasicMaterial).color.copy(color)

  // After point (LUT applied)
  if (props.lut) {
    const rgb = $Hsv.toSrgb({ h: props.h, s: props.s, v: props.v })
    const transform = createLutTransform(props.lut)
    const [rAfter, gAfter, bAfter] = transform(rgb.r / 255, rgb.g / 255, rgb.b / 255)
    const hsvAfter = $Hsv.fromSrgb({
      r: Math.round(rAfter * 255),
      g: Math.round(gAfter * 255),
      b: Math.round(bAfter * 255)
    })
    const posAfter = hsvToPosition(hsvAfter.h, hsvAfter.s, hsvAfter.v)
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
  scene.add(createHsvCone())

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

watch(() => [props.h, props.s, props.v], updateColorPoint)
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
