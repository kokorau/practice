<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { Timeline, Track, TrackId, RenderContext, Ms, PhaseLayout, Phase, Binding, FrameState } from '@practice/timeline'
import { createCanvasTrackRenderer } from '@practice/timeline'
import { useTimelinePlayer } from '../../modules/Timeline/Application/useTimelinePlayer'

// ============================================================
// Props & Emits
// ============================================================
const props = withDefaults(defineProps<{
  timeline: Timeline
  bindings?: Binding[]
  visibleDuration?: Ms
}>(), {
  bindings: () => [],
  visibleDuration: 30000 as Ms,
})

const emit = defineEmits<{
  'update:frameState': [frameState: FrameState]
  'update:playhead': [playhead: Ms]
}>()

// ============================================================
// Timeline Player (via composable)
// ============================================================
const {
  playhead,
  isPlaying,
  frameState,
  phaseLayouts,
  toggle,
  stop,
  seek,
  getPhaseLayout,
} = useTimelinePlayer({
  timeline: props.timeline,
  bindings: props.bindings,
  visibleDuration: props.visibleDuration,
})

// Emit frameState changes
watch(frameState, (newState) => {
  emit('update:frameState', newState)
}, { immediate: true })

// Emit playhead changes
watch(playhead, (newPlayhead) => {
  emit('update:playhead', newPlayhead)
})

// ============================================================
// Phase positions with percentage for UI rendering
// ============================================================
const phasePositions = computed(() => {
  return phaseLayouts.value.map((layout: PhaseLayout) => {
    const phase = props.timeline.phases.find((p: Phase) => p.id === layout.phaseId)!
    return {
      phase,
      startMs: layout.startMs,
      endMs: layout.endMs,
      startPercent: (layout.startMs / props.visibleDuration) * 100,
      widthPercent: (layout.duration / props.visibleDuration) * 100,
    }
  })
})

// Get phase position for a track
function getPhasePositionForTrack(track: Track) {
  const layout = getPhaseLayout(track.phaseId)
  if (!layout) return undefined
  return {
    startPercent: (layout.startMs / props.visibleDuration) * 100,
    widthPercent: (layout.duration / props.visibleDuration) * 100,
  }
}

// Playhead position as percentage
const playheadPercent = computed(() =>
  (playhead.value / props.visibleDuration) * 100
)

// Format time as MM:SS.mmm
function formatTime(ms: number): string {
  const msInt = Math.round(ms)
  const totalSec = Math.floor(msInt / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const millis = msInt % 1000
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

// Generate ruler ticks
const rulerTicks = computed(() => {
  const ticks: { ms: number; percent: number; label: string; major: boolean }[] = []
  const interval = 1000 // 1 second intervals
  for (let ms = 0; ms <= props.visibleDuration; ms += interval) {
    ticks.push({
      ms,
      percent: (ms / props.visibleDuration) * 100,
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
  const newPlayhead = Math.round(percent * props.visibleDuration) as Ms
  seek(newPlayhead)
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
  for (const track of props.timeline.tracks) {
    const canvas = canvasRefs.value.get(track.id)
    if (!canvas) continue

    const renderContext = setupRenderContext(canvas)
    if (!renderContext) continue

    // Use calculated phase duration (handles infinite loops)
    const layout = getPhaseLayout(track.phaseId)
    const duration = layout?.duration ?? props.visibleDuration

    if (track.mode === 'Envelope') {
      trackRenderer.renderEnvelope(renderContext, track.envelope, duration)
    } else {
      trackRenderer.renderGenerator(renderContext, track.generator, duration)
    }
  }
}

// Watch for changes and redraw
watch(phaseLayouts, () => {
  nextTick(() => redrawAllCanvases())
}, { deep: true })

onMounted(() => {
  nextTick(() => redrawAllCanvases())
})

// Expose methods for parent component
defineExpose({
  play: () => { if (!isPlaying.value) toggle() },
  pause: () => { if (isPlaying.value) toggle() },
  stop,
  seek,
  toggle,
})
</script>

<template>
  <div class="timeline-panel">
    <!-- Timeline Controls -->
    <div class="timeline-controls">
      <button class="control-button" :class="{ active: isPlaying }" @click="toggle">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button class="control-button" @click="stop">Stop</button>
      <div class="timecode">{{ formatTime(playhead) }} / {{ formatTime(visibleDuration) }}</div>
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
  </div>
</template>

<style scoped>
.timeline-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
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
