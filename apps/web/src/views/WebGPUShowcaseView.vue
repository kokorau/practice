<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  RayTracingRendererWebGPU,
  $SceneWebGPU,
  $SceneObjectWebGPU,
  isWebGPUSupported,
} from '../modules/Lighting/Infra'
import type { SceneWebGPU } from '../modules/Lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '../modules/Lighting/Domain/ValueObject'
import type { OrthographicCamera } from '../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../modules/Vector/Domain/ValueObject'

// Scene definitions
interface SceneDefinition {
  id: string
  name: string
  description: string
  createScene: (time: number) => SceneWebGPU
  createCamera: (aspectRatio: number) => OrthographicCamera
}

// ============================================
// Buildings Scene
// ============================================
function createBuildingsCamera(aspectRatio: number): OrthographicCamera {
  // Base size for height, width adjusts based on aspect ratio
  const baseSize = 2.5
  const height = baseSize
  const width = baseSize * aspectRatio
  return $Camera.createOrthographic(
    $Vector3.create(0, 2, -2),
    $Vector3.create(0, 0, 5),
    $Vector3.create(0, 1, 0),
    width,
    height
  )
}

const buildings: [number, number, number, number, number][] = [
  [0, 0, 0.12, 0.12, 0.7],
  [0.22, -0.1, 0.09, 0.12, 0.55],
  [0.18, 0.22, 0.1, 0.1, 0.5],
  [0.35, -0.32, 0.08, 0.1, 0.45],
  [-0.2, -0.15, 0.1, 0.1, 0.3],
  [-0.15, 0.2, 0.11, 0.09, 0.28],
  [-0.38, -0.1, 0.1, 0.14, 0.25],
  [0.4, 0.05, 0.08, 0.12, 0.32],
  [0.05, -0.38, 0.14, 0.08, 0.22],
  [-0.05, 0.4, 0.12, 0.08, 0.26],
  [-0.35, 0.3, 0.09, 0.09, 0.3],
  [-0.42, 0.1, 0.07, 0.07, 0.28],
  [0.44, -0.12, 0.06, 0.08, 0.24],
  [-0.45, -0.35, 0.08, 0.08, 0.12],
  [0.45, 0.38, 0.1, 0.08, 0.14],
  [-0.1, -0.42, 0.12, 0.06, 0.1],
  [0.12, 0.45, 0.08, 0.06, 0.11],
]

const buildingColors = [
  $Color.fromRgb255(180, 180, 190),
  $Color.fromRgb255(150, 160, 170),
  $Color.fromRgb255(200, 195, 185),
  $Color.fromRgb255(160, 170, 180),
  $Color.fromRgb255(170, 165, 160),
]

function rotateY(x: number, z: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos - z * sin, x * sin + z * cos]
}

const GROUND_Z = 5
const BASE_Z = 4.5

function createBuildingsScene(time: number): SceneWebGPU {
  const rotationY = time * Math.PI * 0.25

  const scene = $SceneWebGPU.create()

  const withLights = $SceneWebGPU.add(
    scene,
    $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.15),
    $Light.createDirectional(
      $Vector3.create(1, -1, 1),
      $Color.create(1.0, 0.9, 0.8),
      0.7
    ),
    $Light.createDirectional(
      $Vector3.create(-0.5, -1, 0.5),
      $Color.create(0.8, 0.85, 1.0),
      0.3
    )
  )

  const withGround = $SceneWebGPU.add(
    withLights,
    $SceneObjectWebGPU.createPlane(
      $Geometry.createPlane($Vector3.create(0, -0.34, BASE_Z), $Vector3.create(0, 1, 0)),
      $Color.fromRgb255(240, 240, 245)
    ),
    $SceneObjectWebGPU.createBox(
      $Geometry.createBox(
        $Vector3.create(0, -0.32, BASE_Z),
        $Vector3.create(1.3, 0.04, 1.3),
        $Vector3.create(0, rotationY, 0)
      ),
      $Color.fromRgb255(220, 215, 210)
    )
  )

  const buildingObjects = buildings.map((b, i) => {
    const [bx, bz, width, depth, height] = b
    const color = buildingColors[i % buildingColors.length]
    const centerY = height / 2 - 0.3
    const [rx, rz] = rotateY(bx, bz, rotationY)

    return $SceneObjectWebGPU.createBox(
      $Geometry.createBox(
        $Vector3.create(rx, centerY, BASE_Z + rz),
        $Vector3.create(width, height, depth),
        $Vector3.create(0, rotationY, 0)
      ),
      color
    )
  })

  return $SceneWebGPU.add(withGround, ...buildingObjects)
}

