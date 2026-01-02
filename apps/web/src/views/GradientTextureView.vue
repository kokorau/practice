<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import {
  TextureRenderer,
  createLinearGradientSpec,
  createGradientGrainSpec,
  type ColorStop,
} from '@practice/texture'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const webGPUSupported = ref(false)
const webGPUError = ref<string | null>(null)
const canvasSize = ref({ width: 800, height: 600 })

let renderer: TextureRenderer | null = null
let resizeObserver: ResizeObserver | null = null

// Shader mode
type ShaderMode = 'linearGradient' | 'gradientGrain'
const shaderMode = ref<ShaderMode>('linearGradient')

// Linear Gradient params
const gradientAngle = ref(90)
const stops = ref<ColorStop[]>([
  { color: [1, 0.42, 0.42, 1], position: 0 },    // #ff6b6b
  { color: [0.31, 0.8, 0.77, 1], position: 1 },  // #4ecdc4
])

// Gradient Grain params
const grainColorA = ref<[number, number, number, number]>([1, 0.42, 0.42, 1])
const grainColorB = ref<[number, number, number, number]>([0.31, 0.8, 0.77, 1])
const grainSeed = ref(12345)
const grainIntensity = ref(0.8)
const grainBlendStrength = ref(1.0)

function updateCanvasSize() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  canvasSize.value = {
    width: Math.max(100, Math.floor(rect.width)),
    height: Math.max(100, Math.floor(rect.height)),
  }
}

async function initRenderer() {
  if (!canvasRef.value) return

  try {
    renderer = await TextureRenderer.create(canvasRef.value)
    webGPUSupported.value = true
    render()
  } catch (e) {
    webGPUError.value = e instanceof Error ? e.message : 'Unknown error'
    webGPUSupported.value = false
  }
}

function render() {
  if (!renderer) return

  const viewport = { width: canvasSize.value.width, height: canvasSize.value.height }

  if (shaderMode.value === 'linearGradient') {
    const spec = createLinearGradientSpec(
      { angle: gradientAngle.value, stops: stops.value },
      viewport
    )
    renderer.render(spec)
  } else {
    const spec = createGradientGrainSpec(
      {
        angle: gradientAngle.value,
        colorA: grainColorA.value,
        colorB: grainColorB.value,
        seed: grainSeed.value,
        intensity: grainIntensity.value,
        blendStrength: grainBlendStrength.value,
      },
      viewport
    )
    renderer.render(spec)
  }
}

// Color helpers
function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 1]
}

function rgbaToHex(rgba: [number, number, number, number]): string {
  const r = Math.round(rgba[0] * 255).toString(16).padStart(2, '0')
  const g = Math.round(rgba[1] * 255).toString(16).padStart(2, '0')
  const b = Math.round(rgba[2] * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

const stopColors = computed({
  get: () => stops.value.map(s => rgbaToHex(s.color as [number, number, number, number])),
  set: (newColors: string[]) => {
    stops.value = stops.value.map((s, i) => ({
      ...s,
      color: hexToRgba(newColors[i] || '#ffffff'),
    }))
  },
})

const colorAHex = computed({
  get: () => rgbaToHex(grainColorA.value),
  set: (hex: string) => { grainColorA.value = hexToRgba(hex) },
})

const colorBHex = computed({
  get: () => rgbaToHex(grainColorB.value),
  set: (hex: string) => { grainColorB.value = hexToRgba(hex) },
})

function addStop() {
  if (stops.value.length >= 8) return
  stops.value.push({ color: [1, 1, 1, 1], position: 0.5 })
}

function removeStop(index: number) {
  if (stops.value.length <= 2) return
  stops.value.splice(index, 1)
}

function updateStopColor(index: number, hex: string) {
  const stop = stops.value[index]
  if (stop) {
    stop.color = hexToRgba(hex)
  }
}

// Watch for changes
watch(
  [shaderMode, gradientAngle, stops, grainColorA, grainColorB, grainSeed, grainIntensity, grainBlendStrength, canvasSize],
  () => render(),
  { deep: true }
)

onMounted(async () => {
  if (!navigator.gpu) {
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

  await initRenderer()
})

onUnmounted(() => {
  renderer?.destroy()
  renderer = null
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- Left Panel: Controls -->
    <aside class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto">
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-lg font-semibold">Gradient Texture</h1>
      </div>

      <!-- Shader Mode -->
      <div class="p-4 border-b border-gray-700">
        <label class="block text-sm text-gray-400 mb-2">Mode</label>
        <div class="flex gap-2">
          <button
            @click="shaderMode = 'linearGradient'"
            class="flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="shaderMode === 'linearGradient' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          >
            Linear Gradient
          </button>
          <button
            @click="shaderMode = 'gradientGrain'"
            class="flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="shaderMode === 'gradientGrain' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          >
            Gradient Grain
          </button>
        </div>
      </div>

      <!-- Angle -->
      <div class="p-4 border-b border-gray-700">
        <label class="block text-sm text-gray-400 mb-2">Angle: {{ gradientAngle }}°</label>
        <input
          v-model.number="gradientAngle"
          type="range"
          min="0"
          max="360"
          class="w-full"
        />
      </div>

      <!-- Linear Gradient Controls -->
      <div v-if="shaderMode === 'linearGradient'" class="p-4 border-b border-gray-700">
        <div class="flex justify-between items-center mb-3">
          <label class="text-sm text-gray-400">Color Stops</label>
          <button
            @click="addStop"
            :disabled="stops.length >= 8"
            class="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add
          </button>
        </div>
        <div class="space-y-3">
          <div v-for="(stop, index) in stops" :key="index" class="flex items-center gap-2">
            <input
              type="color"
              :value="stopColors[index]"
              @input="(e) => updateStopColor(index, (e.target as HTMLInputElement).value)"
              class="w-10 h-8 rounded cursor-pointer"
            />
            <input
              v-model.number="stop.position"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="flex-1"
            />
            <span class="w-10 text-xs text-gray-500">{{ Math.round(stop.position * 100) }}%</span>
            <button
              @click="removeStop(index)"
              :disabled="stops.length <= 2"
              class="w-6 h-6 text-gray-500 hover:text-red-400 disabled:opacity-30"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Gradient Grain Controls -->
      <div v-if="shaderMode === 'gradientGrain'" class="p-4 border-b border-gray-700 space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-2">Colors</label>
          <div class="flex gap-4">
            <div class="flex items-center gap-2">
              <input v-model="colorAHex" type="color" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-xs text-gray-500">Start</span>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="colorBHex" type="color" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-xs text-gray-500">End</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-2">Seed: {{ grainSeed }}</label>
          <input v-model.number="grainSeed" type="number" class="w-full px-3 py-2 bg-gray-700 rounded text-sm" />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-2">Intensity: {{ Math.round(grainIntensity * 100) }}%</label>
          <input v-model.number="grainIntensity" type="range" min="0" max="1" step="0.01" class="w-full" />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-2">Blend: {{ Math.round(grainBlendStrength * 100) }}%</label>
          <input v-model.number="grainBlendStrength" type="range" min="0" max="1" step="0.01" class="w-full" />
        </div>
      </div>

      <!-- Status -->
      <div class="mt-auto p-4 border-t border-gray-700 text-xs text-gray-500">
        <div v-if="webGPUSupported" class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          WebGPU Active
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          WebGPU Not Available
        </div>
        <div class="mt-1 text-gray-600">
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
