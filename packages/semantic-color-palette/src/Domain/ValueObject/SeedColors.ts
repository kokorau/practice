/**
 * SeedColors - パレット生成の種となる色
 */
import type { Oklch } from '@practice/color'

export interface SeedColors {
  readonly brand: Oklch
  readonly foundation: Oklch
  readonly accent: Oklch
}
