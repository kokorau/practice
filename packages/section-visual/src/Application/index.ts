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
  MaskShapeParamsUpdate,
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
export type {
  SyncBackgroundSurfaceResult,
  SyncMaskSurfaceResult,
  SyncMaskShapeResult,
  SyncSurfaceParamsForLayerResult,
  SyncRawParamsResult,
  EffectRawParams,
} from './ConfigSyncer'
export {
  syncBackgroundSurfaceParams,
  syncMaskSurfaceParams,
  syncMaskShapeParams,
  syncSurfaceParamsForLayer,
  syncRawParams,
} from './ConfigSyncer'

// Re-export Processor UseCase
export type {
  ProcessorModifierType,
  ProcessorUsecase,
  ProcessorUsecaseDeps,
} from './ProcessorUsecase'
export { createProcessorUsecase } from './ProcessorUsecase'

// Re-export SelectProcessor UseCase
export type {
  SelectableProcessorType,
  EffectManagerPort,
  SelectProcessorResult,
  SelectProcessorUsecase,
  SelectProcessorUsecaseDeps,
} from './SelectProcessorUsecase'
export { createSelectProcessorUsecase } from './SelectProcessorUsecase'

// Re-export ApplyAnimatedPreset UseCase
export type {
  ForegroundConfigSyncPort,
  EffectManagerResetPort,
  ApplyAnimatedPresetResult,
  ApplyAnimatedPresetUsecase,
  ApplyAnimatedPresetUsecaseDeps,
} from './ApplyAnimatedPresetUsecase'
export { createApplyAnimatedPresetUsecase } from './ApplyAnimatedPresetUsecase'

// Re-export GetProcessorWithTarget UseCase
export type {
  ProcessorWithTarget,
  GetProcessorWithTargetUsecase,
} from './GetProcessorWithTargetUsecase'
export {
  createGetProcessorWithTargetUsecase,
  getProcessorWithTargetUsecase,
} from './GetProcessorWithTargetUsecase'

// Re-export compileHeroView
export type {
  CompileContext,
  IntensityProvider,
  ForegroundColorContext,
} from './compileHeroView'
export {
  compileHeroView,
  DEFAULT_INTENSITY_PROVIDER,
  createDefaultColorContext,
} from './compileHeroView'

// Re-export resolvers
export {
  resolveKeyToRgba,
  resolveKeyToCss,
  resolveKeyToOklch,
  resolveSurfaceColorKey,
  getCanvasSurfaceKey,
  getSurfaceKeyForContext,
  oklchToRgba,
  oklchToCss,
} from './resolvers/resolveColors'

export {
  resolveParams,
  resolvePropertyValue,
  resolvePropertyValueToNumber,
  resolvePropertyValueToString,
  resolvePropertyValueToBoolean,
} from './resolvers/resolvePropertyValue'

export type { FontResolver } from './resolvers/resolveForeground'
export {
  compileForegroundLayer,
  compileForegroundElement,
  resolveFontFamily,
  resolveElementColor,
  DEFAULT_FONT_RESOLVER,
} from './resolvers/resolveForeground'
