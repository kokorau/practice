<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { RayTracingRendererWebGPU, isWebGPUSupported } from '@practice/lighting/Infra'
import { SceneList, type SceneDefinition } from '../modules/LightingShowcase'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const webGPUSupported = ref(false)
const webGPUError = ref<string | null>(null)
const selectedSceneId = ref(SceneList[0]!.id)
const canvasSize = ref({ width: 800, height: 600 })
const fps = ref(0)

let renderer: RayTracingRendererWebGPU | null = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null

function getSelectedScene(): SceneDefinition {
  return SceneList.find(s => s.id === selectedSceneId.value) ?? SceneList[0]!
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
  let lastFrameTime = performance.now()
  let frameCount = 0

  function animate(timestamp: number) {
    if (startTime === null) startTime = timestamp
    const elapsed = (timestamp - startTime) / 1000

    // FPS calculation
    frameCount++
    const now = performance.now()
    if (now - lastFrameTime >= 500) {
      fps.value = frameCount / ((now - lastFrameTime) / 1000)
      frameCount = 0
      lastFrameTime = now
    }

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
          <li v-for="scene in SceneList" :key="scene.id">
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
        <div class="text-gray-600">
          {{ fps.toFixed(1) }} fps
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
