<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import {
  type GradientVO,
  $GradientVO,
  $ColorPoint,
  $P3Color,
  $Vec2,
  GradientRenderer,
  isWebGPUSupported,
} from '@practice/gradient'

const canvas = ref<HTMLCanvasElement>()
const isSupported = ref<boolean | null>(null)
const error = ref<string | null>(null)
let renderer: GradientRenderer | null = null

// Gradient parameters
const softness = ref(0.5)
const preserveChroma = ref(0.5)
const warpAmplitude = ref(0)
const warpFrequency = ref(2)
const warpOctaves = ref(4)
const grainAmount = ref(0)

// Default color points
const colorPoints = ref([
  { x: 0.2, y: 0.3, r: 0.9, g: 0.2, b: 0.3, radius: 0.5 },
  { x: 0.8, y: 0.7, r: 0.2, g: 0.5, b: 0.9, radius: 0.5 },
  { x: 0.5, y: 0.2, r: 0.3, g: 0.8, b: 0.4, radius: 0.4 },
])

const gradient = computed<GradientVO>(() =>
  $GradientVO.create({
    points: colorPoints.value.map((p) =>
      $ColorPoint.create(
        $Vec2.create(p.x, p.y),
        $P3Color.create(p.r, p.g, p.b, 1),
        p.radius,
        1
      )
    ),
    mix: {
      softness: softness.value,
      preserveChroma: preserveChroma.value,
    },
    warp: {
      seed: 42,
      amplitude: warpAmplitude.value,
      frequency: warpFrequency.value,
      octaves: warpOctaves.value,
      lacunarity: 2,
      gain: 0.5,
    },
    post: {
      grainSeed: 0,
      grainAmount: grainAmount.value,
      grainScale: 1,
      ditherAmount: 0,
    },
  })
)

async function init() {
  isSupported.value = await isWebGPUSupported()

  if (!isSupported.value) {
    error.value = 'WebGPU is not supported in this browser'
    return
  }

  if (!canvas.value) return

  try {
    renderer = await GradientRenderer.create(canvas.value)
    render()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }
}

function render() {
  if (!renderer) return
  renderer.render(gradient.value)
}

function handleResize() {
  if (!canvas.value || !renderer) return
  canvas.value.width = canvas.value.clientWidth * devicePixelRatio
  canvas.value.height = canvas.value.clientHeight * devicePixelRatio
  renderer.resize(canvas.value.width, canvas.value.height)
  render()
}

watch(gradient, render, { deep: true })

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  renderer?.dispose()
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Gradient Lab</h1>
      <p class="text-gray-400 mb-8">
        2Dアンビエントグラデーションの生成とFBM warp効果
      </p>

      <div v-if="error" class="bg-red-900/50 border border-red-500 rounded p-4 mb-6">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Canvas -->
        <div class="lg:col-span-2">
          <div class="bg-gray-800 rounded-lg p-4">
            <canvas
              ref="canvas"
              class="w-full aspect-square rounded"
              :width="512"
              :height="512"
            />
          </div>
        </div>

        <!-- Controls -->
        <div class="space-y-6">
          <!-- Mix Settings -->
          <div class="bg-gray-800 rounded-lg p-4">
            <h2 class="text-lg font-semibold mb-4">Mix Settings</h2>

            <label class="block mb-4">
              <span class="text-sm text-gray-400">Softness</span>
              <input
                v-model.number="softness"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ softness.toFixed(2) }}</span>
            </label>

            <label class="block">
              <span class="text-sm text-gray-400">Preserve Chroma</span>
              <input
                v-model.number="preserveChroma"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ preserveChroma.toFixed(2) }}</span>
            </label>
          </div>

          <!-- Warp Settings -->
          <div class="bg-gray-800 rounded-lg p-4">
            <h2 class="text-lg font-semibold mb-4">Domain Warp (FBM)</h2>

            <label class="block mb-4">
              <span class="text-sm text-gray-400">Amplitude</span>
              <input
                v-model.number="warpAmplitude"
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ warpAmplitude.toFixed(2) }}</span>
            </label>

            <label class="block mb-4">
              <span class="text-sm text-gray-400">Frequency</span>
              <input
                v-model.number="warpFrequency"
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ warpFrequency.toFixed(1) }}</span>
            </label>

            <label class="block">
              <span class="text-sm text-gray-400">Octaves</span>
              <input
                v-model.number="warpOctaves"
                type="range"
                min="1"
                max="8"
                step="1"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ warpOctaves }}</span>
            </label>
          </div>

          <!-- Post Settings -->
          <div class="bg-gray-800 rounded-lg p-4">
            <h2 class="text-lg font-semibold mb-4">Post Processing</h2>

            <label class="block">
              <span class="text-sm text-gray-400">Grain Amount</span>
              <input
                v-model.number="grainAmount"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ grainAmount.toFixed(2) }}</span>
            </label>
          </div>

          <!-- Color Points -->
          <div class="bg-gray-800 rounded-lg p-4">
            <h2 class="text-lg font-semibold mb-4">Color Points</h2>

            <div
              v-for="(point, index) in colorPoints"
              :key="index"
              class="mb-4 p-3 bg-gray-700 rounded"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium">Point {{ index + 1 }}</span>
                <div
                  class="w-6 h-6 rounded border border-gray-500"
                  :style="{
                    backgroundColor: `color(display-p3 ${point.r} ${point.g} ${point.b})`,
                  }"
                />
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <label>
                  X: <input v-model.number="point.x" type="number" min="0" max="1" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
                <label>
                  Y: <input v-model.number="point.y" type="number" min="0" max="1" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
                <label>
                  R: <input v-model.number="point.r" type="number" min="0" max="1" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
                <label>
                  G: <input v-model.number="point.g" type="number" min="0" max="1" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
                <label>
                  B: <input v-model.number="point.b" type="number" min="0" max="1" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
                <label>
                  Radius: <input v-model.number="point.radius" type="number" min="0.1" max="2" step="0.1" class="w-16 bg-gray-600 rounded px-1" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
