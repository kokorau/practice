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

// Re-export Background Surface UseCase
export type {
  BackgroundSurfaceUsecase,
  BackgroundSurfaceUsecaseDeps,
  ImageUploadPort,
  SurfaceParamsUpdate,
} from './BackgroundSurfaceUsecase'
export { createBackgroundSurfaceUsecase } from './BackgroundSurfaceUsecase'

// Re-export Mask UseCase
export type {
  MaskUsecase,
  MaskUsecaseDeps,
  MaskShapeParamsUpdate,
  SurfaceParamsUpdate as MaskSurfaceParamsUpdate,
} from './MaskUsecase'
export { createMaskUsecase } from './MaskUsecase'

// Re-export Surface UseCase (unified)
export type {
  SurfaceUsecase,
  SurfaceUsecaseDeps,
  SelectionPort as SurfaceSelectionPort,
  SurfaceParamsUpdate as UnifiedSurfaceParamsUpdate,
  MaskShapeParamsUpdate as UnifiedMaskShapeParamsUpdate,
} from './SurfaceUsecase'
export { createSurfaceUsecase } from './SurfaceUsecase'

// Re-export Preset UseCase
export type { GetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'
export { createGetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'

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

// Re-export RenderSpec
export type {
  RenderSpecBase,
  TextureRenderSpec,
  ImageRenderSpec,
  SolidRenderSpec,
  TextRenderSpec,
  Object3DRenderSpec,
  ClipGroupRenderSpec,
  RenderSpec,
  RenderContext,
} from './RenderSpec'
export {
  toRenderSpecs,
  isTextureSpec,
  isImageSpec,
  isSolidSpec,
  isTextSpec,
  isObjectSpec,
  isClipGroupSpec,
} from './RenderSpec'
