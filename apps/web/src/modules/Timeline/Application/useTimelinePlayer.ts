import { ref, computed, onUnmounted, watch } from 'vue'
import type { Timeline, FrameState, Ms, PhaseLayout, IntensityProvider } from '@practice/timeline'
import { createTimelinePlayer, calculatePhaseLayouts, createIntensityProvider, prepareTimeline } from '@practice/timeline'

export interface UseTimelinePlayerOptions {
  timeline: Timeline
  visibleDuration: Ms
}

export function useTimelinePlayer(options: UseTimelinePlayerOptions) {
  const { timeline, visibleDuration } = options

  // Prepare timeline (parse DSL expressions into AST)
  prepareTimeline(timeline)

  // State
  const playhead = ref<Ms>(0 as Ms)
  const isPlaying = ref(false)
  const frameState = ref<FrameState>({ time: 0, intensities: {} })

  // Player instance
  const player = createTimelinePlayer({ timeline })

  // IntensityProvider for intensity change notifications
  const intensityProviderWriter = createIntensityProvider()
  const intensityProvider: IntensityProvider = intensityProviderWriter

  // Animation frame
  let animationFrameId: number | null = null
  let startTime: number | null = null

  // Phase layouts (calculated once)
  const phaseLayouts = computed(() =>
    calculatePhaseLayouts(timeline.phases, visibleDuration)
  )

  // Get phase layout by phaseId
  function getPhaseLayout(phaseId: string): PhaseLayout | undefined {
    return phaseLayouts.value.find(p => p.phaseId === phaseId)
  }

  // Playback controls
  function play() {
    isPlaying.value = true
    player.seek(playhead.value)
    player.play()
    startTime = performance.now() - playhead.value
    tick()
  }

  function pause() {
    isPlaying.value = false
    player.pause()
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function stop() {
    pause()
    playhead.value = 0 as Ms
    player.seek(0)
    frameState.value = player.update(0)
  }

  function seek(newPlayhead: Ms) {
    if (isPlaying.value) {
      startTime = performance.now() - newPlayhead
    }
    playhead.value = newPlayhead
    player.seek(newPlayhead)
    if (!isPlaying.value) {
      frameState.value = player.update(0)
    }
  }

  function toggle() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  // Animation loop
  function tick() {
    if (!isPlaying.value) return

    const now = performance.now()
    const engineTime = startTime !== null ? now - startTime : 0

    frameState.value = player.update(engineTime)
    playhead.value = frameState.value.time as Ms

    // Update IntensityProvider and notify subscribers
    intensityProviderWriter.setIntensities(frameState.value.intensities)
    intensityProviderWriter.flush()

    animationFrameId = requestAnimationFrame(tick)
  }

  // Sync playhead when seeking via UI (when not playing)
  watch(playhead, (newVal) => {
    if (!isPlaying.value) {
      player.seek(newVal)
      frameState.value = player.update(0)
      // Update IntensityProvider for non-playing seek
      intensityProviderWriter.setIntensities(frameState.value.intensities)
      intensityProviderWriter.flush()
    }
  })

  // Initialize
  frameState.value = player.update(0)
  intensityProviderWriter.setIntensities(frameState.value.intensities)
  intensityProviderWriter.flush()

  // Cleanup
  onUnmounted(() => {
    pause()
  })

  return {
    // State (readonly where appropriate)
    playhead,
    isPlaying: computed(() => isPlaying.value),
    frameState: computed(() => frameState.value),
    phaseLayouts,

    // IntensityProvider for reactive intensity subscriptions
    intensityProvider,

    // Actions
    play,
    pause,
    stop,
    seek,
    toggle,

    // Helpers,
    getPhaseLayout,
  }
}
