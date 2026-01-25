<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { FrameState, Ms, TrackId } from '@practice/timeline'
import { prepareTimeline } from '@practice/timeline'
import { extractPeriod } from '@practice/dsl'
import { createTimelineEditor } from '@practice/timeline-editor'
import { mockTimeline } from '../modules/Timeline/Infra/mockData'
import TimelinePanel from '../components/Timeline/TimelinePanel.vue'
import {
  CircleArcIndicator,
  RotateIndicator,
  ScaleIndicator,
  BarIndicator,
  PulseIndicator,
  WaveIndicator,
  NoiseIndicator,
  StepIndicator,
} from '../components/Timeline/indicators'
import { useTimelineDuration } from '../modules/Timeline/Application/useTimelineDuration'

// ============================================================
// Editor Config (via usecase)
// ============================================================
const { visibleDuration, setVisibleDuration } = useTimelineDuration(30000 as Ms)

// ============================================================
// Timeline Editor (selection state)
// ============================================================
const timelineEditor = createTimelineEditor()
const selectedTrackId = ref<TrackId | null>(null)

const unsubscribe = timelineEditor.onSelectionChange((selection) => {
  selectedTrackId.value = selection.type === 'track' ? selection.id as TrackId : null
})

onMounted(() => {
  // Sync tracks on mount to assign keys
  timelineEditor.syncTracks(mockTimeline.tracks.map(t => t.id))
})

onUnmounted(() => {
  unsubscribe()
})

function onSelectTrack(trackId: TrackId) {
  timelineEditor.selectTrack(trackId)
}

// ============================================================
// Prepare timeline (parse AST and cache)
// ============================================================
prepareTimeline(mockTimeline)

// Extract periods from tracks (trackId → period)
const trackPeriods = computed(() => {
  const periods: Record<string, number | undefined> = {}
  for (const track of mockTimeline.tracks) {
    if (track._cachedAst) {
      periods[track.id] = extractPeriod(track._cachedAst)
    }
  }
  return periods
})

// ============================================================
// Timeline State (received from TimelinePanel)
// ============================================================
const frameState = ref<FrameState>({ time: 0, intensities: {} })
const playhead = ref<Ms>(0 as Ms)

function onFrameStateUpdate(state: FrameState) {
  frameState.value = state
}

function onPlayheadUpdate(ms: Ms) {
  playhead.value = ms
}

// ============================================================
// Intensity Getters (0-1 values from tracks)
// ============================================================
const p = (trackId: string, fallback = 0) =>
  (frameState.value.intensities as Record<string, number>)[trackId] ?? fallback

