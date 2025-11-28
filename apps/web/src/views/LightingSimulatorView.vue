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
  // Lighting
  currentPreset,
  debugInfo,
  boxShadows,
  applyPreset,
  lightPresets,
  // Filter
  filterEnabled,
  currentFilterPresetId,
  applyFilterPreset,
  resetFilter,
  filterPresets,
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
        <!-- Lighting Presets -->
        <div class="mb-3">
          <div class="font-bold mb-2 text-green-400">Lighting</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in lightPresets"
              :key="preset.name"
              @click="applyPreset(preset)"
              :class="[
                'px-1.5 py-0.5 rounded transition-colors',
                currentPreset === preset.name
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
              style="font-size: 9px;"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- Filter Section -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="flex items-center justify-between mb-2">
            <div class="font-bold text-pink-400">Color Filter</div>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="filterEnabled" class="w-3 h-3" />
              <span class="text-[10px] text-gray-400">Enable</span>
            </label>
          </div>

          <div v-if="filterEnabled" class="flex flex-wrap gap-1">
            <button
              v-for="preset in filterPresets"
              :key="preset.id"
              @click="applyFilterPreset(preset)"
              :class="[
                'px-1.5 py-0.5 rounded transition-colors',
                currentFilterPresetId === preset.id
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
              :title="preset.description"
              style="font-size: 9px;"
            >
              {{ preset.name }}
            </button>
            <button
              @click="resetFilter"
              class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
              style="font-size: 9px;"
            >
              Reset
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
