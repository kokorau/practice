/**
 * ForegroundLayout
 *
 * Pure layout functions for foreground elements.
 * Groups and positions elements for template rendering.
 */

import type {
  GridPosition,
  ForegroundElementType,
  ForegroundLayerConfig,
  HeroPrimitiveKey,
} from './HeroViewConfig'
import type { CompiledForegroundLayer } from './CompiledHeroView'

// ============================================================
// Constants
// ============================================================

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
// Output Types
// ============================================================

/**
 * Positioned element with unresolved values (fontId, colorKey)
 */
export interface PositionedElement {
  id: string
  type: ForegroundElementType
  content: string
  className: string
  tag: 'h1' | 'p'
  fontId?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  colorKey?: HeroPrimitiveKey | 'auto'
}

/**
 * Group of positioned elements at a grid position
 */
export interface PositionedGroup {
  position: GridPosition
  elements: PositionedElement[]
}

/**
 * Positioned element from CompiledForegroundElement
 * All values are pre-resolved (fontFamily, color as CSS)
 */
export interface CompiledPositionedElement {
  id: string
  type: ForegroundElementType
  content: string
  className: string
  tag: 'h1' | 'p'
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
}

/**
 * Group of compiled positioned elements at a grid position
 */
export interface CompiledPositionedGroup {
  position: GridPosition
  elements: CompiledPositionedElement[]
}

// ============================================================
// Compile Functions
// ============================================================

/**
 * Compile foreground config into positioned groups
 * Groups elements by grid position and sorts by element order
 *
 * @param config - Foreground layer configuration
 * @returns Array of positioned groups
 */
export function compileForegroundLayout(config: ForegroundLayerConfig): PositionedGroup[] {
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
      fontWeight: el.fontWeight,
      letterSpacing: el.letterSpacing,
      lineHeight: el.lineHeight,
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

/**
 * Layout compiled foreground elements into positioned groups
 * Works with pre-resolved CompiledForegroundLayer
 *
 * @param foreground - Compiled foreground layer
 * @returns Array of compiled positioned groups
 */
export function layoutCompiledForeground(foreground: CompiledForegroundLayer): CompiledPositionedGroup[] {
  // Filter visible elements
  const visibleElements = foreground.elements.filter(el => el.visible)

  // Group by position
  const groupMap = new Map<GridPosition, CompiledPositionedElement[]>()

  for (const el of visibleElements) {
    const existing = groupMap.get(el.position) ?? []
    existing.push({
      id: el.id,
      type: el.type,
      content: el.content,
      className: ELEMENT_CLASS[el.type],
      tag: ELEMENT_TAG[el.type],
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      letterSpacing: el.letterSpacing,
      lineHeight: el.lineHeight,
      color: el.color,
    })
    groupMap.set(el.position, existing)
  }

  // Sort elements within each group by order
  for (const elements of groupMap.values()) {
    elements.sort((a, b) => ELEMENT_ORDER[a.type] - ELEMENT_ORDER[b.type])
  }

  // Convert to array
  const result: CompiledPositionedGroup[] = []
  for (const [position, elements] of groupMap) {
    result.push({ position, elements })
  }

  return result
}
