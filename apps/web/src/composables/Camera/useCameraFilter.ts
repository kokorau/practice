import { ref, onUnmounted, type Ref } from 'vue'
import { type Lut, $Lut } from '../../modules/Filter/Domain'
import type { PixelEffects } from '../Filter/useFilter'

export type PerformanceStats = {
  /** Current FPS */
  fps: number
  /** Average frame time in ms */
  frameTime: number
  /** Frame count */
  frameCount: number
}

export type UseCameraFilterOptions = {
  lut: Ref<Lut>
  pixelEffects: Ref<PixelEffects>
}

export type UseCameraFilterReturn = {
  /** Output canvas reference */
  canvasRef: Ref<HTMLCanvasElement | null>
  /** Performance stats */
  stats: Ref<PerformanceStats>
  /** Start processing */
  start: (video: HTMLVideoElement) => void
  /** Stop processing */
  stop: () => void
  /** Whether processing is active */
  isProcessing: Ref<boolean>
}

export const useCameraFilter = (options: UseCameraFilterOptions): UseCameraFilterReturn => {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isProcessing = ref(false)
  const stats = ref<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    frameCount: 0,
  })

  let animationFrameId: number | null = null
  let videoElement: HTMLVideoElement | null = null

  // For FPS calculation
  let lastFrameTime = 0
  let frameTimes: number[] = []
  const FPS_SAMPLE_SIZE = 30

  // Offscreen canvas for reading video frames
  let offscreenCanvas: HTMLCanvasElement | null = null
  let offscreenCtx: CanvasRenderingContext2D | null = null

  const processFrame = (timestamp: number) => {
    if (!isProcessing.value || !videoElement || !canvasRef.value) {
      return
    }

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate frame time
    if (lastFrameTime > 0) {
      const delta = timestamp - lastFrameTime
      frameTimes.push(delta)
      if (frameTimes.length > FPS_SAMPLE_SIZE) {
        frameTimes.shift()
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      stats.value = {
        fps: Math.round(1000 / avgFrameTime),
        frameTime: Math.round(avgFrameTime * 10) / 10,
        frameCount: stats.value.frameCount + 1,
      }
    }
    lastFrameTime = timestamp

    // Ensure canvas matches video dimensions
    const videoWidth = videoElement.videoWidth
    const videoHeight = videoElement.videoHeight

    if (videoWidth === 0 || videoHeight === 0) {
      animationFrameId = requestAnimationFrame(processFrame)
      return
    }

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth
      canvas.height = videoHeight
    }

    // Setup offscreen canvas if needed
    if (!offscreenCanvas || offscreenCanvas.width !== videoWidth) {
      offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = videoWidth
      offscreenCanvas.height = videoHeight
      offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })
    }

    if (!offscreenCtx) {
      animationFrameId = requestAnimationFrame(processFrame)
      return
    }

    // Draw video frame to offscreen canvas
    offscreenCtx.drawImage(videoElement, 0, 0)

    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, videoWidth, videoHeight)

    // Apply filter
    const lut = options.lut.value
    const effects = options.pixelEffects.value
    const filteredData = $Lut.applyWithEffects(imageData, lut, effects)

    // Draw to output canvas
    ctx.putImageData(filteredData, 0, 0)

    // Schedule next frame
    animationFrameId = requestAnimationFrame(processFrame)
  }

  const start = (video: HTMLVideoElement) => {
    videoElement = video
    isProcessing.value = true
    lastFrameTime = 0
    frameTimes = []
    stats.value = { fps: 0, frameTime: 0, frameCount: 0 }
    animationFrameId = requestAnimationFrame(processFrame)
  }

  const stop = () => {
    isProcessing.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    videoElement = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    canvasRef,
    stats,
    start,
    stop,
    isProcessing,
  }
}
