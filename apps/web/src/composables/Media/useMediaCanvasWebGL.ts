import { ref, watch, onUnmounted, type Ref, shallowRef } from 'vue'
import { type Media, $Media } from '../../modules/Media'
import { type Lut, $Lut } from '../../modules/Filter/Domain'
import { LutRenderer } from '../../modules/Filter/Infra/WebGL/LutRenderer'
import type { PixelEffects } from '../Filter/useFilter'

export type PerformanceStats = {
  /** Current FPS */
  fps: number
  /** Average frame time in ms */
  frameTime: number
  /** Frame count */
  frameCount: number
}

export type UseMediaCanvasWebGLOptions = {
  /** LUT (optional - if not provided, uses identity LUT). Can be 1D or 3D LUT. */
  lut?: Ref<Lut>
  /** Pixel effects (optional) */
  pixelEffects?: Ref<PixelEffects>
}

export type UseMediaCanvasWebGLReturn = {
  /** Output canvas reference */
  canvasRef: Ref<HTMLCanvasElement | null>
  /** Performance stats (for streaming mode) */
  stats: Ref<PerformanceStats>
  /** Whether currently processing frames */
  isProcessing: Ref<boolean>
}

export const useMediaCanvasWebGL = (
  media: Ref<Media | null>,
  options: UseMediaCanvasWebGLOptions = {}
): UseMediaCanvasWebGLReturn => {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isProcessing = ref(false)
  const stats = ref<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    frameCount: 0,
  })

  // WebGL Renderer (lazy init)
  const rendererRef = shallowRef<LutRenderer | null>(null)

  let animationFrameId: number | null = null
  let lastFrameTime = 0
  let frameTimes: number[] = []
  const FPS_SAMPLE_SIZE = 30

  // Identity LUT for "no filter" mode
  const identityLut = $Lut.identity()

  /** Renderer を初期化 */
  const initRenderer = () => {
    const canvas = canvasRef.value
    if (!canvas || rendererRef.value) return

    try {
      rendererRef.value = new LutRenderer({ canvas })
    } catch (e) {
      console.error('Failed to initialize WebGL renderer:', e)
    }
  }

  /** Renderer を破棄 */
  const disposeRenderer = () => {
    if (rendererRef.value) {
      rendererRef.value.dispose()
      rendererRef.value = null
    }
  }

  /** 単一フレームを描画 */
  const renderFrame = () => {
    const canvas = canvasRef.value
    const currentMedia = media.value
    if (!canvas || !currentMedia) return false

    // Renderer 初期化
    if (!rendererRef.value) {
      initRenderer()
    }
    const renderer = rendererRef.value
    if (!renderer) return false

    // Source を取得
    const source = $Media.getVideoElement(currentMedia) ?? $Media.getImageData(currentMedia)
    if (!source) return false

    // LUT とエフェクトを取得
    const lut = options.lut?.value ?? identityLut
    const effects = options.pixelEffects?.value

    // WebGL でレンダリング
    renderer.render(source, {
      lut,
      vibrance: effects?.vibrance ?? 0,
      hueRotation: effects?.hueRotation ?? 0,
      // Selective Color
      selectiveColorEnabled: effects?.selectiveColorEnabled ?? false,
      selectiveHue: effects?.selectiveHue ?? 0,
      selectiveRange: effects?.selectiveRange ?? 0,
      selectiveDesaturate: effects?.selectiveDesaturate ?? 0,
    })

    return true
  }

  /** ストリーミング用の継続的なフレーム処理 */
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

  // Canvas が設定されたら Renderer を初期化し、Photo モードなら描画
  watch(canvasRef, (canvas) => {
    if (canvas) {
      initRenderer()
      // Photo モードで media が既に設定されていたら描画
      const currentMedia = media.value
      if (currentMedia && $Media.isPhoto(currentMedia)) {
        requestAnimationFrame(() => renderFrame())
      }
    } else {
      disposeRenderer()
    }
  })

  // Media の変更を監視
  watch(media, (newMedia) => {
    if (!newMedia) {
      stopProcessing()
      return
    }

    if ($Media.isCamera(newMedia)) {
      // ストリーミングモード: 継続処理を開始
      startProcessing()
    } else {
      // Photo モード: 継続処理を停止し、単発で描画
      stopProcessing()
      // 次フレームで描画（canvas が準備できてから）
      requestAnimationFrame(() => renderFrame())
    }
  }, { immediate: true })

  // Photo モードで LUT/Effects が変わったら再描画
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
    disposeRenderer()
  })

  return {
    canvasRef,
    stats,
    isProcessing,
  }
}
