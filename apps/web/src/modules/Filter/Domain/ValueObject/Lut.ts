/**
 * LUT (Look-Up Table) - Union Type と再エクスポート
 */

// 1D LUT
export { type Lut1D, $Lut1D } from './Lut1D'

// 3D LUT
export { type Lut3D, $Lut3D } from './Lut3D'

// Union type
import type { Lut1D } from './Lut1D'
import type { Lut3D } from './Lut3D'

/**
 * LUT Union Type - 1D または 3D LUT (discriminated union)
 */
export type Lut = Lut1D | Lut3D

// Legacy alias for backward compatibility
export { $Lut1D as $Lut } from './Lut1D'
