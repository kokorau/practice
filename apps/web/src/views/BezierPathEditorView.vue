<script setup lang="ts">
import { ref, computed } from 'vue'
import BezierPathEditor from '../components/BezierPathEditor.vue'
import { $BezierPath, type BezierPath } from '../modules/BezierPath'

// Demo paths
const presets = {
  linear: $BezierPath.identity(),
  easeInOut: $BezierPath.easeInOut(),
  bounce: {
    anchors: [
      { x: 0, y: 0, handleMode: 'smooth' as const, handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0.2, dy: 0 } },
      { x: 0.4, y: 1.2, handleMode: 'smooth' as const, handleIn: { dx: -0.1, dy: 0 }, handleOut: { dx: 0.1, dy: 0 } },
      { x: 0.7, y: 0.9, handleMode: 'smooth' as const, handleIn: { dx: -0.1, dy: 0 }, handleOut: { dx: 0.1, dy: 0 } },
      { x: 1, y: 1, handleMode: 'smooth' as const, handleIn: { dx: -0.2, dy: 0 }, handleOut: { dx: 0, dy: 0 } },
    ],
  },
  overshoot: {
    anchors: [
      { x: 0, y: 0, handleMode: 'smooth' as const, handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0.3, dy: 0.8 } },
      { x: 1, y: 1, handleMode: 'smooth' as const, handleIn: { dx: -0.3, dy: 0.8 }, handleOut: { dx: 0, dy: 0 } },
    ],
  },
}

const path = ref<BezierPath>($BezierPath.easeInOut())

const applyPreset = (name: keyof typeof presets) => {
  path.value = presets[name]
}

// Animated preview
const animationProgress = ref(0)
let animationFrame: number | null = null
const isAnimating = ref(false)

const animatedY = computed(() => $BezierPath.evaluate(path.value, animationProgress.value))

const startAnimation = () => {
  if (isAnimating.value) return
  isAnimating.value = true
  animationProgress.value = 0

  const duration = 2000 // ms
  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const t = Math.min(elapsed / duration, 1)
    animationProgress.value = t

    if (t < 1) {
      animationFrame = requestAnimationFrame(animate)
    } else {
      isAnimating.value = false
    }
  }

  animationFrame = requestAnimationFrame(animate)
}

const stopAnimation = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  isAnimating.value = false
  animationProgress.value = 0
}

// LUT preview
const lutPreview = computed(() => {
  const lut = $BezierPath.toLut(path.value)
  return Array.from(lut).map((v, i) => ({
    x: i,
    y: v * 100, // Scale for display
  }))
})

// Path validation
const isValid = computed(() => $BezierPath.isValid(path.value))

// Anchor info
const anchorInfo = computed(() =>
  path.value.anchors.map((a, i) => ({
    index: i,
    x: a.x.toFixed(3),
    y: a.y.toFixed(3),
    mode: a.handleMode,
  }))
)
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Bezier Path Editor</h1>

      <!-- Presets -->
      <div class="mb-6 flex gap-2">
        <span class="text-gray-400 mr-2">Presets:</span>
        <button
          v-for="(_, name) in presets"
          :key="name"
          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          @click="applyPreset(name as keyof typeof presets)"
        >
          {{ name }}
        </button>
      </div>

      <div class="flex gap-8 flex-wrap">
        <!-- Editor -->
        <div class="flex flex-col gap-4">
          <div class="text-sm text-gray-400">
            Click curve to add point | Drag to move | Delete to remove | Double-click to cycle mode
          </div>
          <BezierPathEditor v-model:path="path" :width="400" :height="300" :padding="30" />

          <div class="text-sm">
            <span :class="isValid ? 'text-green-400' : 'text-red-400'">
              {{ isValid ? 'Valid path' : 'Invalid path (X not monotonic)' }}
            </span>
          </div>
        </div>

        <!-- Animation Preview -->
        <div class="flex flex-col gap-4">
          <div class="text-sm text-gray-400">Animation Preview</div>

          <div class="relative w-32 h-64 bg-gray-800 rounded border border-gray-600">
            <!-- Track -->
            <div class="absolute left-1/2 top-4 bottom-4 w-1 bg-gray-700 -translate-x-1/2" />

            <!-- Ball -->
            <div
              class="absolute left-1/2 w-8 h-8 bg-green-400 rounded-full -translate-x-1/2 -translate-y-1/2 transition-none"
              :style="{
                top: `${(1 - animatedY) * 100 * 0.875 + 6.25}%`,
              }"
            />

            <!-- Progress indicator -->
            <div class="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-500">
              t={{ animationProgress.toFixed(2) }} y={{ animatedY.toFixed(2) }}
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50"
              :disabled="isAnimating"
              @click="startAnimation"
            >
              Play
            </button>
            <button
              class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              @click="stopAnimation"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Anchor Info -->
        <div class="flex flex-col gap-2">
          <div class="text-sm text-gray-400">Anchors ({{ path.anchors.length }})</div>
          <div class="bg-gray-800 rounded p-3 text-xs font-mono">
            <div v-for="anchor in anchorInfo" :key="anchor.index" class="flex gap-4">
              <span class="text-gray-500">[{{ anchor.index }}]</span>
              <span>x={{ anchor.x }}</span>
              <span>y={{ anchor.y }}</span>
              <span class="text-gray-500">{{ anchor.mode }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- LUT Preview -->
      <div class="mt-8">
        <div class="text-sm text-gray-400 mb-2">LUT Preview (256 samples)</div>
        <div class="bg-gray-800 rounded p-4">
          <svg class="w-full h-32" viewBox="0 0 256 100" preserveAspectRatio="none">
            <!-- Reference line -->
            <line x1="0" y1="100" x2="256" y2="0" stroke="#444" stroke-width="0.5" />

            <!-- LUT curve -->
            <polyline
              :points="lutPreview.map(p => `${p.x},${100 - p.y}`).join(' ')"
              fill="none"
              stroke="#4ade80"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>

      <!-- Raw Path JSON -->
      <div class="mt-8">
        <div class="text-sm text-gray-400 mb-2">Path Data (JSON)</div>
        <pre class="bg-gray-800 rounded p-4 text-xs overflow-auto max-h-48">{{ JSON.stringify(path, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
