<script setup lang="ts">
import { ref } from 'vue'
import LightingSampleHtml from '../components/LightingSampleHtml.vue'
import { useLightingSimulator } from '../composables/HtmlLighting/useLightingSimulator'

// Template refs
const htmlContainerRef = ref<HTMLElement | null>(null)
const sampleHtmlRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Debug panel state (UI only)
const debugPanelOpen = ref(true)

// Use composable for all lighting logic
const {
  lightSettings,
  currentPreset,
  debugInfo,
  boxShadows,
  applyPreset,
  lightPresets,
} = useLightingSimulator({
  htmlContainerRef,
  sampleHtmlRef,
  canvasRef,
})
</script>

<template>
  <div class="flex h-screen bg-gray-900">
    <!-- Left: HTML Sample -->
    <div ref="htmlContainerRef" class="w-1/2 overflow-auto bg-white">
      <div ref="sampleHtmlRef" class="sample-html">
        <LightingSampleHtml />
      </div>
    </div>

    <!-- Right: Canvas Simulation -->
    <div class="w-1/2 bg-gray-800 flex items-center justify-center">
      <canvas ref="canvasRef" class="max-w-full max-h-full" />
    </div>

    <!-- Debug Panel -->
    <div class="fixed bottom-4 right-4 bg-black/90 text-white text-xs font-mono rounded-lg shadow-xl">
      <!-- Toggle Button -->
      <button
        class="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 rounded-t-lg"
        @click="debugPanelOpen = !debugPanelOpen"
      >
        <span class="font-bold text-green-400">Debug Panel</span>
        <span class="text-gray-400">{{ debugPanelOpen ? '▼' : '▲' }}</span>
      </button>

      <!-- Panel Content -->
      <div v-show="debugPanelOpen" class="p-3 pt-0 w-80 max-h-[32rem] overflow-auto">
        <!-- Presets -->
        <div class="mb-3">
          <div class="font-bold mb-2 text-green-400">Presets</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in lightPresets"
              :key="preset.name"
              @click="applyPreset(preset)"
              :class="[
                'px-2 py-1 rounded text-[10px] transition-colors',
                currentPreset === preset.name
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- Scene Info -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-1 text-blue-400">Scene Info</div>
          <div class="space-y-0.5 text-[11px]">
            <div>Viewport: {{ debugInfo.viewport.width.toFixed(0) }} x {{ debugInfo.viewport.height.toFixed(0) }}</div>
            <div>Scroll: ({{ debugInfo.viewport.scrollX.toFixed(0) }}, {{ debugInfo.viewport.scrollY.toFixed(0) }})</div>
            <div>Elements: {{ debugInfo.elementsCount }} | Objects: {{ debugInfo.objectsCount }}</div>
          </div>
        </div>

        <!-- Primary Light Controls -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-yellow-400">Primary Light</div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Direction</label>
              <input type="number" v-model.number="lightSettings.primary.x" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.primary.y" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.primary.z" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Intensity</label>
              <input type="range" v-model.number="lightSettings.primary.intensity" min="0" max="1" step="0.05" class="flex-1" />
              <span class="w-10 text-right">{{ lightSettings.primary.intensity.toFixed(2) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Color</label>
              <input type="color" v-model="lightSettings.primary.colorHex" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-gray-500">{{ lightSettings.primary.colorHex }}</span>
            </div>
          </div>
        </div>

        <!-- Secondary Light Controls -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-yellow-400">Secondary Light</div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Direction</label>
              <input type="number" v-model.number="lightSettings.secondary.x" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.secondary.y" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.secondary.z" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Intensity</label>
              <input type="range" v-model.number="lightSettings.secondary.intensity" min="0" max="1" step="0.05" class="flex-1" />
              <span class="w-10 text-right">{{ lightSettings.secondary.intensity.toFixed(2) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Color</label>
              <input type="color" v-model="lightSettings.secondary.colorHex" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-gray-500">{{ lightSettings.secondary.colorHex }}</span>
            </div>
          </div>
        </div>

        <!-- Shadow Settings -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-purple-400">Shadow</div>
          <div class="flex items-center gap-2">
            <label class="w-16 text-gray-400">Blur</label>
            <input type="range" v-model.number="lightSettings.shadowBlur" min="0" max="5" step="0.1" class="flex-1" />
            <span class="w-10 text-right">{{ lightSettings.shadowBlur.toFixed(1) }}</span>
          </div>
        </div>

        <!-- Box Shadow Output -->
        <div class="border-t border-gray-700 pt-2">
          <div class="font-bold mb-1 text-cyan-400">CSS Box Shadows ({{ boxShadows.length }})</div>
          <div class="space-y-1 text-[10px] max-h-32 overflow-auto">
            <div v-for="(shadow, i) in boxShadows.slice(0, 10)" :key="i" class="bg-gray-900 p-1 rounded">
              <span class="text-gray-500">[{{ shadow.objectIndex }}]</span> {{ shadow.boxShadow }}
            </div>
            <div v-if="boxShadows.length > 10" class="text-gray-500">... and {{ boxShadows.length - 10 }} more</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
