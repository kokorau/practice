<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Timeline, Phase, PhaseId, TrackId } from '@practice/timeline'

// ============================================================
// Mock Data
// ============================================================
const mockTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-1' as PhaseId, type: 'Opening', duration: 2000 },
    { id: 'phase-2' as PhaseId, type: 'Loop', duration: 4000 },
    { id: 'phase-3' as PhaseId, type: 'Ending', duration: 2000 },
  ],
  tracks: [
    {
      id: 'track-1' as TrackId,
      name: 'Opacity',
      clock: 'Global',
      mode: 'Envelope',
      envelope: { points: [], interpolation: 'Linear' },
    },
    {
      id: 'track-2' as TrackId,
      name: 'Scale',
      clock: 'Global',
      mode: 'Envelope',
      envelope: { points: [], interpolation: 'Bezier' },
    },
    {
      id: 'track-3' as TrackId,
      name: 'Rotation',
      clock: 'Loop',
      mode: 'Generator',
      generator: { type: 'Sin', period: 1000, offset: 0, params: {} },
    },
  ],
}

// ============================================================
// Timeline State
// ============================================================
const timeline = ref<Timeline>(mockTimeline)
const playhead = ref(0) // ms
const isPlaying = ref(false)

// Total duration in ms
const totalDuration = computed(() =>
  timeline.value.phases.reduce((sum, p) => sum + p.duration, 0)
)

// Phase positions for rendering
const phasePositions = computed(() => {
  const positions: { phase: Phase; startMs: number; endMs: number; startPercent: number; widthPercent: number }[] = []
  let currentMs = 0
  for (const phase of timeline.value.phases) {
    const startPercent = (currentMs / totalDuration.value) * 100
    const widthPercent = (phase.duration / totalDuration.value) * 100
    positions.push({
      phase,
      startMs: currentMs,
      endMs: currentMs + phase.duration,
      startPercent,
      widthPercent,
    })
    currentMs += phase.duration
  }
  return positions
})

// Playhead position as percentage
const playheadPercent = computed(() =>
  (playhead.value / totalDuration.value) * 100
)

// Format time as MM:SS.mmm
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const millis = ms % 1000
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

// Generate ruler ticks
const rulerTicks = computed(() => {
  const ticks: { ms: number; percent: number; label: string; major: boolean }[] = []
  const interval = 1000 // 1 second intervals
  for (let ms = 0; ms <= totalDuration.value; ms += interval) {
    ticks.push({
      ms,
      percent: (ms / totalDuration.value) * 100,
      label: `${ms / 1000}s`,
      major: ms % 2000 === 0,
    })
  }
  return ticks
})

// ============================================================
// Playhead Interaction
// ============================================================
const rulerRef = ref<HTMLElement | null>(null)

