/**
 * CompileHeroScene
 *
 * EditorStateをHeroSceneにコンパイルする
 * patternIndexを解決してTexturePatternSpecを生成
 */

import type {
  HeroScene,
  CanvasLayer,
  TextureLayerConfig,
  MaskedTextureLayerConfig,
  ImageLayerConfig,
  TextLayerConfig,
} from '../Domain'
import type {
  HeroSceneEditorState,
  EditorCanvasLayer,
  EditorTextureLayerConfig,
  EditorMaskedTextureLayerConfig,
} from './EditorState'
import type {
  TexturePattern,
  MaskPattern,
  RGBA,
  Viewport,
  TexturePatternSpec,
  TextureRenderSpec,
} from '@practice/texture'

// ============================================================
// Midground Texture Pattern (local definition for compilation)
// ============================================================

/**
 * Midground texture pattern definition
 */
export interface MidgroundTexturePattern {
  label: string
  type: 'stripe' | 'grid' | 'polkaDot'
  config: {
    width1?: number
    width2?: number
    angle?: number
    lineWidth?: number
    cellSize?: number
    dotRadius?: number
    spacing?: number
    rowOffset?: number
  }
}

// ============================================================
// Pattern Maps (for compilation)
// ============================================================

/**
 * コンパイルに必要なパターンマップ
 */
export interface PatternMaps {
  texturePatterns: TexturePattern[]
  maskPatterns: MaskPattern[]
  midgroundTexturePatterns: MidgroundTexturePattern[]
}

/**
 * コンパイル時のカラー設定
 */
export interface CompileColors {
  textureColor1: RGBA
  textureColor2: RGBA
  maskInnerColor: RGBA
  maskOuterColor: RGBA
  midgroundTextureColor1: RGBA
  midgroundTextureColor2: RGBA
}

/**
 * コンパイルオプション
 */
export interface CompileOptions {
  maps: PatternMaps
  colors: CompileColors
  viewport: Viewport
  /** マスク+テクスチャのspec生成関数 */
  createMaskedTextureSpec: (
    maskPattern: MaskPattern,
    texturePattern: MidgroundTexturePattern,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ) => TextureRenderSpec | null
}

// ============================================================
// Compile Functions
// ============================================================

/**
 * EditorTextureLayerConfigをTextureLayerConfigにコンパイル
 */
const compileTextureLayer = (
  config: EditorTextureLayerConfig,
  options: CompileOptions
): TextureLayerConfig | null => {
  const pattern = options.maps.texturePatterns[config.patternIndex]
  if (!pattern) return null

  const renderSpec = pattern.createSpec(
    options.colors.textureColor1,
    options.colors.textureColor2,
    options.viewport
  )

  // TexturePatternのparamsを推測（実際はcreateSpec内部で使用される）
  // TODO: TexturePatternにparams情報を追加して直接取得できるようにする
  const spec: TexturePatternSpec = {
    shader: renderSpec.shader,
    bufferSize: renderSpec.bufferSize,
    blend: renderSpec.blend,
    params: {
      type: 'solid',
      color: options.colors.textureColor1,
    }, // Placeholder - need pattern metadata
  }

  return {
    type: 'texture',
    spec,
  }
}

/**
 * EditorMaskedTextureLayerConfigをMaskedTextureLayerConfigにコンパイル
 */
const compileMaskedTextureLayer = (
  config: EditorMaskedTextureLayerConfig,
  options: CompileOptions
): MaskedTextureLayerConfig | null => {
  const maskPattern = options.maps.maskPatterns[config.maskIndex]
  if (!maskPattern) return null

  let renderSpec: TextureRenderSpec

  if (config.textureIndex !== null) {
    const texturePattern = options.maps.midgroundTexturePatterns[config.textureIndex]
    if (texturePattern) {
      const maskedSpec = options.createMaskedTextureSpec(
        maskPattern,
        texturePattern,
        options.colors.midgroundTextureColor1,
        options.colors.midgroundTextureColor2,
        options.viewport
      )
      if (maskedSpec) {
        renderSpec = maskedSpec
      } else {
        // Fallback to solid mask
        renderSpec = maskPattern.createSpec(
          options.colors.maskInnerColor,
          options.colors.maskOuterColor,
          options.viewport
        )
      }
    } else {
      // Texture not found, fallback to solid mask
      renderSpec = maskPattern.createSpec(
        options.colors.maskInnerColor,
        options.colors.maskOuterColor,
        options.viewport
      )
    }
  } else {
    // No texture, use solid mask
    renderSpec = maskPattern.createSpec(
      options.colors.maskInnerColor,
      options.colors.maskOuterColor,
      options.viewport
    )
  }

  const spec: TexturePatternSpec = {
    shader: renderSpec.shader,
    bufferSize: renderSpec.bufferSize,
    blend: renderSpec.blend,
    params: {
      type: 'circleMask',
      innerColor: options.colors.maskInnerColor,
      outerColor: options.colors.maskOuterColor,
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.3,
    }, // Placeholder
  }

  return {
    type: 'maskedTexture',
    spec,
  }
}

/**
 * EditorCanvasLayerをCanvasLayerにコンパイル
 */
const compileCanvasLayer = (
  editorLayer: EditorCanvasLayer,
  options: CompileOptions
): CanvasLayer | null => {
  let config: CanvasLayer['config']

  switch (editorLayer.config.type) {
    case 'texture': {
      const compiled = compileTextureLayer(editorLayer.config, options)
      if (!compiled) return null
      config = compiled
      break
    }
    case 'maskedTexture': {
      const compiled = compileMaskedTextureLayer(editorLayer.config, options)
      if (!compiled) return null
      config = compiled
      break
    }
    case 'image': {
      config = editorLayer.config as ImageLayerConfig
      break
    }
    case 'text': {
      config = editorLayer.config as TextLayerConfig
      break
    }
  }

  return {
    id: editorLayer.id,
    name: editorLayer.name,
    visible: editorLayer.visible,
    opacity: editorLayer.opacity,
    zIndex: editorLayer.zIndex,
    blendMode: editorLayer.blendMode,
    filters: editorLayer.filters,
    config,
  }
}

/**
 * HeroSceneEditorStateをHeroSceneにコンパイル
 *
 * @param editorState エディタ状態
 * @param options コンパイルオプション（パターンマップ、カラー、viewport）
 * @returns コンパイル済みHeroScene
 */
export const compileHeroScene = (
  editorState: HeroSceneEditorState,
  options: CompileOptions
): HeroScene => {
  const canvasLayers: CanvasLayer[] = []

  for (const editorLayer of editorState.canvasLayers) {
    const compiled = compileCanvasLayer(editorLayer, options)
    if (compiled) {
      canvasLayers.push(compiled)
    }
  }

  return {
    config: editorState.config,
    canvasLayers: canvasLayers.sort((a, b) => a.zIndex - b.zIndex),
    htmlLayer: editorState.htmlLayer,
  }
}
