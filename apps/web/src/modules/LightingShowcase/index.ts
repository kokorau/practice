import { Cityscape, GlassSpheres, RgbCube, HslCylinder, HsvCone } from './scenes'
import type { SceneDefinition } from './SceneDefinition'
import type { LineSceneDefinition } from './scenes/RgbCube'

export type { SceneDefinition } from './SceneDefinition'
export type { LineSceneDefinition } from './scenes/RgbCube'

export type AnySceneDefinition = SceneDefinition | LineSceneDefinition

export const SceneList: readonly AnySceneDefinition[] = [Cityscape, GlassSpheres, RgbCube, HslCylinder, HsvCone]