// Progress within period (0-1)
const progress = (name: string) => {
  const period = trackPeriods.value[name]
  if (!period) return 0
  const t = frameState.value.time
  return (t % period) / period
}

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

      <div class="indicators-container">
        <!-- Simple Waves -->
        <div class="indicator-group">
          <h3 class="group-title">Simple Waves</h3>
          <div class="indicator-grid">
            <div class="indicator-item">
              <CircleArcIndicator
                :intensity="p('wave_osc')"
                :progress="progress('wave_osc')"
                :period="trackPeriods.wave_osc"
              />
              <span class="indicator-label">osc</span>
            </div>
            <div class="indicator-item">
              <RotateIndicator
                :intensity="p('wave_saw')"
                :period="trackPeriods.wave_saw"
              />
              <span class="indicator-label">saw</span>
            </div>
            <div class="indicator-item">
              <WaveIndicator
                :intensity="p('wave_tri')"
                :period="trackPeriods.wave_tri"
              />
              <span class="indicator-label">tri</span>
            </div>
            <div class="indicator-item">
              <PulseIndicator
                :intensity="p('wave_pulse')"
                :period="trackPeriods.wave_pulse"
              />
              <span class="indicator-label">pulse</span>
            </div>
            <div class="indicator-item">
              <StepIndicator
                :intensity="p('wave_step')"
                :steps="4"
                :period="trackPeriods.wave_step"
              />
              <span class="indicator-label">step</span>
            </div>
            <div class="indicator-item">
              <NoiseIndicator
                :intensity="p('wave_noise')"
              />
              <span class="indicator-label">noise</span>
            </div>
          </div>
        </div>

        <!-- Opening -->
        <div class="indicator-group">
          <h3 class="group-title">Opening</h3>
          <div class="indicator-grid">
            <div class="indicator-item">
              <ScaleIndicator
                :intensity="p('opacity')"
              />
              <span class="indicator-label">opacity</span>
              <span class="indicator-value">{{ p('opacity').toFixed(2) }}</span>
            </div>
            <div class="indicator-item">
              <BarIndicator
                :intensity="(p('scale', 0.5) - 0.5) * 2"
              />
              <span class="indicator-label">scale</span>
              <span class="indicator-value">{{ p('scale', 0.5).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Composite -->
        <div class="indicator-group">
          <h3 class="group-title">Composite</h3>
          <div class="indicator-grid">
            <div class="indicator-item">
              <RotateIndicator
                :intensity="(p('rotation') + 30) / 60"
                :period="trackPeriods.rotation"
              />
              <span class="indicator-label">rotation</span>
              <span class="indicator-value">{{ p('rotation').toFixed(0) }}°</span>
            </div>
            <div class="indicator-item">
              <CircleArcIndicator
                :intensity="p('layered')"
                :progress="progress('layered')"
                :period="trackPeriods.layered"
              />
              <span class="indicator-label">layered</span>
            </div>
            <div class="indicator-item">
              <WaveIndicator
                :intensity="p('noise_mod')"
                :period="trackPeriods.noise_mod"
              />
              <span class="indicator-label">noise_mod</span>
            </div>
            <div class="indicator-item">
              <ScaleIndicator
                :intensity="p('bounce', 0.3)"
                :period="trackPeriods.bounce"
              />
              <span class="indicator-label">bounce</span>
            </div>
            <div class="indicator-item">
              <WaveIndicator
                :intensity="p('elastic', 0.5)"
                :period="trackPeriods.elastic"
              />
              <span class="indicator-label">elastic</span>
            </div>
          </div>
        </div>

        <!-- More Composite -->
        <div class="indicator-group">
          <h3 class="group-title">More Composite</h3>
          <div class="indicator-grid">
            <div class="indicator-item">
              <PulseIndicator
                :intensity="p('heartbeat')"
                :period="trackPeriods.heartbeat"
              />
              <span class="indicator-label">heartbeat</span>
            </div>
            <div class="indicator-item">
              <NoiseIndicator
                :intensity="p('wobble')"
                :period="trackPeriods.wobble"
              />
              <span class="indicator-label">wobble</span>
            </div>
            <div class="indicator-item">
              <ScaleIndicator
                :intensity="p('breathing')"
                :period="trackPeriods.breathing"
              />
              <span class="indicator-label">breathing</span>
            </div>
            <div class="indicator-item">
              <BarIndicator
                :intensity="(p('clamped', 0.2) - 0.2) / 0.6"
              />
              <span class="indicator-label">clamped</span>
              <span class="indicator-value">{{ p('clamped', 0.2).toFixed(2) }}</span>
            </div>
            <div class="indicator-item">
              <StepIndicator
                :intensity="p('quantized')"
                :steps="8"
                :period="trackPeriods.quantized"
              />
              <span class="indicator-label">quantized</span>
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
        :visible-duration="visibleDuration"
        :selected-track-id="selectedTrackId"
        :get-track-key="timelineEditor.getTrackKey"
        @update:frame-state="onFrameStateUpdate"
        @update:playhead="onPlayheadUpdate"
        @update:visible-duration="setVisibleDuration"
        @select:track="onSelectTrack"
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

/* Indicators Layout */
.indicators-container {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 3rem 1.5rem 1.5rem;
  overflow-y: auto;
  align-content: flex-start;
}

.indicator-group {
  background: oklch(0.18 0.015 260);
  border: 1px solid oklch(0.25 0.02 260);
  border-radius: 0.5rem;
  padding: 1rem;
  min-width: 200px;
}

.group-title {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.55 0.02 260);
  margin: 0 0 1rem 0;
}

.indicator-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.indicator-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 40px;
}

.indicator-label {
  font-size: 0.6rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.55 0.02 260);
  text-align: center;
}

.indicator-value {
  font-size: 0.55rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.70 0.02 260);
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
