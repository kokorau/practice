/**
 * CompiledHeroView
 *
 * 描画に必要なすべての情報が解決済みの状態で保持される型。
 * - パレットキー('B', 'BN9', 'auto'等) → 解決済みRGBA/CSS値
 * - PropertyValue(static/range) → 解決済み数値
 * - フォントID → 解決済みフォントファミリー名
 *
 * HeroPreviewはこの型を受け取り、描画するだけ（ロジックなし）。
 */

import type { RGBA } from '@practice/texture'
import type {
  GridPosition,
  ForegroundElementType,
  SurfaceType,
  MaskShapeTypeId,
  GroupBlendMode,
} from './HeroViewConfig'
import type { EffectType } from './EffectRegistry'

// ============================================================
// Compiled Foreground Types (HTML Layer - CSS色)
// ============================================================

/**
 * Compiled foreground element with all values resolved
 */
export interface CompiledForegroundElement {
  id: string
  type: ForegroundElementType
  visible: boolean
  position: GridPosition
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  /** Resolved CSS color string (e.g., "oklch(0.5 0.1 180)") */
  color: string
}

/**
 * Compiled foreground layer with all elements resolved
 */
export interface CompiledForegroundLayer {
  elements: CompiledForegroundElement[]
}

// ============================================================
// Compiled Surface Types (WebGPU Layer - RGBA色)
// ============================================================

/**
 * Compiled surface with all parameters and colors resolved
 */
export interface CompiledSurface {
  id: SurfaceType
  /** All parameters resolved to concrete values */
  params: Record<string, number | string | boolean>
  /** Resolved primary color */
  color1: RGBA
  /** Resolved secondary color */
  color2: RGBA
}

// ============================================================
// Compiled Mask Types
// ============================================================

/**
 * Compiled mask shape with all parameters resolved
 * @deprecated Use children-based mask instead
 */
export interface CompiledMaskShape {
  id: MaskShapeTypeId
  /** All parameters resolved to concrete values */
  params: Record<string, number | string | boolean>
}

// CompiledMaskChildren is an array of compiled layer nodes used as mask source
// Uses CompiledLayerNode type (defined below) - TypeScript handles circular references
export type CompiledMaskChildren = CompiledLayerNode[]

/**
 * Compiled mask processor
 *
 * Uses children-based mask source. The children layers are rendered
 * to a black background, then converted to luminance-based greymap.
 */
export interface CompiledMaskProcessor {
  type: 'mask'
  enabled: boolean
  /** @deprecated Use children instead. Legacy compiled mask shape. */
  shape?: CompiledMaskShape
  /** Compiled layer tree used as mask source */
  children: CompiledMaskChildren
  feather: number
}

// ============================================================
// Compiled Effect Types
// ============================================================

/**
 * Compiled effect with all parameters resolved
 */
export interface CompiledEffect {
  type: 'effect'
  id: EffectType
  /** All parameters resolved to concrete values */
  params: Record<string, number | string | boolean>
}

/**
 * Compiled processor config (effect or mask)
 */
export type CompiledProcessorConfig = CompiledEffect | CompiledMaskProcessor

// ============================================================
// Compiled Layer Node Types
// ============================================================

interface CompiledLayerNodeBase {
  id: string
  name: string
  visible: boolean
}

/**
 * Compiled surface layer node
 */
export interface CompiledSurfaceLayerNode extends CompiledLayerNodeBase {
  type: 'surface'
  surface: CompiledSurface
}

/**
 * Compiled text layer node
 */
export interface CompiledTextLayerNode extends CompiledLayerNodeBase {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  /** Resolved RGBA color */
  color: RGBA
  position: { x: number; y: number; anchor: string }
  rotation: number
}

/**
 * Compiled image layer node
 */
export interface CompiledImageLayerNode extends CompiledLayerNodeBase {
  type: 'image'
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

/**
 * Compiled group layer node
 */
export interface CompiledGroupLayerNode extends CompiledLayerNodeBase {
  type: 'group'
  children: CompiledLayerNode[]
  blendMode?: GroupBlendMode
}

/**
 * Compiled processor layer node
 */
export interface CompiledProcessorLayerNode extends CompiledLayerNodeBase {
  type: 'processor'
  modifiers: CompiledProcessorConfig[]
}

/**
 * Union of all compiled layer node types
 */
export type CompiledLayerNode =
  | CompiledSurfaceLayerNode
  | CompiledTextLayerNode
  | CompiledImageLayerNode
  | CompiledGroupLayerNode
  | CompiledProcessorLayerNode

// ============================================================
// CompiledHeroView (Main Export)
// ============================================================

/**
 * Compiled HeroView with all references resolved
 *
 * This is the "source of truth" for rendering:
 * - All palette keys resolved to actual RGBA/CSS colors
 * - All PropertyValue (static/range) resolved to concrete numbers
 * - All font IDs resolved to font family names
 *
 * Two-Pass Compilation:
 * 1. First pass: Compile all non-'auto' values, use fallback for 'auto' colors
 * 2. Render to canvas
 * 3. Second pass: Re-compile with canvasImageData to resolve 'auto' colors
 * 4. Final render with fully resolved colors
 */
export interface CompiledHeroView {
  /** Viewport dimensions */
  viewport: {
    width: number
    height: number
  }

  /** Whether dark theme is active */
  isDark: boolean

  /** Compiled layer tree for WebGPU rendering (colors as RGBA) */
  layers: CompiledLayerNode[]

  /** Compiled foreground layer for HTML rendering (colors as CSS strings) */
  foreground: CompiledForegroundLayer
}

// ============================================================
// Type Guards
// ============================================================

export function isCompiledSurfaceLayerNode(
  node: CompiledLayerNode
): node is CompiledSurfaceLayerNode {
  return node.type === 'surface'
}

export function isCompiledTextLayerNode(
  node: CompiledLayerNode
): node is CompiledTextLayerNode {
  return node.type === 'text'
}

export function isCompiledImageLayerNode(
  node: CompiledLayerNode
): node is CompiledImageLayerNode {
  return node.type === 'image'
}

export function isCompiledGroupLayerNode(
  node: CompiledLayerNode
): node is CompiledGroupLayerNode {
  return node.type === 'group'
}

export function isCompiledProcessorLayerNode(
  node: CompiledLayerNode
): node is CompiledProcessorLayerNode {
  return node.type === 'processor'
}

export function isCompiledEffect(
  config: CompiledProcessorConfig
): config is CompiledEffect {
  return config.type === 'effect'
}

export function isCompiledMaskProcessor(
  config: CompiledProcessorConfig
): config is CompiledMaskProcessor {
  return config.type === 'mask'
}
