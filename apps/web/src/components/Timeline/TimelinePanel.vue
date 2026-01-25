<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { Timeline, Track, TrackId, RenderContext, Ms, PhaseLayout, Phase, FrameState } from '@practice/timeline'
import { createCanvasTrackRenderer } from '@practice/timeline'
import { useTimelinePlayer } from '../../modules/Timeline/Application/useTimelinePlayer'
import TrackKeyBadge from './TrackKeyBadge.vue'
import TrackDependencyPopup from './TrackDependencyPopup.vue'
import type { DependencyGraph, DependencySource } from '@practice/section-visual'

// ============================================================
// Props & Emits
// ============================================================
const props = withDefaults(defineProps<{
  timeline: Timeline
  visibleDuration?: Ms
  selectedTrackId?: TrackId | null
  getTrackKey?: (trackId: TrackId) => string | undefined
  dependencyGraph?: DependencyGraph | null
}>(), {
  visibleDuration: 30000 as Ms,
  selectedTrackId: null,
  getTrackKey: undefined,
  dependencyGraph: null,
})

const emit = defineEmits<{
  'update:frameState': [frameState: FrameState]
  'update:playhead': [playhead: Ms]
  'update:visibleDuration': [visibleDuration: Ms]
  'select:track': [trackId: TrackId]
  'contextmenu:track': [trackId: TrackId, event: MouseEvent]
}>()

