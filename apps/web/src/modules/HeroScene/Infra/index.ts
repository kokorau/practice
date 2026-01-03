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
