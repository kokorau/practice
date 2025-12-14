export {
  RayTracingRenderer,
  $Scene,
  $SceneObject,
  noiseShadowShader,
  createPCFShadowShader,
  createPCFNoiseShadowShader,
  createSoftShadowShader,
  createSoftNoiseShadowShader,
} from './WebGL'
export type { ScenePlane, SceneBox, SceneObject, Scene } from './WebGL'

// WebGPU exports (with alias to avoid name conflicts)
export {
  RayTracingRenderer as RayTracingRendererWebGPU,
  $Scene as $SceneWebGPU,
  $SceneObject as $SceneObjectWebGPU,
  isWebGPUSupported,
} from './WebGPU'
export type {
  Scene as SceneWebGPU,
  SceneObject as SceneObjectWebGPU,
  ScenePlane as ScenePlaneWebGPU,
  SceneBox as SceneBoxWebGPU,
} from './WebGPU'
