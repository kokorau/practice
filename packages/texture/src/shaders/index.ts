export {
  fullscreenVertex,
  aaUtils,
  maskBlendState,
  hash21,
  hash22,
  interleavedGradientNoise,
  valueNoise,
  fbm,
  noiseUtils,
  depthMapUtils,
  depthMapTypeToNumber,
  type DepthMapType,
} from './common'
export { imageShader } from './image'
export {
  positionedImageShader,
  createPositionedImageSpec,
  anchorToNumbers,
  type PositionedImageParams,
} from './positionedImage'
export { solidShader, createSolidSpec, type SolidTextureParams } from './solid'
export { stripeShader, createStripeSpec, type StripeTextureParams } from './stripe'
export { gridShader, createGridSpec, type GridTextureParams } from './grid'
export { polkaDotShader, createPolkaDotSpec, type PolkaDotTextureParams } from './polkaDot'
export { checkerShader, createCheckerSpec, type CheckerTextureParams } from './checker'
export { triangleShader, createTriangleSpec, type TriangleTextureParams } from './triangle'
export { hexagonShader, createHexagonSpec, type HexagonTextureParams } from './hexagon'
export {
  circleMaskShader,
  rectMaskShader,
  perlinMaskShader,
  linearGradientMaskShader,
  radialGradientMaskShader,
  boxGradientMaskShader,
  createCircleMaskSpec,
  createRectMaskSpec,
  createPerlinMaskSpec,
  createLinearGradientMaskSpec,
  createRadialGradientMaskSpec,
  createBoxGradientMaskSpec,
  type CircleMaskParams,
  type RectMaskParams,
  type PerlinMaskParams,
  type LinearGradientMaskParams,
  type RadialGradientMaskParams,
  type BoxGradientMaskParams,
} from './mask'
export { blobMaskShader, createBlobMaskSpec, type BlobMaskParams } from './blob'
export {
  // Clip mask shaders
  circleClipShader,
  rectClipShader,
  blobClipShader,
  perlinClipShader,
  linearGradientClipShader,
  radialGradientClipShader,
  boxGradientClipShader,
  // Clip mask spec creators
  createCircleClipSpec,
  createRectClipSpec,
  createBlobClipSpec,
  createPerlinClipSpec,
  createLinearGradientClipSpec,
  createRadialGradientClipSpec,
  createBoxGradientClipSpec,
  createClipMaskSpec,
  // Clip mask types
  type ClipMaskBaseParams,
  type CircleClipParams,
  type RectClipParams,
  type BlobClipParams,
  type PerlinClipParams,
  type LinearGradientClipParams,
  type RadialGradientClipParams,
  type BoxGradientClipParams,
  type ClipMaskParams,
} from './clipMask'
// Legacy vignette export (for backward compatibility)
export {
  vignetteShader,
  createVignetteUniforms,
  VIGNETTE_BUFFER_SIZE,
  type VignetteParams,
} from './vignette'
// New vignette shape variants
export {
  ellipseVignetteShader,
  createEllipseVignetteUniforms,
  ELLIPSE_VIGNETTE_BUFFER_SIZE,
  type EllipseVignetteParams,
} from './vignette-ellipse'
export {
  circleVignetteShader,
  createCircleVignetteUniforms,
  CIRCLE_VIGNETTE_BUFFER_SIZE,
  type CircleVignetteParams,
} from './vignette-circle'
export {
  rectVignetteShader,
  createRectVignetteUniforms,
  RECT_VIGNETTE_BUFFER_SIZE,
  type RectVignetteParams,
} from './vignette-rect'
export {
  linearVignetteShader,
  createLinearVignetteUniforms,
  LINEAR_VIGNETTE_BUFFER_SIZE,
  type LinearVignetteParams,
} from './vignette-linear'
export {
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  type ChromaticAberrationParams,
} from './chromaticAberration'
export {
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createCircleCheckerSpec,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createRectCheckerSpec,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
  createBlobCheckerSpec,
  createPerlinStripeSpec,
  createPerlinGridSpec,
  createPerlinPolkaDotSpec,
  createPerlinCheckerSpec,
  // Masked GradientGrain
  createCircleGradientGrainSpec,
  createRectGradientGrainSpec,
  createBlobGradientGrainSpec,
  type MaskType,
  type TextureType,
  type CircleMaskConfig,
  type RectMaskConfig,
  type BlobMaskConfig,
  type PerlinMaskConfig,
  type MaskConfig,
  type StripeTextureConfig,
  type GridTextureConfig,
  type PolkaDotTextureConfig,
  type CheckerTextureConfig,
  type TextureConfig,
  type MaskedTextureParams,
  type GradientGrainTextureConfig,
} from './maskedTexture'
export {
  linearGradientShader,
  createLinearGradientSpec,
  LINEAR_GRADIENT_BUFFER_SIZE,
  type LinearGradientParams,
  type ColorStop,
} from './linearGradient'
export {
  gradientGrainShader,
  createGradientGrainSpec,
  GRADIENT_GRAIN_BUFFER_SIZE,
  type GradientGrainParams,
} from './gradientGrain'
export {
  linearDepthMapShader,
  createLinearDepthMapSpec,
  LINEAR_DEPTH_MAP_BUFFER_SIZE,
  type LinearDepthMapParams,
} from './linearDepthMap'
export {
  circularDepthMapShader,
  createCircularDepthMapSpec,
  CIRCULAR_DEPTH_MAP_BUFFER_SIZE,
  type CircularDepthMapParams,
} from './circularDepthMap'
export {
  radialDepthMapShader,
  createRadialDepthMapSpec,
  RADIAL_DEPTH_MAP_BUFFER_SIZE,
  type RadialDepthMapParams,
} from './radialDepthMap'
export {
  noiseMapShader,
  createNoiseMapSpec,
  NOISE_MAP_BUFFER_SIZE,
  type NoiseMapParams,
} from './noiseMap'
export {
  gradientNoiseMapShader,
  createGradientNoiseMapSpec,
  GRADIENT_NOISE_MAP_BUFFER_SIZE,
  type GradientNoiseMapParams,
} from './gradientNoiseMap'
export {
  intensityCurveShader,
  createIntensityCurveSpec,
  INTENSITY_CURVE_BUFFER_SIZE,
  type IntensityCurveParams,
} from './intensityCurve'
export {
  perlinDepthMapShader,
  createPerlinDepthMapSpec,
  PERLIN_DEPTH_MAP_BUFFER_SIZE,
  type PerlinDepthMapParams,
} from './perlinDepthMap'
export { asanohaShader, createAsanohaSpec, type AsanohaTextureParams } from './asanoha'
export { seigaihaShader, createSeigaihaSpec, type SeigaihaTextureParams } from './seigaiha'
export { waveShader, createWaveSpec, type WaveTextureParams } from './wave'
export { scalesShader, createScalesSpec, type ScalesTextureParams } from './scales'
export { ogeeShader, createOgeeSpec, type OgeeTextureParams } from './ogee'
export { sunburstShader, createSunburstSpec, type SunburstTextureParams } from './sunburst'
// Greymap mask shaders (2-stage pipeline)
export {
  // Circle greymap mask
  circleGreymapMaskShader,
  createCircleGreymapMaskSpec,
  // Rect greymap mask
  rectGreymapMaskShader,
  createRectGreymapMaskSpec,
  // Blob greymap mask
  blobGreymapMaskShader,
  createBlobGreymapMaskSpec,
  // Perlin greymap mask
  perlinGreymapMaskShader,
  createPerlinGreymapMaskSpec,
  // Linear gradient greymap mask
  linearGradientGreymapMaskShader,
  createLinearGradientGreymapMaskSpec,
  // Radial gradient greymap mask
  radialGradientGreymapMaskShader,
  createRadialGradientGreymapMaskSpec,
  // Box gradient greymap mask
  boxGradientGreymapMaskShader,
  createBoxGradientGreymapMaskSpec,
} from './greymapMask'
// Greymap pattern shaders
export {
  stripeGreymapShader,
  createStripeGreymapSpec,
  gridGreymapShader,
  createGridGreymapSpec,
  polkaDotGreymapShader,
  createPolkaDotGreymapSpec,
  checkerGreymapShader,
  createCheckerGreymapSpec,
} from './greymapPattern'
// Colorize shader (greymap to RGBA)
export {
  colorizeShader,
  createColorizeSpec,
  createMaskColorizeParams,
} from './colorize'
// Image greymap shader
export {
  imageGreymapShader,
  createImageGreymapSpec,
  createImageGreymapUniforms,
  IMAGE_GREYMAP_BUFFER_SIZE,
} from './imageGreymap'
