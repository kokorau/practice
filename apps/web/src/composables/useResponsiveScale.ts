import { ref, onMounted, onUnmounted, type Ref, type ShallowRef } from 'vue'

export type ResponsiveScaleOptions = {
  originalWidth: number
  originalHeight: number
  padding?: number
}

/**
 * Composable that tracks container size and calculates responsive scale
 * to fit content within the container while maintaining aspect ratio.
 *
 * Considers both width and height constraints, using the smaller scale
 * to ensure content fits within the container in both dimensions.
 *
 * @param containerRef - Ref to the container element to observe
 * @param options - Configuration for scale calculation
 * @returns Reactive scale value (0-1)
 */
export function useResponsiveScale(
  containerRef: Ref<HTMLElement | null> | ShallowRef<HTMLElement | null>,
  options: ResponsiveScaleOptions
): Ref<number> {
  const { originalWidth, originalHeight, padding = 0 } = options
  const scale = ref(1)

  let resizeObserver: ResizeObserver | null = null

  const updateScale = () => {
    if (!containerRef.value) return
    const containerWidth = containerRef.value.clientWidth
    const containerHeight = containerRef.value.clientHeight
    const availableWidth = containerWidth - padding
    const availableHeight = containerHeight - padding

    // Calculate scale for both dimensions and use the smaller one
    const scaleX = availableWidth / originalWidth
    const scaleY = availableHeight / originalHeight
    scale.value = Math.min(1, scaleX, scaleY)
  }

  onMounted(() => {
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(containerRef.value)
      updateScale()
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  return scale
}
