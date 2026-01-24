/**
 * resolvePropertyValue
 *
 * Re-exports from Domain layer for backward compatibility
 */

export type { IntensityProvider } from '../../Domain/PropertyResolver'
export {
  DEFAULT_INTENSITY_PROVIDER,
  resolvePropertyValueToNumber,
  resolvePropertyValueToString,
  resolvePropertyValueToBoolean,
  resolvePropertyValueSimple as resolvePropertyValue,
  resolveParamsSimple as resolveParams,
} from '../../Domain/PropertyResolver'
