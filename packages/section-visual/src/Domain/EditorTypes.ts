/**
 * EditorTypes
 *
 * Pure type definitions for HeroEditor UI layer operations.
 * These types are used across composables and components.
 */

// ============================================================
// Selection Types
// ============================================================

/**
 * Processor type for selection and operations
 * - 'effect': Effect processor (blur, vignette, etc.)
 * - 'mask': Mask processor (shape-based clipping)
 * - 'filter': Filter processor (color adjustments: exposure, contrast, etc.)
 * - 'processor': Generic processor (used for selection state)
 */
export type ProcessorType = 'effect' | 'mask' | 'filter' | 'processor'

/**
 * Processor type for add-processor operation (excludes 'processor')
 */
export type AddProcessorType = 'effect' | 'mask' | 'filter'

/**
 * Selectable processor type (excludes generic 'processor')
 */
export type SelectableProcessorType = 'effect' | 'mask' | 'filter'

/**
 * Layer selection state (pure data)
 */
export interface LayerSelection {
  /** Selected canvas layer ID */
  layerId: string | null
  /** Selected processor type */
  processorType: ProcessorType | null
  /** Selected processor layer ID */
  processorLayerId: string | null
  /** Selected foreground element ID */
  foregroundElementId: string | null
}

// ============================================================
// Layer Types
// ============================================================

/**
 * Layer type for UI operations
 * Note: 'base' is included for type compatibility but cannot be added through UI
 */
export type UILayerType = 'base' | 'surface' | 'text' | 'model3d' | 'image' | 'group'

/**
 * Layer variant (non-group layer types)
 */
export type LayerVariant = 'surface' | 'text' | 'model3d' | 'image' | 'base' | 'processor'

// ============================================================
// Layer Options
// ============================================================

/**
 * Text layer anchor position
 */
export type TextAnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/**
 * Text layer options for creation/update
 */
export interface TextLayerOptions {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  x: number
  y: number
  anchor: TextAnchorPosition
  rotation: number
}

/**
 * Object layer options for creation
 */
export interface ObjectLayerOptions {
  modelUrl: string
}

/**
 * Image layer options for creation
 */
export interface ImageLayerOptions {
  imageId: string
  mode: 'cover' | 'positioned'
  position?: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  }
}
