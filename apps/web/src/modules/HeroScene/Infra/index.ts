/**
 * HeroScene Infrastructure Layer
 *
 * WebGPU実装とリポジトリ実装
 */

export { TextTextureRenderer, createTextTextureRenderer } from './TextTextureRenderer'
export type { TextTextureRendererConfig } from './TextTextureRenderer'

export { HeroSceneRenderer, createHeroSceneRenderer } from './HeroSceneRenderer'
export type { HeroSceneRendererDeps } from './HeroSceneRenderer'

export { createInMemoryHeroViewPresetRepository } from './InMemoryHeroViewPresetRepository'
export { createHeroViewInMemoryRepository } from './HeroViewInMemoryRepository'

export { createHeroViewInMemoryRepository } from './HeroView'

export {
  ThreeJsObject3DRenderer,
  createObject3DRenderer,
} from './ThreeJsObject3DRenderer'

export { renderHeroConfig } from './renderHeroConfig'
export type { RenderHeroConfigOptions, TextureRendererLike } from './renderHeroConfig'

export { createBrowserPresetExporter } from './Preset'
