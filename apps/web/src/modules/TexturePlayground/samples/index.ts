import type { SampleDefinition } from '../SampleDefinition'
import { GradientFlowSamples } from './gradientFlows'

/** All available samples */
export const SampleList: SampleDefinition[] = [
  ...GradientFlowSamples,
]

export { GradientFlowSamples } from './gradientFlows'
