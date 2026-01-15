/**
 * HeroScene Application Layer
 *
 * レイヤーレンダリングのポート（インターフェース）とユースケース
 * エディタ状態とコンパイル機能
 */

// Re-export Ports
export type {
  HeroViewPresetRepository,
  Object3DRendererPort,
  Object3DRenderParams,
  LightingConfig,
  HeroViewRepository,
  LayerUpdate,
} from './ports'

// Re-export Surface UseCase (unified)
export type {
  SurfaceUsecase,
  SurfaceUsecaseDeps,
  SelectionPort as SurfaceSelectionPort,
  ImageUploadPort,
  SurfaceParamsUpdate,
} from './SurfaceUsecase'
export { createSurfaceUsecase } from './SurfaceUsecase'

// Re-export Preset UseCase
export type { GetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'
export { createGetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'

// Re-export PresetManager
export type { MergeMode, PresetManagerOptions } from './PresetManager'
export { PresetManager, createPresetManager } from './PresetManager'

// Re-export ForegroundElement UseCase
export type {
  ForegroundElementUpdate,
  ForegroundConfigPort,
  SelectionPort,
  ForegroundElementUsecase,
  ForegroundElementUsecaseDeps,
} from './ForegroundElementUsecase'
export { createForegroundElementUsecase } from './ForegroundElementUsecase'

// Re-export ConfigSyncer
export type { SyncBackgroundSurfaceResult, SyncMaskSurfaceResult } from './ConfigSyncer'
export { syncBackgroundSurfaceParams, syncMaskSurfaceParams } from './ConfigSyncer'
