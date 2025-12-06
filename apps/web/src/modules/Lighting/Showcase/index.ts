import { Cityscape, SphereSpace, GlassSpheres } from './scenes'
import type { SceneDefinition } from './SceneDefinition'

export type { SceneDefinition } from './SceneDefinition'

export const SceneList: readonly SceneDefinition[] = [Cityscape, SphereSpace, GlassSpheres]
