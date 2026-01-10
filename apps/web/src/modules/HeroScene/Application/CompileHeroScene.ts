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
  ClipGroupLayerConfig,
  ImageLayerConfig,
  TextLayerConfig,
} from '../Domain'
import type {
  HeroSceneEditorState,
  EditorCanvasLayer,
  EditorTextureLayerConfig,
  EditorClipGroupLayerConfig,
} from './EditorState'
import type {
  TexturePattern,
  MaskPattern,
  RGBA,
  Viewport,
  TexturePatternSpec,
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
 * EditorClipGroupLayerConfigをClipGroupLayerConfigにコンパイル
 * TODO: Phase 3以降で本格実装
 */
const compileClipGroupLayer = (
  config: EditorClipGroupLayerConfig,
  _editorState: HeroSceneEditorState,
  _options: CompileOptions
): ClipGroupLayerConfig | null => {
  // Placeholder implementation
  // Full implementation will be done in later phases
  return {
    type: 'clipGroup',
    mask: {
      shape: config.maskShape,
      shapeParams: config.maskShapeParams,
      invert: config.maskInvert,
      feather: config.maskFeather,
    },
    childIds: config.childIds,
  }
}

/**
 * EditorCanvasLayerをCanvasLayerにコンパイル
 */
const compileCanvasLayer = (
  editorLayer: EditorCanvasLayer,
  editorState: HeroSceneEditorState,
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
    case 'clipGroup': {
      const compiled = compileClipGroupLayer(editorLayer.config, editorState, options)
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
    case 'object': {
      // 3D object layers are not yet implemented
      return null
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
    const compiled = compileCanvasLayer(editorLayer, editorState, options)
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
