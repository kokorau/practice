/**
 * Filter shaders for post-processing effects
 *
 * Import from '@practice/texture/filters' to include only filter-related code
 * in your bundle (tree-shakeable).
 */

// Legacy vignette (for backward compatibility)
export {
  vignetteShader,
  createVignetteUniforms,
  VIGNETTE_BUFFER_SIZE,
  type VignetteParams,
} from '../shaders/vignette'

// New vignette shape variants
export {
  ellipseVignetteShader,
  createEllipseVignetteUniforms,
  ELLIPSE_VIGNETTE_BUFFER_SIZE,
  type EllipseVignetteParams,
} from '../shaders/vignette-ellipse'

export {
  circleVignetteShader,
  createCircleVignetteUniforms,
  CIRCLE_VIGNETTE_BUFFER_SIZE,
  type CircleVignetteParams,
} from '../shaders/vignette-circle'

export {
  rectVignetteShader,
  createRectVignetteUniforms,
  RECT_VIGNETTE_BUFFER_SIZE,
  type RectVignetteParams,
} from '../shaders/vignette-rect'

export {
  linearVignetteShader,
  createLinearVignetteUniforms,
  LINEAR_VIGNETTE_BUFFER_SIZE,
  type LinearVignetteParams,
} from '../shaders/vignette-linear'

export {
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  type ChromaticAberrationParams,
} from '../shaders/chromaticAberration'

export {
  dotHalftoneShader,
  createDotHalftoneUniforms,
  DOT_HALFTONE_BUFFER_SIZE,
  type DotHalftoneParams,
} from '../shaders/dotHalftone'

export {
  lineHalftoneShader,
  createLineHalftoneUniforms,
  LINE_HALFTONE_BUFFER_SIZE,
  type LineHalftoneParams,
} from '../shaders/lineHalftone'

export {
  blurShader,
  createBlurUniforms,
  BLUR_BUFFER_SIZE,
  type BlurParams,
} from '../shaders/blur'

export {
  pixelateShader,
  createPixelateUniforms,
  PIXELATE_BUFFER_SIZE,
  type PixelateParams,
} from '../shaders/pixelate'

export {
  hexagonMosaicShader,
  createHexagonMosaicUniforms,
  HEXAGON_MOSAIC_BUFFER_SIZE,
  type HexagonMosaicParams,
} from '../shaders/hexagonMosaic'

export {
  voronoiMosaicShader,
  createVoronoiMosaicUniforms,
  VORONOI_MOSAIC_BUFFER_SIZE,
  type VoronoiMosaicParams,
} from '../shaders/voronoiMosaic'

export {
  lut1dShader,
  createLut1dUniforms,
  createIdentityLut,
  LUT1D_BUFFER_SIZE,
  type Lut1DParams,
} from '../shaders/lut1d'
