import { ref, watch, nextTick, type Ref, type ComputedRef } from 'vue'
import { checkContrastAsync, type ContrastAnalysisResult } from '../modules/ContrastChecker'

// ============================================================
// Types
// ============================================================

export type ForegroundElementType = 'title' | 'description'

export interface ElementBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ScaledRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface HeroPreviewRef {
  getElementBounds: (type: ForegroundElementType) => ElementBounds | null
}

export interface UseContrastCheckerOptions {
  canvasImageData: Ref<ImageData | null>
  heroPreviewRef: Ref<HeroPreviewRef | null>
  foregroundTitleColor: Ref<string | null> | ComputedRef<string | null>
  foregroundBodyColor: Ref<string | null> | ComputedRef<string | null>
  setElementBounds: (type: ForegroundElementType, bounds: ScaledRegion | null) => void
  // Additional dependencies that trigger contrast recalculation
  watchDependencies?: Ref<unknown>[]
}

// ============================================================
// Constants
// ============================================================

// Base dimensions used in HeroPreview (must match)
const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080

// ============================================================
// Composable
// ============================================================

export function useContrastChecker(options: UseContrastCheckerOptions) {
  const {
    canvasImageData,
    heroPreviewRef,
    foregroundTitleColor,
    foregroundBodyColor,
    setElementBounds,
    watchDependencies = [],
  } = options

  // State
  const titleContrastResult = ref<ContrastAnalysisResult | null>(null)
  const descriptionContrastResult = ref<ContrastAnalysisResult | null>(null)

  // ============================================================
  // Internal: Scale bounds from BASE dimensions to ImageData dimensions
  // ============================================================
  const scaleBounds = (bounds: ElementBounds, imageData: ImageData): ScaledRegion => {
    const scaleX = imageData.width / BASE_WIDTH
    const scaleY = imageData.height / BASE_HEIGHT
    return {
      x: bounds.x * scaleX,
      y: bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY,
    }
  }

  // ============================================================
  // Contrast Check Functions
  // ============================================================
  const checkTitleContrast = async () => {
    await nextTick()
    const imageData = canvasImageData.value
    const bounds = heroPreviewRef.value?.getElementBounds('title')
    const textColor = foregroundTitleColor.value

    if (!imageData || !bounds || !textColor) {
      titleContrastResult.value = null
      setElementBounds('title', null)
      return
    }

    const scaledRegion = scaleBounds(bounds, imageData)

    // Update element bounds for auto color selection
    setElementBounds('title', scaledRegion)

    titleContrastResult.value = await checkContrastAsync(imageData, textColor, scaledRegion)
  }

  const checkDescriptionContrast = async () => {
    await nextTick()
    const imageData = canvasImageData.value
    const bounds = heroPreviewRef.value?.getElementBounds('description')
    const textColor = foregroundBodyColor.value

    if (!imageData || !bounds || !textColor) {
      descriptionContrastResult.value = null
      setElementBounds('description', null)
      return
    }

    const scaledRegion = scaleBounds(bounds, imageData)

    // Update element bounds for auto color selection
    setElementBounds('description', scaledRegion)

    descriptionContrastResult.value = await checkContrastAsync(imageData, textColor, scaledRegion)
  }

  const checkAllContrast = () => {
    checkTitleContrast()
    checkDescriptionContrast()
  }

  // ============================================================
  // Watchers
  // ============================================================

  // Watch for changes that affect title contrast
  watch([foregroundTitleColor, ...watchDependencies], checkTitleContrast)

  // Watch for changes that affect description contrast
  watch([foregroundBodyColor, ...watchDependencies], checkDescriptionContrast)

  // Update contrast when canvas ImageData changes (after each render)
  watch(canvasImageData, checkAllContrast)

  return {
    titleContrastResult,
    descriptionContrastResult,
    checkTitleContrast,
    checkDescriptionContrast,
    checkAllContrast,
  }
}
