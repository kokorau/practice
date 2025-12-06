import type { SceneWebGPU } from '../Infra'
import type { OrthographicCamera } from '../Domain/ValueObject'

export interface SceneDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly createScene: (time: number) => SceneWebGPU
  readonly createCamera: (aspectRatio: number) => OrthographicCamera
}
