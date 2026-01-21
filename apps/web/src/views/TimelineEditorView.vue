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
// Parameter Groups for Display
// ============================================================
const openingParams = computed(() => ({
  opacity: frameState.value.params.opacity ?? 0,
  scale: frameState.value.params.scale ?? 0.5,
}))

const simpleWaves = computed(() => ({
  osc: frameState.value.params.wave_osc ?? 0,
  saw: frameState.value.params.wave_saw ?? 0,
  tri: frameState.value.params.wave_tri ?? 0,
  pulse: frameState.value.params.wave_pulse ?? 0,
  step: frameState.value.params.wave_step ?? 0,
  noise: frameState.value.params.wave_noise ?? 0,
}))

const compositeParams = computed(() => ({
  rotation: frameState.value.params.rotation ?? 0,
  layered: frameState.value.params.layered ?? 0,
  noise_mod: frameState.value.params.noise_mod ?? 0,
  bounce: frameState.value.params.bounce ?? 0,
  elastic: frameState.value.params.elastic ?? 0,
  heartbeat: frameState.value.params.heartbeat ?? 0,
  wobble: frameState.value.params.wobble ?? 0,
  breathing: frameState.value.params.breathing ?? 0,
  clamped: frameState.value.params.clamped ?? 0,
  quantized: frameState.value.params.quantized ?? 0,
}))

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

