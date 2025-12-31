export type {
  RGBA,
  TextureRenderOptions,
  Viewport,
  TexturePattern,
  MaskShapeType,
  CircleMaskShapeConfig,
  RectMaskShapeConfig,
  BlobMaskShapeConfig,
  MaskShapeConfig,
  MaskPattern,
} from './TexturePattern'
export type {
  SurfacePresetType,
  SolidPresetParams,
  StripePresetParams,
  GridPresetParams,
  PolkaDotPresetParams,
  CheckerPresetParams,
  SurfacePresetParams,
  SurfacePreset,
} from './SurfacePreset'
export type { TextureRenderSpec } from './TextureRenderSpec'
export type {
  // Simple textures
  SolidPatternParams,
  StripePatternParams,
  GridPatternParams,
  PolkaDotPatternParams,
  SimpleTexturePatternParams,
  // Masks
  CircleMaskPatternParams,
  RectMaskPatternParams,
  MaskPatternParams,
  // Masked textures
  CircleStripePatternParams,
  CircleGridPatternParams,
  CirclePolkaDotPatternParams,
  RectStripePatternParams,
  RectGridPatternParams,
  RectPolkaDotPatternParams,
  BlobStripePatternParams,
  BlobGridPatternParams,
  BlobPolkaDotPatternParams,
  MaskedTexturePatternParams,
  // Filters
  VignettePatternParams,
  ChromaticAberrationPatternParams,
  FilterPatternParams,
  // Union
  TexturePatternParams,
  // Spec
  TexturePatternSpec,
  CreateUniformsFn,
} from './TexturePatternSpec'

// Shape and Surface Schemas
export {
  // Shape Schemas
  CircleMaskShapeSchema,
  RectMaskShapeSchema,
  BlobMaskShapeSchema,
  MaskShapeSchemas,
  // Surface Schemas
  StripeSurfaceSchema,
  GridSurfaceSchema,
  PolkaDotSurfaceSchema,
  CheckerSurfaceSchema,
  SurfaceSchemas,
  // Factory functions
  createDefaultCircleMaskParams,
  createDefaultRectMaskParams,
  createDefaultBlobMaskParams,
  createDefaultStripeParams,
  createDefaultGridParams,
  createDefaultPolkaDotParams,
  createDefaultCheckerParams,
} from './Schemas'
export type {
  CircleMaskShapeParams,
  RectMaskShapeParams,
  BlobMaskShapeParams,
  StripeSurfaceParams,
  GridSurfaceParams,
  PolkaDotSurfaceParams,
  CheckerSurfaceParams,
} from './Schemas'
