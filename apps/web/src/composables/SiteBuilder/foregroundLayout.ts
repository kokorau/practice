/**
 * foregroundLayout
 *
 * Re-exports from Domain layer for backward compatibility
 */

import type {
  GridPosition,
  ForegroundElementConfig,
  ForegroundLayerConfig,
  ForegroundElementType,
} from '@practice/section-visual'
import { createDefaultForegroundConfig } from '@practice/section-visual'

// Re-export types from Domain
export type { GridPosition, ForegroundElementConfig, ForegroundElementType }

/** @deprecated Use ForegroundLayerConfig from HeroScene instead */
export type ForegroundConfig = ForegroundLayerConfig

// Re-export layout functions and types from Domain
export type {
  PositionedElement,
  PositionedGroup,
  CompiledPositionedElement,
  CompiledPositionedGroup,
} from '@practice/section-visual'

export {
  GRID_POSITIONS,
  ELEMENT_TAG,
  compileForegroundLayout,
  layoutCompiledForeground,
} from '@practice/section-visual'

// Default config
export const DEFAULT_FOREGROUND_CONFIG: ForegroundConfig = createDefaultForegroundConfig()