// ============================================================
// Helper for bar visualization
// ============================================================
function barStyle(value: number, min = 0, max = 1) {
  const normalized = (value - min) / (max - min)
  const percent = Math.max(0, Math.min(100, normalized * 100))
  return { width: `${percent}%` }
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

      <div class="preview-container">
        <!-- Animated Preview Box -->
        <div class="preview-box">
          <div
            class="preview-inner"
            :style="{
              opacity: openingParams.opacity,
              transform: `scale(${openingParams.scale}) rotate(${compositeParams.rotation}deg)`,
            }"
          />
        </div>

        <!-- Parameter Display Grid -->
        <div class="params-grid">
          <!-- Opening Parameters -->
          <div class="param-group">
            <h3 class="group-title">Opening (smoothstep)</h3>
            <div class="param-row">
              <span class="param-name">opacity</span>
              <div class="param-bar">
                <div class="param-bar-fill" :style="barStyle(openingParams.opacity)" />
              </div>
              <span class="param-value">{{ openingParams.opacity.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">scale</span>
              <div class="param-bar">
                <div class="param-bar-fill" :style="barStyle(openingParams.scale, 0.5, 1)" />
              </div>
              <span class="param-value">{{ openingParams.scale.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Simple Waves -->
          <div class="param-group">
            <h3 class="group-title">Simple Waves</h3>
            <div class="param-row">
              <span class="param-name">osc</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-sine" :style="barStyle(simpleWaves.osc)" />
              </div>
              <span class="param-value">{{ simpleWaves.osc.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">saw</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-saw" :style="barStyle(simpleWaves.saw)" />
              </div>
              <span class="param-value">{{ simpleWaves.saw.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">tri</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-tri" :style="barStyle(simpleWaves.tri)" />
              </div>
              <span class="param-value">{{ simpleWaves.tri.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">pulse</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-pulse" :style="barStyle(simpleWaves.pulse)" />
              </div>
              <span class="param-value">{{ simpleWaves.pulse.toFixed(0) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">step</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-step" :style="barStyle(simpleWaves.step)" />
              </div>
              <span class="param-value">{{ simpleWaves.step.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">noise</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-noise" :style="barStyle(simpleWaves.noise)" />
              </div>
              <span class="param-value">{{ simpleWaves.noise.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Composite Examples -->
          <div class="param-group">
            <h3 class="group-title">Composite</h3>
            <div class="param-row">
              <span class="param-name">rotation</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.rotation, -30, 30)" />
              </div>
              <span class="param-value">{{ compositeParams.rotation.toFixed(1) }}°</span>
            </div>
            <div class="param-row">
              <span class="param-name">layered</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.layered)" />
              </div>
              <span class="param-value">{{ compositeParams.layered.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">noise_mod</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.noise_mod)" />
              </div>
              <span class="param-value">{{ compositeParams.noise_mod.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">bounce</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.bounce, 0.3, 1)" />
              </div>
              <span class="param-value">{{ compositeParams.bounce.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">elastic</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.elastic)" />
              </div>
              <span class="param-value">{{ compositeParams.elastic.toFixed(2) }}</span>
            </div>
          </div>

          <!-- More Composite -->
          <div class="param-group">
            <h3 class="group-title">More Composite</h3>
            <div class="param-row">
              <span class="param-name">heartbeat</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-heartbeat" :style="barStyle(compositeParams.heartbeat)" />
              </div>
              <span class="param-value">{{ compositeParams.heartbeat.toFixed(0) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">wobble</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.wobble)" />
              </div>
              <span class="param-value">{{ compositeParams.wobble.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">breathing</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-breathing" :style="barStyle(compositeParams.breathing)" />
              </div>
              <span class="param-value">{{ compositeParams.breathing.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">clamped</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-composite" :style="barStyle(compositeParams.clamped, 0.2, 0.8)" />
              </div>
              <span class="param-value">{{ compositeParams.clamped.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">quantized</span>
              <div class="param-bar">
                <div class="param-bar-fill bar-step" :style="barStyle(compositeParams.quantized)" />
              </div>
              <span class="param-value">{{ compositeParams.quantized.toFixed(2) }}</span>
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
  background: oklch(0.15 0.02 260);
  color: oklch(0.90 0.01 260);
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: oklch(0.12 0.02 260);
  position: relative;
}

.back-link {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 0.75rem;
  color: oklch(0.60 0.15 180);
  text-decoration: none;
  transition: color 0.15s;
  z-index: 10;
}

.back-link:hover {
  color: oklch(0.70 0.15 180);
  text-decoration: underline;
}

.preview-container {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  overflow: hidden;
}

/* Animated Preview Box */
.preview-box {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
  background: oklch(0.08 0.02 260);
  border: 1px solid oklch(0.25 0.02 260);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  align-self: center;
}

.preview-inner {
  width: 60px;
  height: 60px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, oklch(0.65 0.25 250), oklch(0.55 0.30 280));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  transition: transform 0.03s ease-out, opacity 0.03s ease-out;
}

/* Parameter Display Grid */
.params-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  overflow-y: auto;
  align-content: start;
}

.param-group {
  background: oklch(0.18 0.015 260);
  border: 1px solid oklch(0.25 0.02 260);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.group-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.65 0.02 260);
  margin: 0 0 0.5rem 0;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-name {
  font-size: 0.65rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.70 0.02 260);
  width: 70px;
  flex-shrink: 0;
}

.param-bar {
  flex: 1;
  height: 12px;
  background: oklch(0.10 0.02 260);
  border-radius: 2px;
  overflow: hidden;
}

.param-bar-fill {
  height: 100%;
  background: oklch(0.55 0.20 250);
  border-radius: 2px;
  transition: width 0.03s ease-out;
}

/* Wave type colors */
.bar-sine { background: oklch(0.60 0.25 250); }
.bar-saw { background: oklch(0.60 0.25 30); }
.bar-tri { background: oklch(0.60 0.25 150); }
.bar-pulse { background: oklch(0.70 0.30 60); }
.bar-step { background: oklch(0.55 0.20 200); }
.bar-noise { background: oklch(0.50 0.15 300); }
.bar-composite { background: oklch(0.55 0.22 280); }
.bar-heartbeat { background: oklch(0.60 0.30 0); }
.bar-breathing { background: oklch(0.55 0.20 180); }

.param-value {
  font-size: 0.65rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.85 0.02 260);
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.resize-handle {
  height: 4px;
  background: oklch(0.25 0.02 260);
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
  background: oklch(0.15 0.02 260);
  border-top: 1px solid oklch(0.25 0.02 260);
}
</style>
