import type { Scene } from '@practice/lighting/Infra'
import type { OrthographicCamera, Color } from '@practice/lighting'

/**
 * Viewport configuration for HTML to Scene conversion
 */
export interface Viewport {
  /** Viewport width in pixels */
  readonly width: number
  /** Viewport height in pixels */
  readonly height: number
  /** Scroll offset X in pixels */
  readonly scrollX: number
  /** Scroll offset Y in pixels */
  readonly scrollY: number
}

/**
 * Parsed element data from DOM
 */
export interface ParsedElement {
  /** Bounding rect relative to viewport */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** Background color */
  readonly backgroundColor: Color
  /** Nesting depth (0 = root) */
  readonly depth: number
  /** Border radius in pixels (for rounded corners) */
  readonly borderRadius?: number
}

/**
 * Result of HTML to Scene conversion
 */
export interface HTMLToSceneResult {
  readonly scene: Scene
  readonly camera: OrthographicCamera
}

/**
 * Port interface for HTML to Scene conversion
 */
export interface HTMLToScenePort {
  /**
   * Parse DOM elements into scene objects
   */
  parseElements(root: HTMLElement, viewport: Viewport): ParsedElement[]

  /**
   * Convert parsed elements to Scene
   */
  toScene(elements: ParsedElement[], viewport: Viewport): HTMLToSceneResult
}