// ============================================
// Scene Registry
// ============================================
const scenes: SceneDefinition[] = [
  {
    id: 'buildings',
    name: 'Cityscape',
    description: 'Rotating city with buildings and two-point lighting',
    createScene: createBuildingsScene,
    createCamera: createBuildingsCamera,
  },
]

// ============================================
// Component State
// ============================================
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const webGPUSupported = ref(false)
const webGPUError = ref<string | null>(null)
const selectedSceneId = ref(scenes[0].id)
const canvasSize = ref({ width: 800, height: 600 })

let renderer: RayTracingRendererWebGPU | null = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null

function getSelectedScene(): SceneDefinition {
  return scenes.find(s => s.id === selectedSceneId.value) ?? scenes[0]
}

function updateCanvasSize() {
  if (!containerRef.value) return

  const container = containerRef.value
  const rect = container.getBoundingClientRect()
  canvasSize.value = {
    width: Math.max(100, Math.floor(rect.width)),
    height: Math.max(100, Math.floor(rect.height)),
  }
}

async function initRenderer() {
  if (!canvasRef.value) return

  try {
    renderer = await RayTracingRendererWebGPU.create(canvasRef.value)
  } catch (e) {
    webGPUError.value = e instanceof Error ? e.message : 'Unknown error'
    webGPUSupported.value = false
  }
}

function startAnimation() {
  let startTime: number | null = null

  function animate(timestamp: number) {
    if (startTime === null) startTime = timestamp
    const elapsed = (timestamp - startTime) / 1000

    if (renderer) {
      const sceneDef = getSelectedScene()
      const scene = sceneDef.createScene(elapsed)
      const aspectRatio = canvasSize.value.width / canvasSize.value.height
      const camera = sceneDef.createCamera(aspectRatio)
      renderer.render(scene, camera)
    }

    animationFrameId = requestAnimationFrame(animate)
  }

  animationFrameId = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

watch(selectedSceneId, async () => {
  // Recreate renderer when scene changes (camera might have different aspect)
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  await nextTick()
  await initRenderer()
})

onMounted(async () => {
  webGPUSupported.value = await isWebGPUSupported()

  if (!webGPUSupported.value) {
    webGPUError.value = 'WebGPU is not supported in this browser'
    return
  }

  // Setup resize observer
  if (containerRef.value) {
    updateCanvasSize()
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })
    resizeObserver.observe(containerRef.value)
  }

  await nextTick()
  await initRenderer()
  startAnimation()
})

onUnmounted(() => {
  stopAnimation()
  renderer?.dispose()
  renderer = null
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- Left Panel: Scene List -->
    <aside class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <nav class="flex-1 overflow-y-auto p-2">
        <ul class="space-y-1">
          <li v-for="scene in scenes" :key="scene.id">
            <button
              @click="selectedSceneId = scene.id"
              class="w-full text-left px-3 py-2 rounded-lg transition-colors"
              :class="selectedSceneId === scene.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'"
            >
              <div class="font-medium">{{ scene.name }}</div>
              <div class="text-xs opacity-70 mt-0.5">{{ scene.description }}</div>
            </button>
          </li>
        </ul>
      </nav>

      <div class="p-4 border-t border-gray-700 text-xs text-gray-500 space-y-2">
        <div v-if="webGPUSupported" class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          WebGPU Active
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          WebGPU Not Available
        </div>
        <div class="text-gray-600">
          {{ canvasSize.width }} x {{ canvasSize.height }}
        </div>
      </div>
    </aside>

    <!-- Main Panel: Canvas -->
    <main ref="containerRef" class="flex-1 overflow-hidden">
      <canvas
        v-if="webGPUSupported"
        ref="canvasRef"
        :width="canvasSize.width"
        :height="canvasSize.height"
        class="w-full h-full"
      />

      <div v-else class="w-full h-full flex items-center justify-center">
        <div class="text-center p-8">
          <div class="text-red-400 text-xl font-semibold mb-2">
            WebGPU Not Supported
          </div>
          <p class="text-gray-400">
            {{ webGPUError || 'Please use Chrome 113+, Edge 113+, or Safari 17+' }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
