<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Timeline, Phase, PhaseId, TrackId, Binding, FrameState, Track, EnvelopeTrack, GeneratorTrack } from '@practice/timeline'
import { createTimelinePlayer, evaluateEnvelope, evaluateGenerator } from '@practice/timeline'

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
      envelope: {
        points: [
          { time: 0, value: 0 },
          { time: 2000, value: 1 },
          { time: 6000, value: 1 },
          { time: 8000, value: 0 },
        ],
        interpolation: 'Linear',
      },
    },
    {
      id: 'track-2' as TrackId,
      name: 'Scale',
      clock: 'Global',
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0.5 },
          { time: 4000, value: 1 },
          { time: 8000, value: 0.5 },
        ],
        interpolation: 'Bezier',
      },
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

const mockBindings: Binding[] = [
  {
    targetParam: 'opacity',
    sourceTrack: 'track-1' as TrackId,
    map: { min: 0, max: 1 },
  },
  {
    targetParam: 'scale',
    sourceTrack: 'track-2' as TrackId,
    map: { min: 0.5, max: 1.5 },
  },
  {
    targetParam: 'rotation',
    sourceTrack: 'track-3' as TrackId,
    map: { min: -15, max: 15 },
  },
]

// ============================================================
// Timeline State
// ============================================================
const timeline = ref<Timeline>(mockTimeline)
const playhead = ref(0) // ms
const isPlaying = ref(false)
const frameState = ref<FrameState>({ time: 0, params: {} })

// Total duration in ms
const totalDuration = computed(() =>
  timeline.value.phases.reduce((sum, p) => sum + p.duration, 0)
)

// ============================================================
// Timeline Player
// ============================================================
const player = createTimelinePlayer({
  timeline: mockTimeline,
  bindings: mockBindings,
})

let animationFrameId: number | null = null
let startTime: number | null = null

function startPlayback() {
  isPlaying.value = true
  player.seek(playhead.value)
  player.play()
  startTime = performance.now() - playhead.value
  tick()
}

function stopPlayback() {
  isPlaying.value = false
  player.pause()
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function resetPlayback() {
  stopPlayback()
  playhead.value = 0
  player.seek(0)
  frameState.value = player.update(0)
}

function tick() {
  if (!isPlaying.value) return

  const now = performance.now()
  const engineTime = startTime !== null ? now - startTime : 0

  frameState.value = player.update(engineTime)
  playhead.value = frameState.value.time

  animationFrameId = requestAnimationFrame(tick)
}

function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

// Sync playhead when seeking via UI
watch(playhead, (newVal) => {
  if (!isPlaying.value) {
    player.seek(newVal)
    frameState.value = player.update(0)
  }
})

onMounted(() => {
  // Initialize frame state
  frameState.value = player.update(0)
})

onUnmounted(() => {
  stopPlayback()
})

// ============================================================
// Preview Values
// ============================================================
const previewOpacity = computed(() => frameState.value.params.opacity ?? 1)
const previewScale = computed(() => frameState.value.params.scale ?? 1)
const previewRotation = computed(() => frameState.value.params.rotation ?? 0)

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
  const newPlayhead = Math.round(percent * totalDuration.value)

  if (isPlaying.value) {
    // Update start time to maintain continuity
    startTime = performance.now() - newPlayhead
  }
  playhead.value = newPlayhead
  player.seek(newPlayhead)
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

// ============================================================
// Envelope Graph Helpers
// ============================================================

function isEnvelopeTrack(track: Track): track is EnvelopeTrack {
  return track.mode === 'Envelope'
}

interface EnvelopeGraphData {
  pathD: string
  points: { x: number; y: number; time: number; value: number }[]
}

function computeEnvelopeGraph(track: EnvelopeTrack, duration: number): EnvelopeGraphData {
  const { envelope } = track
  const points = envelope.points
    .map(p => ({
      x: (p.time / duration) * 100,
      y: (1 - p.value) * 100, // Invert Y for SVG coordinates
      time: p.time,
      value: p.value,
    }))
    .sort((a, b) => a.x - b.x)

  if (points.length === 0) {
    return { pathD: '', points: [] }
  }

  // Generate path based on interpolation type
  if (envelope.interpolation === 'Linear') {
    // Linear: straight lines between points
    const pathParts = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    return { pathD: pathParts.join(' '), points }
  }

  // Bezier: smooth curves using cubic bezier
  if (points.length === 1) {
    return { pathD: `M ${points[0]!.x} ${points[0]!.y}`, points }
  }

  // Sample the envelope at many points for smooth curve
  const sampleCount = 100
  const sampledPoints: { x: number; y: number }[] = []

  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * duration
    const value = evaluateEnvelope(envelope, t)
    sampledPoints.push({
      x: (t / duration) * 100,
      y: (1 - value) * 100,
    })
  }

  const pathParts = sampledPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
  return { pathD: pathParts.join(' '), points }
}

