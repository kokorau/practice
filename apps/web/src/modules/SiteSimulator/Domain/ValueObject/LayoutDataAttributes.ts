import type { MaterialId } from './Material'
import type { SemanticColorToken } from './SemanticPalette'

/**
 * LayoutDataAttributes defines the allowed data-* attributes
 * that can be used in HTML templates for styling hooks.
 */
export type LayoutDataAttributes = {
  /** Background color: references SemanticColorToken */
  readonly 'data-bg-color'?: SemanticColorToken

  /** Text color: references SemanticColorToken */
  readonly 'data-text-color'?: SemanticColorToken

  /** Border color: references SemanticColorToken */
  readonly 'data-border-color'?: SemanticColorToken

  /**
   * Surface semantic meaning
   * - "base": page background
   * - "elevated": card, modal
   */
  readonly 'data-surface'?: 'base' | 'elevated'

  /** Material type (affects shadow/reflection) */
  readonly 'data-material'?: MaterialId

  /** Thickness: 0=flat, 1=standard, 2+=thicker */
  readonly 'data-thickness'?: number

  /** Elevation: 0=flat, 1=slightly raised, 2+=more elevated */
  readonly 'data-elevation'?: number

  /**
   * Layout direction for children
   * - "stack-vertical": stack top to bottom
   * - "stack-horizontal": stack left to right
   * - "inline": normal inline flow
   */
  readonly 'data-layout'?: 'stack-vertical' | 'stack-horizontal' | 'inline'
}

/**
 * Type for data attribute names (keys of LayoutDataAttributes).
 */
export type LayoutDataAttributeName = keyof LayoutDataAttributes
