import type { MaterialId } from './Material'
import type { SemanticColorToken } from './SemanticPalette'

/**
 * PreviewElement represents a parsed element from LayoutHtml
 * ready to be converted to a 3D object.
 */
export type PreviewElement = {
  /** Unique identifier for this element */
  readonly id: string
  /** Bounding rect in viewport coordinates */
  readonly bounds: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  /** Z-depth (from data-elevation or nesting depth) */
  readonly depth: number
  /** Thickness (from data-thickness) */
  readonly thickness: number
  /** Material type */
  readonly material: MaterialId
  /** Background color token (if set via data-bg-color) */
  readonly bgColorToken?: SemanticColorToken
  /** Text color token (if set via data-text-color) */
  readonly textColorToken?: SemanticColorToken
  /** Border color token (if set via data-border-color) */
  readonly borderColorToken?: SemanticColorToken
  /** Border radius in pixels */
  readonly borderRadius?: number
  /** Surface type */
  readonly surface?: 'base' | 'elevated'
}

/**
 * PreviewElementTree holds all parsed elements in hierarchy.
 */
export type PreviewElementTree = {
  readonly elements: ReadonlyArray<PreviewElement>
  /** Root element IDs */
  readonly roots: ReadonlyArray<string>
  /** Parent-child relationships */
  readonly children: ReadonlyMap<string, ReadonlyArray<string>>
}

export const $PreviewElement = {
  create: undefined as unknown as (params: {
    id: string
    bounds: PreviewElement['bounds']
    depth?: number
    thickness?: number
    material?: MaterialId
    bgColorToken?: SemanticColorToken
    textColorToken?: SemanticColorToken
    borderColorToken?: SemanticColorToken
    borderRadius?: number
    surface?: 'base' | 'elevated'
  }) => PreviewElement,
}

export const $PreviewElementTree = {
  create: undefined as unknown as (
    elements: PreviewElement[],
    roots: string[],
    children: Map<string, string[]>
  ) => PreviewElementTree,

  fromLayoutHtml: undefined as unknown as (
    html: import('./LayoutHtml').LayoutHtml
  ) => PreviewElementTree,
}
