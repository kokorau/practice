// ============================================================
// Re-export types from HeroScene/Domain (Single Source of Truth)
// ============================================================
import type {
  GridPosition,
  ForegroundElementConfig,
  ForegroundLayerConfig,
  ForegroundElementType,
  HeroPrimitiveKey,
} from '../../modules/HeroScene'
import { createDefaultForegroundConfig } from '../../modules/HeroScene'

export type { GridPosition, ForegroundElementConfig, ForegroundElementType }

/** @deprecated Use ForegroundLayerConfig from HeroScene instead */
export type ForegroundConfig = ForegroundLayerConfig

export const GRID_POSITIONS: GridPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]

// Element type → render order (lower = first)
const ELEMENT_ORDER: Record<ForegroundElementType, number> = {
  title: 0,
  description: 1,
}

// Element type → CSS class
const ELEMENT_CLASS: Record<ForegroundElementType, string> = {
  title: 'scp-title',
  description: 'scp-body',
}

// Element type → HTML tag
export const ELEMENT_TAG: Record<ForegroundElementType, 'h1' | 'p'> = {
  title: 'h1',
  description: 'p',
}

// ============================================================
// Output: Template-ready grouped data
// ============================================================
export interface PositionedElement {
  id: string
  type: ForegroundElementType
  content: string
  className: string
  tag: 'h1' | 'p'
  fontId?: string
  fontSize?: number
  colorKey?: HeroPrimitiveKey | 'auto'
}

export interface PositionedGroup {
  position: GridPosition
  elements: PositionedElement[]
}

// ============================================================
// Compile Function
// ============================================================
export function compileForegroundLayout(config: ForegroundConfig): PositionedGroup[] {
  // Filter visible elements
  const visibleElements = config.elements.filter(el => el.visible)

  // Group by position
  const groupMap = new Map<GridPosition, PositionedElement[]>()

  for (const el of visibleElements) {
    const existing = groupMap.get(el.position) ?? []
    existing.push({
      id: el.id,
      type: el.type,
      content: el.content,
      className: ELEMENT_CLASS[el.type],
      tag: ELEMENT_TAG[el.type],
      fontId: el.fontId,
      fontSize: el.fontSize,
      colorKey: el.colorKey,
    })
    groupMap.set(el.position, existing)
  }

  // Sort elements within each group by order
  for (const elements of groupMap.values()) {
    elements.sort((a, b) => ELEMENT_ORDER[a.type] - ELEMENT_ORDER[b.type])
  }

  // Convert to array
  const result: PositionedGroup[] = []
  for (const [position, elements] of groupMap) {
    result.push({ position, elements })
  }

  return result
}

// ============================================================
// Default Config
// ============================================================
export const DEFAULT_FOREGROUND_CONFIG: ForegroundConfig = createDefaultForegroundConfig()
