export type {
  RGBA,
  TextureRenderOptions,
  Viewport,
  TexturePattern,
  MaskShapeType,
  CircleMaskShapeConfig,
  RectMaskShapeConfig,
  BlobMaskShapeConfig,
  PerlinMaskShapeConfig,
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
  // Gradient / Noise
  ColorStop,
  LinearGradientPatternParams,
  GradientGrainPatternParams,
  GradientPatternParams,
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
  PerlinMaskShapeSchema,
  MaskShapeSchemas,
  // Surface Schemas
  StripeSurfaceSchema,
  GridSurfaceSchema,
  PolkaDotSurfaceSchema,
  CheckerSurfaceSchema,
  GradientGrainSurfaceSchema,
  SurfaceSchemas,
  // Factory functions
  createDefaultCircleMaskParams,
  createDefaultRectMaskParams,
  createDefaultBlobMaskParams,
  createDefaultPerlinMaskParams,
  createDefaultStripeParams,
  createDefaultGridParams,
  createDefaultPolkaDotParams,
  createDefaultCheckerParams,
  createDefaultGradientGrainParams,
} from './Schemas'
export type {
  CircleMaskShapeParams,
  RectMaskShapeParams,
  BlobMaskShapeParams,
  PerlinMaskShapeParams,
  StripeSurfaceParams,
  GridSurfaceParams,
  PolkaDotSurfaceParams,
  CheckerSurfaceParams,
  GradientGrainSurfaceParams,
} from './Schemas'
