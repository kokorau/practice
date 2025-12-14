import type { SceneWebGPU } from '@practice/lighting/Infra'
import type { OrthographicCamera } from '@practice/lighting'

export interface SceneDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly createScene: (time: number) => SceneWebGPU
  readonly createCamera: (aspectRatio: number) => OrthographicCamera
}
