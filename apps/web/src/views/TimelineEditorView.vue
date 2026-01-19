<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { Timeline, Phase, PhaseId, TrackId, Binding, FrameState, Track, RenderContext } from '@practice/timeline'
import { createTimelinePlayer, createCanvasTrackRenderer } from '@practice/timeline'

// ============================================================
// Editor Config
// ============================================================
const editorConfig = {
  /** Total visible duration in the editor (for infinite loops) */
  visibleDuration: 30000,  // 30 seconds
}

// ============================================================
// Mock Data
// ============================================================
const mockTimeline: Timeline = {
  loopType: 'forward',
  phases: [
    { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 5000 },
    { id: 'phase-loop' as PhaseId, type: 'Loop' },  // No duration = infinite
    // { id: 'phase-ending' as PhaseId, type: 'Ending', duration: 2000 },  // Commented out for PoC
  ],
  tracks: [
    // Opening phase tracks - fade in effects
    {
      id: 'track-opacity-opening' as TrackId,
      name: 'Opacity',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0 },
          { time: 5000, value: 1 },
        ],
        interpolation: 'Linear',
      },
    },
    {
      id: 'track-scale-opening' as TrackId,
      name: 'Scale',
      clock: 'Phase',
      phaseId: 'phase-opening' as PhaseId,
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0.5 },
          { time: 5000, value: 1 },
        ],
        interpolation: 'Bezier',
      },
    },
    // Loop phase tracks - continuous animation
    {
      id: 'track-rotation-loop' as TrackId,
      name: 'Rotation',
      clock: 'Loop',
      phaseId: 'phase-loop' as PhaseId,
      mode: 'Generator',
      generator: { type: 'Sin', period: 1000, offset: 0, params: {} },
    },
  ],
}

const mockBindings: Binding[] = [
  {
    targetParam: 'opacity',
    sourceTrack: 'track-opacity-opening' as TrackId,
    map: { min: 0, max: 1 },
  },
  {
    targetParam: 'scale',
    sourceTrack: 'track-scale-opening' as TrackId,
    map: { min: 0.5, max: 1.5 },
  },
  {
    targetParam: 'rotation',
    sourceTrack: 'track-rotation-loop' as TrackId,
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

// Total visible duration in ms (uses editor config for infinite loops)
const totalDuration = computed(() => editorConfig.visibleDuration)

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

// Phase positions for rendering (handles infinite loops)
const phasePositions = computed(() => {
  const positions: { phase: Phase; startMs: number; endMs: number; startPercent: number; widthPercent: number }[] = []
  let currentMs = 0
  for (const phase of timeline.value.phases) {
    // For infinite phases (no duration), fill remaining visible duration
    const phaseDuration = phase.duration ?? (totalDuration.value - currentMs)
    const startPercent = (currentMs / totalDuration.value) * 100
    const widthPercent = (phaseDuration / totalDuration.value) * 100
    positions.push({
      phase,
      startMs: currentMs,
      endMs: currentMs + phaseDuration,
      startPercent,
      widthPercent,
    })
    currentMs += phaseDuration
  }
  return positions
})

// Get phase position for a track
function getPhasePositionForTrack(track: Track) {
  return phasePositions.value.find(p => p.phase.id === track.phaseId)
}

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
// Canvas Drawing (using TrackRenderer from @practice/timeline)
// ============================================================

const trackRenderer = createCanvasTrackRenderer()

// Canvas refs for each track
const canvasRefs = ref<Map<TrackId, HTMLCanvasElement>>(new Map())

function setCanvasRef(trackId: TrackId, el: HTMLCanvasElement | null) {
  if (el) {
    canvasRefs.value.set(trackId, el)
  } else {
    canvasRefs.value.delete(trackId)
  }
}

function setupRenderContext(canvas: HTMLCanvasElement): RenderContext | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  return { ctx, width: rect.width, height: rect.height, dpr }
}

// Redraw all canvases
function redrawAllCanvases() {
  for (const track of timeline.value.tracks) {
    const canvas = canvasRefs.value.get(track.id)
    if (!canvas) continue

    const renderContext = setupRenderContext(canvas)
    if (!renderContext) continue

    // Use calculated phase duration (handles infinite loops)
    const phasePos = getPhasePositionForTrack(track)
    const duration = phasePos ? (phasePos.endMs - phasePos.startMs) : totalDuration.value

    if (track.mode === 'Envelope') {
      trackRenderer.renderEnvelope(renderContext, track.envelope, duration)
    } else {
      trackRenderer.renderGenerator(renderContext, track.generator, duration)
    }
  }
}

// Watch for changes and redraw
watch([timeline, totalDuration], () => {
  nextTick(() => redrawAllCanvases())
}, { deep: true })

onMounted(() => {
  nextTick(() => redrawAllCanvases())
})

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
              <!-- Envelope Track Content - positioned within its phase -->
              <div
                v-if="track.mode === 'Envelope'"
                class="track-content track-content--envelope"
                :style="{
                  left: `calc(${getPhasePositionForTrack(track)?.startPercent ?? 0}% + 0.25rem)`,
                  width: `calc(${getPhasePositionForTrack(track)?.widthPercent ?? 100}% - 0.5rem)`,
                }"
              >
                <canvas
                  :ref="(el) => setCanvasRef(track.id, el as HTMLCanvasElement)"
                  class="track-canvas"
                />
              </div>
              <!-- Generator Track Content - positioned within its phase -->
              <div
                v-else
                class="track-content track-content--generator"
                :style="{
                  left: `calc(${getPhasePositionForTrack(track)?.startPercent ?? 0}% + 0.25rem)`,
                  width: `calc(${getPhasePositionForTrack(track)?.widthPercent ?? 100}% - 0.5rem)`,
                }"
              >
                <canvas
                  :ref="(el) => setCanvasRef(track.id, el as HTMLCanvasElement)"
                  class="track-canvas"
                />
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
  top: 0.25rem;
  bottom: 0.25rem;
  /* left and width are set via inline style for phase positioning */
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

/* Track Canvas */
.track-canvas {
  width: 100%;
  height: 100%;
  display: block;
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
