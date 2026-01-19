import { computed, type WritableComputedRef, type ComputedRef } from 'vue'
import {
  VignetteShapeSchemas,
  createVignetteConfigForShape,
  type VignetteShape,
  type VignetteConfig,
} from '@practice/section-visual'
import type { VignetteConfigParams } from './useFilterEditor'

// ============================================================
// Types
// ============================================================

/** Shape schema type - union of all shape-specific schemas */
type VignetteShapeSchema = typeof VignetteShapeSchemas[VignetteShape]

/**
 * Options for useVignetteEditor composable
 */
export interface UseVignetteEditorOptions {
  /** Writable computed ref for vignette config */
  vignetteConfig: WritableComputedRef<VignetteConfigParams>
}

/**
 * Return type for useVignetteEditor composable
 */
export interface UseVignetteEditorReturn {
  /** Migrated vignette config (with shape support) */
  migratedConfig: ComputedRef<VignetteConfig>
  /** Schema for current shape-specific params */
  shapeSchema: ComputedRef<VignetteShapeSchema>
  /** Shape-specific params only (excludes base params) */
  shapeParams: ComputedRef<Record<string, unknown>>
  /** Color as hex string */
  colorHex: ComputedRef<string>
  /** Handle base params update (shape, intensity, softness) */
  handleBaseUpdate: (update: Record<string, unknown>) => void
  /** Handle shape-specific params update */
  handleShapeUpdate: (update: Record<string, unknown>) => void
  /** Handle color change from input event */
  handleColorChange: (event: Event) => void
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert RGB array to hex string
 */
function rgbToHex(color: [number, number, number, number]): string {
  const [r, g, b] = color
  return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`
}

/**
 * Convert hex string to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing vignette editor state
 *
 * Extracts common vignette editing logic shared between
 * EffectSectionPanel and EffectSettingsPanel.
 *
 * Handles:
 * - Legacy config migration
 * - Shape-specific schema selection
 * - Shape-specific parameter extraction
 * - Base and shape parameter updates
 * - Color hex conversion and updates
 *
 * @example
 * ```ts
 * const { vignetteConfig } = useFilterEditor({ effectManager })
 * const {
 *   migratedConfig,
 *   shapeSchema,
 *   shapeParams,
 *   colorHex,
 *   handleBaseUpdate,
 *   handleShapeUpdate,
 *   handleColorChange,
 * } = useVignetteEditor({ vignetteConfig })
 * ```
 */
export function useVignetteEditor(
  options: UseVignetteEditorOptions
): UseVignetteEditorReturn {
  const { vignetteConfig } = options

  // ============================================================
  // Computed Properties
  // ============================================================

  /**
   * Vignette config with shape support (all configs now use new format)
   */
  const migratedConfig = computed<VignetteConfig>(
    () => vignetteConfig.value as unknown as VignetteConfig
  )

  /**
   * Get shape-specific schema based on current vignette shape
   */
  const shapeSchema = computed<VignetteShapeSchema>(() => {
    const shape = migratedConfig.value.shape as VignetteShape
    return VignetteShapeSchemas[shape] ?? VignetteShapeSchemas.ellipse
  })

  /**
   * Extract shape-specific params for SchemaFields
   * Excludes base params (enabled, shape, intensity, softness, color)
   */
  const shapeParams = computed<Record<string, unknown>>(() => {
    const { enabled, shape, intensity, softness, color, ...rest } = migratedConfig.value
    return rest
  })

  /**
   * Color as hex string for color picker
   */
  const colorHex = computed<string>(() => rgbToHex(migratedConfig.value.color))

  // ============================================================
  // Update Handlers
  // ============================================================

  /**
   * Handle base vignette params update (shape, intensity, softness)
   * When shape changes, creates new config with proper defaults for the new shape
   */
  const handleBaseUpdate = (update: Record<string, unknown>) => {
    // Check if shape is changing
    if ('shape' in update && update.shape !== migratedConfig.value.shape) {
      // Create new config with proper defaults for the new shape
      const newConfig = createVignetteConfigForShape(
        update.shape as VignetteShape,
        migratedConfig.value
      )
      vignetteConfig.value = { ...newConfig, ...update } as unknown as VignetteConfigParams
    } else {
      vignetteConfig.value = { ...migratedConfig.value, ...update } as unknown as VignetteConfigParams
    }
  }

  /**
   * Handle shape-specific params update
   */
  const handleShapeUpdate = (update: Record<string, unknown>) => {
    vignetteConfig.value = { ...migratedConfig.value, ...update } as unknown as VignetteConfigParams
  }

  /**
   * Handle color change from input event
   */
  const handleColorChange = (event: Event) => {
    const hex = (event.target as HTMLInputElement).value
    const [r, g, b] = hexToRgb(hex)
    const a = migratedConfig.value.color[3]
    vignetteConfig.value = { ...migratedConfig.value, color: [r, g, b, a] } as unknown as VignetteConfigParams
  }

  // ============================================================
  // Return
  // ============================================================

  return {
    migratedConfig,
    shapeSchema,
    shapeParams,
    colorHex,
    handleBaseUpdate,
    handleShapeUpdate,
    handleColorChange,
  }
}
