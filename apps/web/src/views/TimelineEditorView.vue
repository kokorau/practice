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
  <div class="timeline-editor">
    <!-- Top: Preview Area -->
    <section
      class="preview-area"
      :style="{ minHeight: `${100 - timelineHeightPercent}%` }"
    >
      <RouterLink to="/" class="back-link">
        Back to Home
      </RouterLink>

      <!-- 16:9 Preview Box -->
      <div class="preview-container">
        <div class="preview-box">
          <span class="preview-label">16:9 Preview</span>
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
      class="timeline-area"
      :style="{ height: `${timelineHeightPercent}%` }"
    >
      <!-- Timeline Controls -->
      <div class="timeline-controls">
        <button class="control-button">Play</button>
        <button class="control-button">Pause</button>
        <button class="control-button">Stop</button>
        <div class="timecode">00:00:00.000</div>
      </div>

      <!-- Timeline Tracks -->
      <div class="timeline-tracks">
        <div class="timeline-placeholder">Timeline (Keyframes & Cuts)</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.timeline-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: oklch(0.94 0.01 260);
  position: relative;
}

.back-link {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 0.75rem;
  color: oklch(0.45 0.15 180);
  text-decoration: none;
  transition: color 0.15s;
}

.back-link:hover {
  color: oklch(0.35 0.15 180);
  text-decoration: underline;
}

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
  background: white;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview-label {
  font-size: 0.875rem;
  color: oklch(0.55 0.02 260);
}

.resize-handle {
  height: 4px;
  background: oklch(0.85 0.01 260);
  cursor: ns-resize;
  transition: background 0.15s;
}

.resize-handle:hover,
.resize-handle--active {
  background: oklch(0.50 0.20 250);
}

.timeline-area {
  display: flex;
  flex-direction: column;
  background: oklch(0.97 0.005 260);
  border-top: 1px solid oklch(0.88 0.01 260);
}

.timeline-controls {
  height: 2.5rem;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 0.5rem;
  background: oklch(0.94 0.01 260);
  border-bottom: 1px solid oklch(0.88 0.01 260);
  flex-shrink: 0;
}

.control-button {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: oklch(0.90 0.01 260);
  color: oklch(0.45 0.02 260);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.control-button:hover {
  background: oklch(0.85 0.01 260);
  color: oklch(0.35 0.02 260);
}

.timecode {
  margin-left: auto;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.55 0.02 260);
}

.timeline-tracks {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.timeline-placeholder {
  font-size: 0.875rem;
  color: oklch(0.55 0.02 260);
}
</style>
