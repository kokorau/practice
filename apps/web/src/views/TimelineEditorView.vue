<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FrameState, Ms } from '@practice/timeline'
import { mockTimeline } from '../modules/Timeline/Infra/mockData'
import TimelinePanel from '../components/Timeline/TimelinePanel.vue'

// ============================================================
// Editor Config
// ============================================================
const VISIBLE_DURATION = 30000 as Ms // 30 seconds

// ============================================================
// Timeline State (received from TimelinePanel)
// ============================================================
const frameState = ref<FrameState>({ time: 0, params: {} })
const playhead = ref<Ms>(0 as Ms)

function onFrameStateUpdate(state: FrameState) {
  frameState.value = state
}

function onPlayheadUpdate(ms: Ms) {
  playhead.value = ms
}

// ============================================================
// Preview Values
// ============================================================
const previewOpacity = computed(() => frameState.value.params.opacity ?? 1)
const previewScale = computed(() => frameState.value.params.scale ?? 1)
const previewRotation = computed(() => frameState.value.params.rotation ?? 0)

// ============================================================
// Layout Resize
// ============================================================
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
          <!-- Animated inner element -->
          <div
            class="preview-inner"
            :style="{
              opacity: previewOpacity,
              transform: `scale(${previewScale}) rotate(${previewRotation}deg)`,
            }"
          />
          <!-- Values overlay (not animated) -->
          <div class="preview-content">
            <div class="preview-values">
              <div class="preview-value">
                <span class="value-label">Opacity</span>
                <span class="value-num">{{ previewOpacity.toFixed(2) }}</span>
              </div>
              <div class="preview-value">
                <span class="value-label">Scale</span>
                <span class="value-num">{{ previewScale.toFixed(2) }}</span>
              </div>
              <div class="preview-value">
                <span class="value-label">Rotation</span>
                <span class="value-num">{{ previewRotation.toFixed(1) }}°</span>
              </div>
            </div>
          </div>
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
      <TimelinePanel
        :timeline="mockTimeline"
        :visible-duration="VISIBLE_DURATION"
        @update:frame-state="onFrameStateUpdate"
        @update:playhead="onPlayheadUpdate"
      />
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
  background: oklch(0.20 0.02 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.preview-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  margin: -40px 0 0 -40px;
  border-radius: 1rem;
  background: linear-gradient(135deg, oklch(0.65 0.25 250), oklch(0.55 0.30 280));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.05s ease-out, opacity 0.05s ease-out;
}

.preview-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.preview-values {
  display: flex;
  gap: 2rem;
}

.preview-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.value-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.value-num {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
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
</style>
