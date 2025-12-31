// ============================================================
// Grid Position (3x3 = 9箇所)
// ============================================================
export type GridPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export const GRID_POSITIONS: GridPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]

// ============================================================
// Foreground Element Types
// ============================================================
export type ForegroundElementType = 'title' | 'description'

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
// Input: Editor Config (Fixed structure)
// ============================================================
export interface ForegroundElementConfig {
  position: GridPosition
  content: string
  fontId?: string // Optional font preset ID
}

export interface ForegroundConfig {
  title: ForegroundElementConfig
  description: ForegroundElementConfig
}

// ============================================================
// Output: Template-ready grouped data
// ============================================================
export interface PositionedElement {
  type: ForegroundElementType
  content: string
  className: string
  tag: 'h1' | 'p'
  fontId?: string
}

export interface PositionedGroup {
  position: GridPosition
  elements: PositionedElement[]
}

// ============================================================
// Compile Function
// ============================================================
export function compileForegroundLayout(config: ForegroundConfig): PositionedGroup[] {
  // Collect all elements with their types
  const allElements: Array<{ type: ForegroundElementType; config: ForegroundElementConfig }> = [
    { type: 'title', config: config.title },
    { type: 'description', config: config.description },
  ]

  // Group by position
  const groupMap = new Map<GridPosition, PositionedElement[]>()

  for (const { type, config: elConfig } of allElements) {
    const existing = groupMap.get(elConfig.position) ?? []
    existing.push({
      type,
      content: elConfig.content,
      className: ELEMENT_CLASS[type],
      tag: ELEMENT_TAG[type],
      fontId: elConfig.fontId,
    })
    groupMap.set(elConfig.position, existing)
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
export const DEFAULT_FOREGROUND_CONFIG: ForegroundConfig = {
  title: { position: 'middle-center', content: 'Build Amazing' },
  description: { position: 'middle-center', content: 'Create beautiful, responsive websites.\nDesign with confidence.' },
}
