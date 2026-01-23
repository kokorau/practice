import { ref, computed, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import type { ObjectSchema } from '@practice/schema'
import type { RGBA } from '@practice/texture'
import type { FilterType } from '@practice/section-visual'
import type {
  VignetteConfigParams,
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from './useFilterEditor'
import type { MaskPatternItem } from '../components/HeroGenerator/RightPropertyPanel/MaskSettingsPanel.vue'
import type { BackgroundSpecCreator } from '../components/HeroGenerator/MaskPatternThumbnail.vue'

// ============================================================
// Types
// ============================================================

/**
 * Effector type - unified concept for Effect and Mask
 */
export type EffectorType = 'effect' | 'mask'

/**
 * Filter/effect state - WritableComputedRef for direct binding
 */
export interface FilterProps {
  selectedType: WritableComputedRef<FilterType>
  vignetteConfig: WritableComputedRef<VignetteConfigParams>
  chromaticConfig: WritableComputedRef<ChromaticConfigParams>
  dotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  lineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
  blurConfig: WritableComputedRef<BlurConfigParams>
}

/**
 * Mask/shape state for UI binding
 */
export interface MaskProps {
  shapePatterns: MaskPatternItem[]
  selectedShapeIndex: number | null
  shapeSchema: ObjectSchema | null
  shapeParams: Record<string, unknown> | null
  /** Raw shape params with PropertyValue preserved (for DSL display) */
  rawShapeParams?: Record<string, unknown> | null
  outerColor: RGBA
  innerColor: RGBA
  createBackgroundThumbnailSpec: BackgroundSpecCreator
}

/**
 * Options for useEffectorManager composable
 */
export interface UseEffectorManagerOptions {
  /** Filter props from useFilterEditor */
  filterProps: FilterProps
  /** Mask props (reactive) */
  maskShapePatterns: Ref<MaskPatternItem[]>
  selectedMaskShapeIndex: Ref<number | null>
  maskShapeSchema: ComputedRef<ObjectSchema | null>
  maskShapeParams: ComputedRef<Record<string, unknown> | null>
  maskOuterColor: ComputedRef<RGBA>
  maskInnerColor: ComputedRef<RGBA>
  createBackgroundThumbnailSpec: BackgroundSpecCreator
  /** Callbacks */
  onSelectMaskShape: (index: number) => void
  onUpdateMaskShapeParams: (params: Record<string, unknown>) => void
}

/**
 * Return type for useEffectorManager composable
 */
export interface UseEffectorManagerReturn {
  // ============================================================
  // Selection State
  // ============================================================

  /** Currently selected effector type */
  selectedEffectorType: Ref<EffectorType | null>

  /** Select effector type */
  selectEffectorType: (type: EffectorType | null) => void

  // ============================================================
  // Effect State (delegated)
  // ============================================================

  /** Filter props for effect editing */
  filterProps: FilterProps

  // ============================================================
  // Mask State
  // ============================================================

  /** Mask props for UI binding */
  maskProps: ComputedRef<MaskProps>

  /** Update mask shape selection */
  selectMaskShape: (index: number) => void

  /** Update mask shape params */
  updateMaskShapeParams: (params: Record<string, unknown>) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for unified Effect and Mask management
 *
 * Combines Effect management (via filterProps) and Mask management
 * into a single unified interface for UI components.
 *
 * @example
 * ```ts
 * const effectorManager = useEffectorManager({
 *   filterProps,
 *   maskShapePatterns,
 *   selectedMaskShapeIndex,
 *   // ... other options
 * })
 *
 * // In template
 * <EffectorSettingsPanel
 *   :effector-type="effectorManager.selectedEffectorType.value"
 *   :filter-props="effectorManager.filterProps"
 *   :mask-props="effectorManager.maskProps.value"
 * />
 * ```
 */
export function useEffectorManager(options: UseEffectorManagerOptions): UseEffectorManagerReturn {
  const {
    filterProps,
    maskShapePatterns,
    selectedMaskShapeIndex,
    maskShapeSchema,
    maskShapeParams,
    maskOuterColor,
    maskInnerColor,
    createBackgroundThumbnailSpec,
    onSelectMaskShape,
    onUpdateMaskShapeParams,
  } = options

  // ============================================================
  // Selection State
  // ============================================================

  /** Currently selected effector type */
  const selectedEffectorType = ref<EffectorType | null>(null)

  /**
   * Select effector type
   */
  function selectEffectorType(type: EffectorType | null): void {
    selectedEffectorType.value = type
  }

  // ============================================================
  // Mask Props
  // ============================================================

  /**
   * Computed mask props for UI binding
   */
  const maskProps = computed<MaskProps>(() => ({
    shapePatterns: maskShapePatterns.value,
    selectedShapeIndex: selectedMaskShapeIndex.value,
    shapeSchema: maskShapeSchema.value,
    shapeParams: maskShapeParams.value,
    outerColor: maskOuterColor.value,
    innerColor: maskInnerColor.value,
    createBackgroundThumbnailSpec,
  }))

  /**
   * Select mask shape by index
   */
  function selectMaskShape(index: number): void {
    onSelectMaskShape(index)
  }

  /**
   * Update mask shape parameters
   */
  function updateMaskShapeParams(params: Record<string, unknown>): void {
    onUpdateMaskShapeParams(params)
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    // Selection
    selectedEffectorType,
    selectEffectorType,

    // Effect
    filterProps,

    // Mask
    maskProps,
    selectMaskShape,
    updateMaskShapeParams,
  }
}
