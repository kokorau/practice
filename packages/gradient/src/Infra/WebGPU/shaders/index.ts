import constants from './constants.wgsl?raw'
import types from './types.wgsl?raw'
import noise from './noise.wgsl?raw'
import colorSpace from './colorSpace.wgsl?raw'
import mixing from './mixing.wgsl?raw'
import postProcess from './postProcess.wgsl?raw'
import main from './main.wgsl?raw'

/**
 * Combined WGSL shader code in dependency order
 */
export const GRADIENT_SHADER_CODE = [
  constants,
  types,
  noise,
  colorSpace,
  mixing,
  postProcess,
  main,
].join('\n')
