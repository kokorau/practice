import type { SampleDefinition } from '../SampleDefinition'
import { GradientFlowSamples } from './gradientFlows'
import { SandRippleSamples } from './sandRipple'

/** All available samples */
export const SampleList: SampleDefinition[] = [
  ...GradientFlowSamples,
  ...SandRippleSamples,
]

export { GradientFlowSamples } from './gradientFlows'
export { SandRippleSamples } from './sandRipple'
