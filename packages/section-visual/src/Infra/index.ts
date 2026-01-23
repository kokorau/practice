/**
 * HeroScene Infrastructure Layer
 *
 * WebGPU実装とリポジトリ実装
 */

export { createInMemoryHeroViewPresetRepository, DEFAULT_PRESETS } from './InMemoryHeroViewPresetRepository'
export { createHeroViewInMemoryRepository } from './HeroViewInMemoryRepository'
export { createHeroEditorInMemoryRepository } from './HeroEditorInMemoryRepository'
export type { CreateHeroEditorRepositoryOptions } from './HeroEditorInMemoryRepository'

export {
  ThreeJsObject3DRenderer,
  createObject3DRenderer,
} from './ThreeJsObject3DRenderer'

export { renderHeroConfig } from './renderHeroConfig'
export type { RenderHeroConfigOptions, TextureRendererLike } from './renderHeroConfig'

export { createEffectSpecsForPreview } from './createEffectSpecsForPreview'
export { createMaskPreviewConfig } from './createMaskPreviewConfig'
export type { CreateMaskPreviewConfigOptions } from './createMaskPreviewConfig'
export { createSurfacePreviewConfig } from './createSurfacePreviewConfig'
export type { CreateSurfacePreviewConfigOptions } from './createSurfacePreviewConfig'

export { createBrowserPresetExporter } from './Preset'

// ============================================================
// Compositor Pipeline (for thumbnail/preview rendering)
// ============================================================

export { buildPipeline, type PipelineResult } from './Compositor/buildPipeline'
export { executePipeline, renderWithPipeline, type ExecutePipelineOptions } from './Compositor/executePipeline'

// ============================================================
// Shader Registry (UUID-based shader system)
// ============================================================

export {
  // Singleton instance
  shaderRegistry,
  ShaderRegistry,
  // Built-in shader IDs
  SURFACE_SHADER_IDS,
  MASK_SHADER_IDS,
  EFFECT_SHADER_IDS,
  // Built-in shader definitions
  SURFACE_SHADERS,
  MASK_SHADERS,
  EFFECT_SHADERS,
  // Resolver functions
  resolveShader,
  resolveShaderWithParams,
  convertToShaderRef,
  convertToLegacyRef,
} from './ShaderRegistry'
