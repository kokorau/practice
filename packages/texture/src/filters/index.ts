/**
 * Filter shaders for post-processing effects
 *
 * Import from '@practice/texture/filters' to include only filter-related code
 * in your bundle (tree-shakeable).
 */
export {
  vignetteShader,
  createVignetteShader,
  createVignetteSpec,
  type VignetteParams,
} from '../shaders/vignette'

export {
  createChromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  type ChromaticAberrationParams,
} from '../shaders/chromaticAberration'
