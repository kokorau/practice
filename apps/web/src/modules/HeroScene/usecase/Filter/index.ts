/**
 * Filter UseCase
 *
 * フィルター/エフェクト操作のユースケース
 *
 * NOTE: Legacy repository-based usecase functions have been removed.
 * Effect management is now handled by useEffectManager composable.
 *
 * - selectFilterType/getFilterType: Use useHeroFilters composable
 * - updateEffectParams/getEffectParams: Use useEffectManager composable
 * - update*Params/get*Params: Use useHeroFilters composable
 */

// Re-export types that were previously exported from this module
export type { FilterType } from '../../Domain/EffectRegistry'