function onRulerClick(e: MouseEvent) {
  if (!rulerRef.value) return
  const rect = rulerRef.value.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  playhead.value = Math.round(percent * totalDuration.value)
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

// ============================================================
// Track list width
// ============================================================
const trackListWidth = 150
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
        <button class="control-button" :class="{ active: isPlaying }" @click="isPlaying = !isPlaying">
          {{ isPlaying ? 'Pause' : 'Play' }}
        </button>
        <button class="control-button" @click="playhead = 0">Stop</button>
        <div class="timecode">{{ formatTime(playhead) }} / {{ formatTime(totalDuration) }}</div>
      </div>

      <!-- Timeline Content -->
      <div class="timeline-content">
        <!-- Track List (Left) -->
        <div class="track-list" :style="{ width: `${trackListWidth}px` }">
          <div class="track-list-header">Tracks</div>
          <div
            v-for="track in timeline.tracks"
            :key="track.id"
            class="track-list-item"
          >
            <span class="track-name">{{ track.name }}</span>
            <span class="track-mode">{{ track.mode === 'Envelope' ? 'E' : 'G' }}</span>
          </div>
        </div>

        <!-- Timeline Grid (Right) -->
        <div class="timeline-grid">
          <!-- Ruler -->
          <div ref="rulerRef" class="ruler" @click="onRulerClick">
            <!-- Phase backgrounds -->
            <div
              v-for="pos in phasePositions"
              :key="pos.phase.id"
              class="phase-bg"
              :class="`phase-${pos.phase.type.toLowerCase()}`"
              :style="{ left: `${pos.startPercent}%`, width: `${pos.widthPercent}%` }"
            >
              <span class="phase-label">{{ pos.phase.type }}</span>
            </div>
            <!-- Ticks -->
            <div
              v-for="tick in rulerTicks"
              :key="tick.ms"
              class="ruler-tick"
              :class="{ major: tick.major }"
              :style="{ left: `${tick.percent}%` }"
            >
              <span v-if="tick.major" class="tick-label">{{ tick.label }}</span>
            </div>
            <!-- Playhead -->
            <div class="playhead" :style="{ left: `${playheadPercent}%` }" />
          </div>

          <!-- Track Lanes -->
          <div class="track-lanes">
            <div
              v-for="track in timeline.tracks"
              :key="track.id"
              class="track-lane"
            >
              <!-- Phase separators -->
              <div
                v-for="pos in phasePositions"
                :key="pos.phase.id"
                class="phase-separator"
                :style="{ left: `${pos.startPercent + pos.widthPercent}%` }"
              />
              <!-- Track content placeholder -->
              <div class="track-content">
                <span class="track-content-label">{{ track.mode }}</span>
              </div>
            </div>
            <!-- Playhead line -->
            <div class="playhead-line" :style="{ left: `${playheadPercent}%` }" />
          </div>
        </div>
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

.control-button.active {
  background: oklch(0.50 0.20 250);
  color: white;
}

.timecode {
  margin-left: auto;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.55 0.02 260);
}

/* Timeline Content Layout */
.timeline-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Track List (Left Panel) */
.track-list {
  flex-shrink: 0;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
  display: flex;
  flex-direction: column;
}

.track-list-header {
  height: 1.75rem;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: oklch(0.55 0.02 260);
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.track-list-item {
  height: 2.5rem;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid oklch(0.92 0.01 260);
  font-size: 0.75rem;
}

.track-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-mode {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: oklch(0.88 0.01 260);
  color: oklch(0.45 0.02 260);
}

/* Timeline Grid (Right Panel) */
.timeline-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  position: relative;
}

/* Ruler */
.ruler {
  height: 1.75rem;
  position: relative;
  background: oklch(0.92 0.01 260);
  border-bottom: 1px solid oklch(0.88 0.01 260);
  cursor: pointer;
}

.phase-bg {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-opening {
  background: oklch(0.90 0.05 200 / 0.5);
}

.phase-loop {
  background: oklch(0.90 0.05 150 / 0.5);
}

.phase-ending {
  background: oklch(0.90 0.05 30 / 0.5);
}

.phase-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: oklch(0.45 0.02 260);
}

.ruler-tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 30%;
  background: oklch(0.70 0.02 260);
}

.ruler-tick.major {
  height: 50%;
  background: oklch(0.50 0.02 260);
}

.tick-label {
  position: absolute;
  top: 60%;
  left: 0.25rem;
  font-size: 0.5rem;
  color: oklch(0.50 0.02 260);
  white-space: nowrap;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: oklch(0.50 0.25 20);
  transform: translateX(-50%);
  pointer-events: none;
}

/* Track Lanes */
.track-lanes {
  flex: 1;
  position: relative;
}

.track-lane {
  height: 2.5rem;
  position: relative;
  border-bottom: 1px solid oklch(0.92 0.01 260);
}

.phase-separator {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: oklch(0.85 0.01 260);
}

.track-content {
  position: absolute;
  inset: 0.25rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-content-label {
  font-size: 0.625rem;
  color: oklch(0.65 0.02 260);
}

.playhead-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: oklch(0.50 0.25 20);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}
</style>