// Computed envelope data for each track
const envelopeGraphs = computed(() => {
  const graphs = new Map<TrackId, EnvelopeGraphData>()
  for (const track of timeline.value.tracks) {
    if (isEnvelopeTrack(track)) {
      graphs.set(track.id, computeEnvelopeGraph(track, totalDuration.value))
    }
  }
  return graphs
})

function getEnvelopeGraph(trackId: TrackId): EnvelopeGraphData | undefined {
  return envelopeGraphs.value.get(trackId)
}

// ============================================================
// Generator Waveform Helpers
// ============================================================

function isGeneratorTrack(track: Track): track is GeneratorTrack {
  return track.mode === 'Generator'
}

interface GeneratorWaveformData {
  pathD: string
}

function computeGeneratorWaveform(track: GeneratorTrack, duration: number): GeneratorWaveformData {
  const { generator } = track
  const sampleCount = 200

  const points: { x: number; y: number }[] = []

  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * duration
    const value = evaluateGenerator(generator, t)
    points.push({
      x: (t / duration) * 100,
      y: (1 - value) * 100, // Invert Y for SVG coordinates
    })
  }

  const pathParts = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
  return { pathD: pathParts.join(' ') }
}

// Computed generator waveform data for each track
const generatorWaveforms = computed(() => {
  const waveforms = new Map<TrackId, GeneratorWaveformData>()
  for (const track of timeline.value.tracks) {
    if (isGeneratorTrack(track)) {
      waveforms.set(track.id, computeGeneratorWaveform(track, totalDuration.value))
    }
  }
  return waveforms
})

function getGeneratorWaveform(trackId: TrackId): GeneratorWaveformData | undefined {
  return generatorWaveforms.value.get(trackId)
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
      <!-- Timeline Controls -->
      <div class="timeline-controls">
        <button class="control-button" :class="{ active: isPlaying }" @click="togglePlayback">
          {{ isPlaying ? 'Pause' : 'Play' }}
        </button>
        <button class="control-button" @click="resetPlayback">Stop</button>
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
              <!-- Envelope Track Content -->
              <div v-if="track.mode === 'Envelope'" class="track-content track-content--envelope">
                <svg
                  class="envelope-graph"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <!-- Envelope curve -->
                  <path
                    v-if="getEnvelopeGraph(track.id)?.pathD"
                    :d="getEnvelopeGraph(track.id)?.pathD"
                    class="envelope-path"
                  />
                  <!-- Control points -->
                  <circle
                    v-for="(point, idx) in getEnvelopeGraph(track.id)?.points ?? []"
                    :key="idx"
                    :cx="point.x"
                    :cy="point.y"
                    r="2"
                    class="envelope-point"
                  />
                </svg>
              </div>
              <!-- Generator Track Content -->
              <div v-else class="track-content track-content--generator">
                <svg
                  class="generator-graph"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    v-if="getGeneratorWaveform(track.id)?.pathD"
                    :d="getGeneratorWaveform(track.id)?.pathD"
                    class="generator-path"
                  />
                </svg>
                <span class="generator-type-label">{{ track.generator.type }}</span>
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
  inset: 0;
  background: linear-gradient(135deg, oklch(0.55 0.20 250), oklch(0.45 0.25 280));
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
  min-height: 2.5rem;
  max-height: 2.5rem;
  position: relative;
  border-bottom: 1px solid oklch(0.92 0.01 260);
  overflow: hidden;
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
  overflow: hidden;
}

.track-content--envelope {
  padding: 0;
}

.track-content--generator {
  background: oklch(0.94 0.02 150);
  position: relative;
  padding: 0;
  /* Force height to match track-lane minus margins (2.5rem - 0.5rem) */
  height: 2rem;
}

.track-content-label {
  font-size: 0.625rem;
  color: oklch(0.65 0.02 260);
}

/* Envelope Graph */
.envelope-graph {
  width: 100%;
  height: 100%;
  shape-rendering: geometricPrecision;
}

.envelope-path {
  fill: none;
  stroke: oklch(0.50 0.20 250);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.envelope-point {
  fill: oklch(0.98 0 0);
  stroke: oklch(0.45 0.22 250);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

/* Generator Graph */
.generator-graph {
  width: 100%;
  height: 100%;
  shape-rendering: geometricPrecision;
}

.generator-path {
  fill: none;
  stroke: oklch(0.50 0.20 150);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.generator-type-label {
  position: absolute;
  top: 0.25rem;
  right: 0.375rem;
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  color: oklch(0.45 0.15 150);
  background: oklch(0.96 0.02 150 / 0.8);
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
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
