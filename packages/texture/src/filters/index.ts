/**
 * Filter shaders for post-processing effects
 *
 * Import from '@practice/texture/filters' to include only filter-related code
 * in your bundle (tree-shakeable).
 */
export {
  vignetteShader,
  createVignetteUniforms,
  createVignetteSpec,
  VIGNETTE_BUFFER_SIZE,
  type VignetteParams,
} from '../shaders/vignette'

export {
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  type ChromaticAberrationParams,
} from '../shaders/chromaticAberration'
