import { ref, watch, onUnmounted, type Ref } from 'vue'
import { type Media, $Media } from '../../modules/Media'
import { type Lut, $Lut, $Lut3D, isLut3D } from '../../modules/Filter/Domain'
import type { PixelEffects } from '../Filter/useFilter'

export type PerformanceStats = {
  /** Current FPS */
  fps: number
  /** Average frame time in ms */
  frameTime: number
  /** Frame count */
  frameCount: number
}

export type UseMediaCanvasOptions = {
  /** LUT (optional - if not provided, renders original) */
  lut?: Ref<Lut>
  /** Pixel effects (optional) */
  pixelEffects?: Ref<PixelEffects>
}

export type UseMediaCanvasReturn = {
  /** Output canvas reference */
  canvasRef: Ref<HTMLCanvasElement | null>
  /** Performance stats (for camera mode) */
  stats: Ref<PerformanceStats>
  /** Whether currently processing frames */
  isProcessing: Ref<boolean>
}

export const useMediaCanvas = (
  media: Ref<Media | null>,
  options: UseMediaCanvasOptions = {}
): UseMediaCanvasReturn => {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isProcessing = ref(false)
  const stats = ref<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    frameCount: 0,
  })

  let animationFrameId: number | null = null
  let lastFrameTime = 0
  let frameTimes: number[] = []
  const FPS_SAMPLE_SIZE = 30

  /** 単一フレームを描画 */
  const renderFrame = () => {
    const canvas = canvasRef.value
    const currentMedia = media.value
    if (!canvas || !currentMedia) return false

    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    // ImageData を取得
    const imageData = $Media.getImageData(currentMedia)
    if (!imageData) return false

    // Canvas サイズを合わせる
    if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
      canvas.width = imageData.width
      canvas.height = imageData.height
    }

    // フィルター適用 (LUT が指定されている場合のみ)
    let outputData = imageData
    if (options.lut?.value) {
      const lut = options.lut.value
      if (isLut3D(lut)) {
        // 3D LUT
        outputData = $Lut3D.apply(imageData, lut)
      } else {
        // 1D LUT
        if (options.pixelEffects?.value) {
          outputData = $Lut.applyWithEffects(imageData, lut, options.pixelEffects.value)
        } else {
          outputData = $Lut.apply(imageData, lut)
        }
      }
    }

    // 描画
    ctx.putImageData(outputData, 0, 0)
    return true
  }

  /** カメラ用の継続的なフレーム処理 */
  const processLoop = (timestamp: number) => {
    if (!isProcessing.value) return

    // FPS 計算
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

    renderFrame()
    animationFrameId = requestAnimationFrame(processLoop)
  }

  /** 処理を開始 */
  const startProcessing = () => {
    if (isProcessing.value) return

    isProcessing.value = true
    lastFrameTime = 0
    frameTimes = []
    stats.value = { fps: 0, frameTime: 0, frameCount: 0 }
    animationFrameId = requestAnimationFrame(processLoop)
  }

  /** 処理を停止 */
  const stopProcessing = () => {
    isProcessing.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // Media の変更を監視
  watch(media, (newMedia) => {
    if (!newMedia) {
      stopProcessing()
      return
    }

    if ($Media.isCamera(newMedia)) {
      // カメラモード: 継続処理を開始
      startProcessing()
    } else {
      // Photo モード: 継続処理を停止し、単発で描画
      stopProcessing()
      renderFrame()
    }
  }, { immediate: true })

  // Photo モードで LUT/Effects が変わったら再描画 (LUT が指定されている場合のみ)
  const watchTargets = [options.lut, options.pixelEffects].filter(Boolean) as Ref<unknown>[]
  if (watchTargets.length > 0) {
    watch(watchTargets, () => {
      const currentMedia = media.value
      if (currentMedia && $Media.isPhoto(currentMedia)) {
        renderFrame()
      }
    }, { deep: true })
  }

  // クリーンアップ
  onUnmounted(() => {
    stopProcessing()
  })

  return {
    canvasRef,
    stats,
    isProcessing,
  }
}
