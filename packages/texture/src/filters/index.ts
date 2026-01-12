/**
 * Filter shaders for post-processing effects
 *
 * Import from '@practice/texture/filters' to include only filter-related code
 * in your bundle (tree-shakeable).
 */
export {
  vignetteShader,
  createVignetteUniforms,
  VIGNETTE_BUFFER_SIZE,
  type VignetteParams,
} from '../shaders/vignette'

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
