<script setup lang="ts">
import { ref } from 'vue'

// Timeline height (percentage of viewport)
const timelineHeightPercent = ref(50)
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  const vh = window.innerHeight
  const fromBottom = vh - e.clientY
  const percent = Math.min(Math.max((fromBottom / vh) * 100, 20), 80)
  timelineHeightPercent.value = percent
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white">
    <!-- Top: Preview Area -->
    <section
      class="flex-1 bg-gray-950 flex flex-col items-center justify-center overflow-hidden"
      :style="{ minHeight: `${100 - timelineHeightPercent}%` }"
    >
      <RouterLink to="/" class="absolute top-4 left-4 text-xs text-teal-400 hover:underline">
        Back to Home
      </RouterLink>

      <!-- 16:9 Preview Box -->
      <div class="preview-container">
        <div class="preview-box">
          <span class="text-gray-500 text-sm">16:9 Preview</span>
        </div>
      </div>
    </section>

    <!-- Resize Handle -->
    <div
      class="resize-handle"
      :class="{ 'resize-handle--active': isResizing }"
      @mousedown="startResize"
    />

    <!-- Bottom: Timeline Area -->
    <section
      class="bg-gray-900 border-t border-gray-700 flex flex-col"
      :style="{ height: `${timelineHeightPercent}%` }"
    >
      <!-- Timeline Controls -->
      <div class="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shrink-0">
        <button class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">Play</button>
        <button class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">Pause</button>
        <button class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">Stop</button>
        <div class="text-xs text-gray-500 ml-auto">00:00:00.000</div>
      </div>

      <!-- Timeline Tracks -->
      <div class="flex-1 overflow-auto p-4">
        <div class="text-gray-500 text-sm">Timeline (Keyframes & Cuts)</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.preview-box {
  aspect-ratio: 16 / 9;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: 80%;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle {
  height: 4px;
  background: #374151;
  cursor: ns-resize;
  transition: background 0.15s;
}

.resize-handle:hover,
.resize-handle--active {
  background: #4ecdc4;
}
</style>
