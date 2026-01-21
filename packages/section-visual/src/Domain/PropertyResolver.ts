import type { ParamResolver as TimelineParamResolver } from '@practice/timeline'
import type { PropertyValue } from './SectionVisual'
import { $PropertyValue } from './SectionVisual'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  NormalizedSurfaceConfig,
  NormalizedMaskConfig,
  SingleEffectConfig,
  ProcessorConfig,
} from './HeroViewConfig'

/**
 * PropertyResolver - PropertyValue を実際の値に解決する
 *
 * ParamResolver から取得した解決済みの値を使用して
 * PropertyValue を実際の値に変換する。
 */
export interface PropertyResolver {
  /** PropertyValue を実際の値に解決 */
  resolve(prop: PropertyValue): number | string | boolean

  /** params 一括解決 */
  resolveAll(params: Record<string, PropertyValue>): Record<string, number | string | boolean>

  /** この params が依存する paramId 一覧 */
  getDependencies(params: Record<string, PropertyValue>): Set<string>
}

/**
 * PropertyResolver を作成
 *
 * @param paramResolver - ParamResolver from @practice/timeline (contains resolved values)
 */
export function createPropertyResolver(paramResolver: TimelineParamResolver): PropertyResolver {
  return {
    resolve(prop: PropertyValue): number | string | boolean {
      if ($PropertyValue.isStatic(prop)) {
        return prop.value
      }

      // BindingValue: ParamResolver から解決済みの値を取得
      const resolvedValue = paramResolver.get(prop.paramId)
      if (resolvedValue !== undefined) {
        return resolvedValue
      }

      // Fallback: 未解決の場合は 0 を返す
      return 0
    },

    resolveAll(params: Record<string, PropertyValue>): Record<string, number | string | boolean> {
      const result: Record<string, number | string | boolean> = {}
      for (const [key, prop] of Object.entries(params)) {
        result[key] = this.resolve(prop)
      }
      return result
    },

    getDependencies(params: Record<string, PropertyValue>): Set<string> {
      const deps = new Set<string>()
      for (const prop of Object.values(params)) {
        if ($PropertyValue.isBinding(prop)) {
          deps.add(prop.paramId)
        }
      }
      return deps
    },
  }
}

// ============================================================
// HeroViewConfig Resolution
// ============================================================

/**
 * Resolve all PropertyValue in params to static values
 */
function resolveParams(
  params: Record<string, PropertyValue>,
  resolver: PropertyResolver
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {}
  for (const [key, prop] of Object.entries(params)) {
    result[key] = $PropertyValue.static(resolver.resolve(prop))
  }
  return result
}

/**
 * Resolve NormalizedSurfaceConfig params
 */
function resolveSurfaceConfig(
  config: NormalizedSurfaceConfig,
  resolver: PropertyResolver
): NormalizedSurfaceConfig {
  return {
    id: config.id,
    params: resolveParams(config.params, resolver),
  }
}

/**
 * Resolve NormalizedMaskConfig params
 */
function resolveMaskConfig(
  config: NormalizedMaskConfig,
  resolver: PropertyResolver
): NormalizedMaskConfig {
  return {
    id: config.id,
    params: resolveParams(config.params, resolver),
  }
}

/**
 * Resolve SingleEffectConfig params
 */
function resolveEffectConfig(
  config: SingleEffectConfig,
  resolver: PropertyResolver
): SingleEffectConfig {
  return {
    type: 'effect',
    id: config.id,
    params: resolveParams(config.params, resolver),
  }
}

/**
 * Resolve ProcessorConfig (effect or mask)
 */
function resolveProcessorConfig(
  config: ProcessorConfig,
  resolver: PropertyResolver
): ProcessorConfig {
  if (config.type === 'effect') {
    return resolveEffectConfig(config, resolver)
  }
  // Mask processor
  return {
    ...config,
    shape: resolveMaskConfig(config.shape, resolver),
  }
}

/**
 * Resolve all PropertyValue in a LayerNodeConfig tree
 */
function resolveLayerConfig(
  layer: LayerNodeConfig,
  resolver: PropertyResolver
): LayerNodeConfig {
  switch (layer.type) {
    case 'base':
    case 'surface':
      return {
        ...layer,
        surface: resolveSurfaceConfig(layer.surface, resolver),
      }
    case 'processor':
      return {
        ...layer,
        modifiers: layer.modifiers.map((m) => resolveProcessorConfig(m, resolver)),
      }
    case 'group':
      return {
        ...layer,
        children: layer.children.map((c) => resolveLayerConfig(c, resolver)),
      }
    default:
      return layer
  }
}

/**
 * Resolve all PropertyValue in HeroViewConfig to static values
 *
 * Use this before rendering to convert dynamic bindings to concrete values.
 *
 * @param config - HeroViewConfig with PropertyValue params
 * @param resolver - PropertyResolver instance
 * @returns HeroViewConfig with all params as StaticValue
 */
export function resolveHeroViewConfig(
  config: HeroViewConfig,
  resolver: PropertyResolver
): HeroViewConfig {
  return {
    ...config,
    layers: config.layers.map((layer) => resolveLayerConfig(layer, resolver)),
  }
}