// ============================================================
// Timeline Player (via composable)
// ============================================================
const {
  playhead,
  isPlaying,
  frameState,
  phaseLayouts,
  intensityProvider,
  toggle,
  stop,
  seek,
  getPhaseLayout,
} = useTimelinePlayer({
  timeline: props.timeline,
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

// ============================================================
// Horizontal Scroll Support
// ============================================================
// Max duration that fits in viewport without scroll (30 seconds)
const MAX_VIEWPORT_DURATION = 30000

// Content width as percentage (100% = 30s, 200% = 60s, etc.)
const contentWidthPercent = computed(() =>
  Math.max(100, (props.visibleDuration / MAX_VIEWPORT_DURATION) * 100)
)

// Playhead position as percentage of content width
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

// Convert index to letter (0 → A, 1 → B, ..., 25 → Z, 26 → AA, ...)
function indexToLetter(index: number): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

// Format seconds as display text (e.g., "30s")
function formatDurationSeconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`
}

// ============================================================
// Duration Editing
// ============================================================
const isEditingDuration = ref(false)
const durationInputRef = ref<HTMLInputElement | null>(null)
const durationInputValue = ref('')

function startEditDuration() {
  isEditingDuration.value = true
  durationInputValue.value = String(Math.round(props.visibleDuration / 1000))
  nextTick(() => {
    durationInputRef.value?.focus()
    durationInputRef.value?.select()
  })
}

function confirmDuration() {
  const seconds = parseInt(durationInputValue.value, 10)
  if (!isNaN(seconds) && seconds >= 1 && seconds <= 600) {
    const newDuration = (seconds * 1000) as Ms
    emit('update:visibleDuration', newDuration)
  }
  isEditingDuration.value = false
}

function cancelEditDuration() {
  isEditingDuration.value = false
}

function onDurationKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmDuration()
  } else if (e.key === 'Escape') {
    cancelEditDuration()
  }
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
// Scroll Synchronization
// ============================================================
const trackListBodyRef = ref<HTMLElement | null>(null)
const trackLanesRef = ref<HTMLElement | null>(null)
const rulerContainerRef = ref<HTMLElement | null>(null)
let isSyncingScroll = false

function onTrackListScroll(e: Event) {
  if (isSyncingScroll) return
  const target = e.target as HTMLElement
  if (trackLanesRef.value) {
    isSyncingScroll = true
    trackLanesRef.value.scrollTop = target.scrollTop
    isSyncingScroll = false
  }
}

// Horizontal scroll sync between ruler and track lanes
function onRulerContainerScroll(e: Event) {
  if (isSyncingScroll) return
  const target = e.target as HTMLElement
  if (trackLanesRef.value) {
    isSyncingScroll = true
    trackLanesRef.value.scrollLeft = target.scrollLeft
    isSyncingScroll = false
  }
}

function onTrackLanesScroll(e: Event) {
  if (isSyncingScroll) return
  const target = e.target as HTMLElement
  isSyncingScroll = true
  // Sync vertical scroll with track list
  if (trackListBodyRef.value) {
    trackListBodyRef.value.scrollTop = target.scrollTop
  }
  // Sync horizontal scroll with ruler
  if (rulerContainerRef.value) {
    rulerContainerRef.value.scrollLeft = target.scrollLeft
  }
  isSyncingScroll = false
}

// ============================================================
// Track list width (resizable)
// ============================================================
const trackListWidth = ref(300)
const isResizingTrackList = ref(false)

function startTrackListResize(e: MouseEvent) {
  isResizingTrackList.value = true
  document.addEventListener('mousemove', onTrackListResize)
  document.addEventListener('mouseup', stopTrackListResize)
  e.preventDefault()
}

function onTrackListResize(e: MouseEvent) {
  if (!isResizingTrackList.value) return
  const newWidth = Math.min(Math.max(e.clientX, 100), 500)
  trackListWidth.value = newWidth
}

function stopTrackListResize() {
  isResizingTrackList.value = false
  document.removeEventListener('mousemove', onTrackListResize)
  document.removeEventListener('mouseup', stopTrackListResize)
}

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

    trackRenderer.renderTrack(renderContext, track, duration)
  }
}

// Watch for changes and redraw
watch(phaseLayouts, () => {
  nextTick(() => redrawAllCanvases())
}, { deep: true })

onMounted(() => {
  nextTick(() => redrawAllCanvases())
})

// ============================================================
// Dependency Popup
// ============================================================
const showDependencyPopup = ref(false)
const dependencyPopupTrackId = ref<string | null>(null)
const dependencyPopupPosition = ref({ x: 0, y: 0 })

const dependencyPopupSources = computed<DependencySource[]>(() => {
  if (!props.dependencyGraph || !dependencyPopupTrackId.value) return []
  const dep = props.dependencyGraph.dependencies.get(dependencyPopupTrackId.value)
  return dep?.sources ?? []
})

function getTrackDependencyCount(trackId: string): number {
  if (!props.dependencyGraph) return 0
  const dep = props.dependencyGraph.dependencies.get(trackId)
  return dep?.sources.length ?? 0
}

function openDependencyPopup(trackId: string, event: MouseEvent) {
  event.stopPropagation()
  dependencyPopupTrackId.value = trackId
  dependencyPopupPosition.value = {
    x: event.clientX + 8,
    y: event.clientY - 8,
  }
  showDependencyPopup.value = true
}

function closeDependencyPopup() {
  showDependencyPopup.value = false
  dependencyPopupTrackId.value = null
}

// Expose methods and intensityProvider for parent component
defineExpose({
  play: () => { if (!isPlaying.value) toggle() },
  pause: () => { if (isPlaying.value) toggle() },
  stop,
  seek,
  toggle,
  intensityProvider,
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
      <div class="timecode">
        {{ formatTime(playhead) }} /
        <span v-if="!isEditingDuration" class="duration-display" @click="startEditDuration">
          {{ formatDurationSeconds(visibleDuration) }}
        </span>
        <span v-else class="duration-edit">
          <input
            ref="durationInputRef"
            v-model="durationInputValue"
            type="number"
            min="1"
            max="600"
            class="duration-input"
            @keydown="onDurationKeydown"
            @blur="confirmDuration"
          />s
        </span>
      </div>
    </div>

    <!-- Timeline Header (fixed) -->
    <div class="timeline-header">
      <!-- Track List Header -->
      <div class="track-list-header" :style="{ width: `${trackListWidth}px` }">
        Tracks
      </div>

      <!-- Resize Handle Header -->
      <div class="resize-handle-header" />

      <!-- Ruler Container (horizontal scroll) -->
      <div
        ref="rulerContainerRef"
        class="ruler-container"
        @scroll="onRulerContainerScroll"
      >
        <!-- Ruler -->
        <div
          ref="rulerRef"
          class="ruler"
          :style="{ minWidth: `${contentWidthPercent}%` }"
          @click="onRulerClick"
        >
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
      </div>
    </div>

    <!-- Timeline Body (scrollable) -->
    <div class="timeline-body">
      <!-- Track List Body -->
      <div
        ref="trackListBodyRef"
        class="track-list-body"
        :style="{ width: `${trackListWidth}px` }"
        @scroll="onTrackListScroll"
      >
        <div class="track-list-body-inner">
          <div
            v-for="(track, index) in timeline.tracks"
            :key="track.id"
            class="track-list-item"
            :class="{ 'track-list-item--selected': selectedTrackId === track.id }"
            @click="emit('select:track', track.id)"
            @contextmenu="emit('contextmenu:track', track.id, $event)"
          >
            <TrackKeyBadge :track-key="getTrackKey?.(track.id) ?? indexToLetter(index)" />
            <span class="track-name">{{ track.name }}</span>
            <button
              v-if="dependencyGraph && getTrackDependencyCount(track.id) > 0"
              class="dependency-button"
              :title="`${getTrackDependencyCount(track.id)} dependencies`"
              @click="openDependencyPopup(track.id, $event)"
            >
              <span class="material-icons">link</span>
              <span class="dependency-count">{{ getTrackDependencyCount(track.id) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Track List Resize Handle -->
      <div
        class="track-list-resize-handle"
        :class="{ 'track-list-resize-handle--active': isResizingTrackList }"
        @mousedown="startTrackListResize"
      />

      <!-- Track Lanes -->
      <div
        ref="trackLanesRef"
        class="track-lanes"
        @scroll="onTrackLanesScroll"
      >
        <div class="track-lanes-inner" :style="{ minWidth: `${contentWidthPercent}%` }">
          <div
            v-for="track in timeline.tracks"
            :key="track.id"
            class="track-lane"
            :class="{ 'track-lane--selected': selectedTrackId === track.id }"
          >
            <!-- Phase separators -->
            <div
              v-for="pos in phasePositions"
              :key="pos.phase.id"
              class="phase-separator"
              :style="{ left: `${pos.startPercent + pos.widthPercent}%` }"
            />
            <!-- Track Content - positioned within its phase -->
            <div
              class="track-content"
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
          </div>
        </div>
        <!-- Playhead line -->
        <div class="playhead-line" :style="{ left: `${playheadPercent}%` }" />
      </div>
    </div>

    <!-- Dependency Popup -->
    <Teleport to="body">
      <TrackDependencyPopup
        v-if="showDependencyPopup && dependencyPopupTrackId"
        :track-id="dependencyPopupTrackId"
        :sources="dependencyPopupSources"
        :position="dependencyPopupPosition"
        @close="closeDependencyPopup"
      />
      <div
        v-if="showDependencyPopup"
        class="popup-backdrop"
        @click="closeDependencyPopup"
      />
    </Teleport>
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.duration-display {
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.15s;
}

.duration-display:hover {
  background: oklch(0.85 0.01 260);
  color: oklch(0.35 0.02 260);
}

.duration-edit {
  display: flex;
  align-items: center;
}

.duration-input {
  width: 3rem;
  padding: 0.125rem 0.25rem;
  border: 1px solid oklch(0.50 0.20 250);
  border-radius: 0.25rem;
  background: white;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: oklch(0.25 0.02 260);
  outline: none;
}

.duration-input:focus {
  border-color: oklch(0.50 0.25 250);
  box-shadow: 0 0 0 2px oklch(0.50 0.20 250 / 0.2);
}

/* Hide number input arrows */
.duration-input::-webkit-outer-spin-button,
.duration-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.duration-input[type='number'] {
  -moz-appearance: textfield;
}

/* Timeline Header (fixed) */
.timeline-header {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.track-list-header {
  flex-shrink: 0;
  height: 1.75rem;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: oklch(0.55 0.02 260);
  background: oklch(0.94 0.01 260);
}

.resize-handle-header {
  width: 4px;
  flex-shrink: 0;
  background: oklch(0.88 0.01 260);
}

/* Timeline Body (scrollable) */
.timeline-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* Track List Body */
.track-list-body {
  flex-shrink: 0;
  background: oklch(0.94 0.01 260);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Hide scrollbar for track list (synced with track lanes) */
.track-list-body::-webkit-scrollbar {
  display: none;
}
.track-list-body {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.track-list-body-inner {
  display: flex;
  flex-direction: column;
}

.track-list-resize-handle {
  width: 4px;
  flex-shrink: 0;
  background: oklch(0.88 0.01 260);
  cursor: ew-resize;
  transition: background 0.15s;
}

.track-list-resize-handle:hover,
.track-list-resize-handle--active {
  background: oklch(0.50 0.20 250);
}

.track-list-item {
  height: 2.5rem;
  min-height: 2.5rem;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid oklch(0.92 0.01 260);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.track-list-item:hover {
  background: oklch(0.90 0.01 260);
}

.track-list-item--selected {
  background: oklch(0.85 0.08 250);
}

.track-list-item--selected:hover {
  background: oklch(0.82 0.10 250);
}

.track-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-param {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: oklch(0.88 0.01 260);
  color: oklch(0.45 0.02 260);
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dependency Button */
.dependency-button {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  background: oklch(0.90 0.03 250);
  color: oklch(0.45 0.10 250);
  cursor: pointer;
  font-size: 0.625rem;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.dependency-button:hover {
  background: oklch(0.85 0.08 250);
  color: oklch(0.35 0.15 250);
}

.dependency-button .material-icons {
  font-size: 14px;
}

.dependency-count {
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
}

/* Popup Backdrop (global, not scoped) */
.popup-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Ruler Container (horizontal scroll) */
.ruler-container {
  flex: 1;
  height: 1.75rem;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Hide scrollbar for ruler container (synced with track lanes) */
.ruler-container::-webkit-scrollbar {
  display: none;
}
.ruler-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Ruler */
.ruler {
  height: 100%;
  position: relative;
  background: oklch(0.92 0.01 260);
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
  overflow: auto;
}

.track-lanes-inner {
  display: flex;
  flex-direction: column;
  /* min-width is set via inline style for horizontal scroll */
}

.track-lane {
  height: 2.5rem;
  min-height: 2.5rem;
  max-height: 2.5rem;
  position: relative;
  border-bottom: 1px solid oklch(0.92 0.01 260);
  overflow: hidden;
}

.track-lane--selected {
  background: oklch(0.92 0.05 250);
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
  background: oklch(0.94 0.02 200);
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
