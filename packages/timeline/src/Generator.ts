import type { Ms } from './Unit'

export type GeneratorType = 'Sin' | 'Saw' | 'Pulse' | 'Step' | 'Perlin'

export interface GeneratorParams {
  // type固有のパラメータ
  // Pulse: duty, Step: steps, Perlin: seed, octaves etc...
}

export interface Generator {
  type: GeneratorType
  period: Ms
  offset: Ms
  params: GeneratorParams
}
