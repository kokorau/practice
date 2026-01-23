import { ref, computed, onUnmounted, watch } from 'vue'
import type { Timeline, FrameState, Ms, PhaseLayout, ParamResolver } from '@practice/timeline'
import { createTimelinePlayer, calculatePhaseLayouts, createParamResolver, prepareTimeline } from '@practice/timeline'

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
  const frameState = ref<FrameState>({ time: 0, params: {}, intensities: {} })

  // Player instance
  const player = createTimelinePlayer({ timeline })

  // ParamResolver for param change notifications
  const paramResolverWriter = createParamResolver()
  const paramResolver: ParamResolver = paramResolverWriter

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

    // Update ParamResolver and notify subscribers
    paramResolverWriter.setParams(frameState.value.params)
    paramResolverWriter.flush()

    animationFrameId = requestAnimationFrame(tick)
  }

  // Sync playhead when seeking via UI (when not playing)
  watch(playhead, (newVal) => {
    if (!isPlaying.value) {
      player.seek(newVal)
      frameState.value = player.update(0)
      // Update ParamResolver for non-playing seek
      paramResolverWriter.setParams(frameState.value.params)
      paramResolverWriter.flush()
    }
  })

  // Initialize
  frameState.value = player.update(0)
  paramResolverWriter.setParams(frameState.value.params)
  paramResolverWriter.flush()

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

    // ParamResolver for reactive param subscriptions
    paramResolver,

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
