<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'

const props = defineProps<{
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
  lut?: Lut // Optional LUT for color transform
}>()

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let colorPoint: THREE.Mesh
let lutGrid: THREE.LineSegments | null = null

function createAxes(): THREE.Group {
  const group = new THREE.Group()
  const axisLength = 1.2

  // X axis (Red)
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLength, 0, 0),
  ])
  const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
  group.add(new THREE.Line(xGeometry, xMaterial))

  // Y axis (Green)
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLength, 0),
  ])
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
  group.add(new THREE.Line(yGeometry, yMaterial))

  // Z axis (Blue)
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLength),
  ])
  const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff })
  group.add(new THREE.Line(zGeometry, zMaterial))

  return group
}

/**
 * Create a face of the RGB cube with vertex colors for gradient
 * Each face has a fixed axis value (0 or 1) and the other two axes vary
 */
function createCubeFace(
  axis: 'x' | 'y' | 'z',
  value: 0 | 1,
  resolution: number = 2
): THREE.Mesh {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Generate vertices in a grid
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const u = i / resolution
      const v = j / resolution

      let r: number, g: number, b: number

      if (axis === 'x') {
        // X fixed: YZ plane (R fixed, G and B vary)
        r = value
        g = u
        b = v
        positions.push(value, u, v)
      } else if (axis === 'y') {
        // Y fixed: XZ plane (G fixed, R and B vary)
        r = u
        g = value
        b = v
        positions.push(u, value, v)
      } else {
        // Z fixed: XY plane (B fixed, R and G vary)
        r = u
        g = v
        b = value
        positions.push(u, v, value)
      }

      colors.push(r, g, b)
    }
  }

  // Generate triangles
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const a = i * (resolution + 1) + j
      const b = a + 1
      const c = a + (resolution + 1)
      const d = c + 1

      // Two triangles per quad
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
    opacity: 0.3,
  })

  return new THREE.Mesh(geometry, material)
}

function createCubeEdges(): THREE.LineSegments {
  // 12 edges of the cube with vertex colors
  const positions: number[] = []
  const colors: number[] = []

  // Define cube vertices (corners)
  const corners: [number, number, number][] = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ]

  // Define edges as pairs of corner indices
  const edges: [number, number][] = [
    // Bottom face (z=0)
    [0, 1], [1, 3], [3, 2], [2, 0],
    // Top face (z=1)
    [4, 5], [5, 7], [7, 6], [6, 4],
    // Vertical edges
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]

  for (const [i, j] of edges) {
    const [x1, y1, z1] = corners[i]!
    const [x2, y2, z2] = corners[j]!

    positions.push(x1, y1, z1, x2, y2, z2)
    // Use RGB values as colors
    colors.push(x1, y1, z1, x2, y2, z2)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    linewidth: 2,
  })

  return new THREE.LineSegments(geometry, material)
}

function createRgbCube(): THREE.Group {
  const group = new THREE.Group()
  const resolution = 32 // Higher resolution for smoother gradients

  // 6 faces of the cube
  group.add(createCubeFace('x', 0, resolution)) // R=0 (left)
  group.add(createCubeFace('x', 1, resolution)) // R=1 (right)
  group.add(createCubeFace('y', 0, resolution)) // G=0 (bottom)
  group.add(createCubeFace('y', 1, resolution)) // G=1 (top)
  group.add(createCubeFace('z', 0, resolution)) // B=0 (back)
  group.add(createCubeFace('z', 1, resolution)) // B=1 (front)

  // Add edges
  group.add(createCubeEdges())

  return group
}

function createColorPoint(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.03, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const sphere = new THREE.Mesh(geometry, material)
  return sphere
}

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

/**
 * Create a wireframe grid cube that can be transformed by a LUT function
 * Each vertex position is determined by the transform function
 */
function createLutGrid(
  resolution: number = 16,
  transform: ColorTransform = (r, g, b) => [r, g, b]
): THREE.LineSegments {
  const positions: number[] = []
  const colors: number[] = []

  // Helper to add a line segment
  const addLine = (
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
  ) => {
    const [x1, y1, z1] = transform(r1, g1, b1)
    const [x2, y2, z2] = transform(r2, g2, b2)

    positions.push(x1, y1, z1, x2, y2, z2)
    // Color based on original RGB values
    colors.push(r1, g1, b1, r2, g2, b2)
  }

  // Generate grid lines along each axis
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const u = i / resolution
      const v = j / resolution

      // Lines along R axis (varying R, fixed G and B)
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(w1, u, v, w2, u, v)
      }

      // Lines along G axis (fixed R, varying G, fixed B)
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(u, w1, v, u, w2, v)
      }

      // Lines along B axis (fixed R, fixed G, varying B)
      for (let k = 0; k < resolution; k++) {
        const w1 = k / resolution
        const w2 = (k + 1) / resolution
        addLine(u, v, w1, u, v, w2)
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
  return (r: number, g: number, b: number): [number, number, number] => {
    // r, g, b are 0-1, convert to 0-255 index
    const ri = Math.round(r * 255)
    const gi = Math.round(g * 255)
    const bi = Math.round(b * 255)

    // Look up in LUT and convert back to 0-1
    return [
      lut.r[ri]! / 255,
      lut.g[gi]! / 255,
      lut.b[bi]! / 255,
    ]
  }
}

/**
 * Update LUT grid with new transform
 */
function updateLutGrid() {
  if (!scene) return

  // Remove old grid
  if (lutGrid) {
    scene.remove(lutGrid)
    lutGrid.geometry.dispose()
    ;(lutGrid.material as THREE.Material).dispose()
  }

  // Create new grid with LUT transform
  const transform = props.lut ? createLutTransform(props.lut) : undefined
  lutGrid = createLutGrid(16, transform)
  scene.add(lutGrid)
}

function updateColorPoint() {
  if (!colorPoint) return

  const rNorm = props.r / 255
  const gNorm = props.g / 255
  const bNorm = props.b / 255

  colorPoint.position.set(rNorm, gNorm, bNorm)
  ;(colorPoint.material as THREE.MeshBasicMaterial).color.setRGB(rNorm, gNorm, bNorm)
}

function init() {
  if (!container.value) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(2, 2, 2)
  camera.lookAt(0.5, 0.5, 0.5)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0.5, 0.5, 0.5)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Add objects
  scene.add(createAxes())
  scene.add(createRgbCube())

  // Add LUT grid
  updateLutGrid()

  // Add color point
  colorPoint = createColorPoint()
  scene.add(colorPoint)
  updateColorPoint()

  animate()
}

// Watch for color changes
watch(() => [props.r, props.g, props.b], updateColorPoint)

// Watch for LUT changes
watch(() => props.lut, updateLutGrid)

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
