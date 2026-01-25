/**
 * LayerDisplay
 *
 * Display helpers for layers and dependency sources.
 * Provides consistent icon and label mappings across the application.
 */

import type { LayerVariant } from './EditorTypes'
import type { DependencySourceType } from './DependencyGraph'

// ============================================================
// Layer Variant Display
// ============================================================

/**
 * Extended layer variant including 'group' for display purposes.
 */
export type DisplayLayerVariant = LayerVariant | 'group'

/**
 * Material icon name for a layer variant.
 *
 * @param variant - Layer variant
 * @returns Material icon name
 *
 * @example
 * getLayerIcon('surface') // → 'texture'
 * getLayerIcon('processor') // → 'auto_fix_high'
 */
export function getLayerIcon(variant: DisplayLayerVariant): string {
  switch (variant) {
    case 'base':
      return 'gradient'
    case 'surface':
      return 'texture'
    case 'group':
      return 'folder_open'
    case 'model3d':
      return 'view_in_ar'
    case 'image':
      return 'image'
    case 'text':
      return 'text_fields'
    case 'processor':
      return 'auto_fix_high'
    default:
      return 'layers'
  }
}

/**
 * Display label for a layer variant.
 *
 * @param variant - Layer variant
 * @returns Human-readable label
 *
 * @example
 * getLayerLabel('surface') // → 'Surface'
 * getLayerLabel('model3d') // → '3D Model'
 */
export function getLayerLabel(variant: DisplayLayerVariant): string {
  switch (variant) {
    case 'base':
      return 'Base'
    case 'surface':
      return 'Surface'
    case 'group':
      return 'Group'
    case 'model3d':
      return '3D Model'
    case 'image':
      return 'Image'
    case 'text':
      return 'Text'
    case 'processor':
      return 'Processor'
    default:
      return 'Layer'
  }
}

// ============================================================
// Dependency Source Display
// ============================================================

/**
 * Material icon name for a dependency source type.
 *
 * @param type - Dependency source type
 * @returns Material icon name
 *
 * @example
 * getDependencySourceIcon('surface') // → 'texture'
 * getDependencySourceIcon('mask') // → 'vignette'
 */
export function getDependencySourceIcon(type: DependencySourceType): string {
  switch (type) {
    case 'surface':
      return 'texture'
    case 'mask':
      return 'vignette'
    case 'effect':
      return 'auto_fix_high'
    default:
      return 'layers'
  }
}

/**
 * Display label for a dependency source type.
 *
 * @param type - Dependency source type
 * @returns Human-readable label
 *
 * @example
 * getDependencySourceLabel('surface') // → 'Surface'
 * getDependencySourceLabel('mask') // → 'Mask'
 */
export function getDependencySourceLabel(type: DependencySourceType): string {
  switch (type) {
    case 'surface':
      return 'Surface'
    case 'mask':
      return 'Mask'
    case 'effect':
      return 'Effect'
    default:
      return 'Unknown'
  }
}
