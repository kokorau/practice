import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { type Filter, type Lut, type Lut3D, type Preset, $Filter, $Preset, $Lut1D, $Lut3D } from '../../modules/Filter/Domain'

/** LUTに焼けないピクセル単位エフェクト */
export type PixelEffects = {
  vibrance: number
  // Selective Color
  selectiveColorEnabled: boolean
  selectiveHue: number
  selectiveRange: number
  selectiveDesaturate: number
  // Posterize
  posterizeLevels: number
  // Hue Rotation
  hueRotation: number
}

/** セッター関数の型 */
type Setter = (value: number) => void

/** boolean用セッター関数の型 */
type BoolSetter = (value: boolean) => void

/** セッターオブジェクトの型 */
export type FilterSetters = {
  exposure: Setter
  highlights: Setter
  shadows: Setter
  whites: Setter
  blacks: Setter
  brightness: Setter
  contrast: Setter
  temperature: Setter
  tint: Setter
  clarity: Setter
  fade: Setter
  vibrance: Setter
  splitShadowHue: Setter
  splitShadowAmount: Setter
  splitHighlightHue: Setter
  splitHighlightAmount: Setter
  splitBalance: Setter
  toe: Setter
  shoulder: Setter
  liftR: Setter
  liftG: Setter
  liftB: Setter
  gammaR: Setter
  gammaG: Setter
  gammaB: Setter
  gainR: Setter
  gainG: Setter
  gainB: Setter
  // Selective Color
  selectiveColorEnabled: BoolSetter
  selectiveHue: Setter
  selectiveRange: Setter
  selectiveDesaturate: Setter
  // Posterize
  posterizeLevels: Setter
  // Hue Rotation
  hueRotation: Setter
}

/** Site Repository の FilterConfig と互換の初期化データ */
export type FilterInitData = {
  adjustment: Filter['adjustment']
  master: { points: readonly number[] }
  r: { points: readonly number[] } | null
  g: { points: readonly number[] } | null
  b: { points: readonly number[] } | null
  intensity: number
  presetId: string | null
}

export type UseFilterReturn = {
  filter: Ref<Filter>
  /** LUT (1D or 3D depending on configuration) */
  lut: ComputedRef<Lut>
  /** フィルター強度 (0.0〜1.0) */
  intensity: Ref<number>
  /** 強度を設定 */
  setIntensity: (value: number) => void
  /** LUTに焼けないエフェクト (vibrance等) */
  pixelEffects: ComputedRef<PixelEffects>
  /** 現在適用中のプリセットID (null = カスタム) */
  currentPresetId: Ref<string | null>
  /** プリセットを適用 */
  applyPreset: (preset: Preset) => void
  /** 全セッター関数 */
  setters: FilterSetters
  /** Master カーブの特定ポイントを更新 */
  setMasterPoint: (index: number, value: number) => void
  /** Master カーブ全体を更新 */
  setMasterPoints: (points: number[]) => void
  /** フィルターをリセット */
  reset: () => void
  /** FilterConfig から初期化 (Site Repository 統合用) */
  initializeFrom: (data: FilterInitData) => void
}

/** セッター定義 */
type SetterDef = {
  filterFn: (f: Filter, v: number) => Filter
  clamp: (v: number) => number
}

/** クランプ関数 */
const clampRange = (min: number, max: number) => (v: number) => Math.max(min, Math.min(max, v))
const clampHue = (v: number) => ((v % 360) + 360) % 360

/** 数値セッターのキー */
type NumericSetterKey = Exclude<keyof FilterSetters, 'selectiveColorEnabled'>

/** セッター定義マップ */
const SETTER_DEFS: Record<NumericSetterKey, SetterDef> = {
  exposure:            { filterFn: $Filter.setExposure,            clamp: clampRange(-2, 2) },
  highlights:          { filterFn: $Filter.setHighlights,          clamp: clampRange(-1, 1) },
  shadows:             { filterFn: $Filter.setShadows,             clamp: clampRange(-1, 1) },
  whites:              { filterFn: $Filter.setWhites,              clamp: clampRange(-1, 1) },
  blacks:              { filterFn: $Filter.setBlacks,              clamp: clampRange(-1, 1) },
  brightness:          { filterFn: $Filter.setBrightness,          clamp: clampRange(-1, 1) },
  contrast:            { filterFn: $Filter.setContrast,            clamp: clampRange(-1, 1) },
  temperature:         { filterFn: $Filter.setTemperature,         clamp: clampRange(-1, 1) },
  tint:                { filterFn: $Filter.setTint,                clamp: clampRange(-1, 1) },
  clarity:             { filterFn: $Filter.setClarity,             clamp: clampRange(-1, 1) },
  fade:                { filterFn: $Filter.setFade,                clamp: clampRange(0, 1) },
  vibrance:            { filterFn: $Filter.setVibrance,            clamp: clampRange(-1, 1) },
  splitShadowHue:      { filterFn: $Filter.setSplitShadowHue,      clamp: clampHue },
  splitShadowAmount:   { filterFn: $Filter.setSplitShadowAmount,   clamp: clampRange(0, 1) },
  splitHighlightHue:   { filterFn: $Filter.setSplitHighlightHue,   clamp: clampHue },
  splitHighlightAmount:{ filterFn: $Filter.setSplitHighlightAmount,clamp: clampRange(0, 1) },
  splitBalance:        { filterFn: $Filter.setSplitBalance,        clamp: clampRange(-1, 1) },
  toe:                 { filterFn: $Filter.setToe,                 clamp: clampRange(0, 1) },
  shoulder:            { filterFn: $Filter.setShoulder,            clamp: clampRange(0, 1) },
  liftR:               { filterFn: $Filter.setLiftR,               clamp: clampRange(-1, 1) },
  liftG:               { filterFn: $Filter.setLiftG,               clamp: clampRange(-1, 1) },
  liftB:               { filterFn: $Filter.setLiftB,               clamp: clampRange(-1, 1) },
  gammaR:              { filterFn: $Filter.setGammaR,              clamp: clampRange(-1, 1) },
  gammaG:              { filterFn: $Filter.setGammaG,              clamp: clampRange(-1, 1) },
  gammaB:              { filterFn: $Filter.setGammaB,              clamp: clampRange(-1, 1) },
  gainR:               { filterFn: $Filter.setGainR,               clamp: clampRange(-1, 1) },
  gainG:               { filterFn: $Filter.setGainG,               clamp: clampRange(-1, 1) },
  gainB:               { filterFn: $Filter.setGainB,               clamp: clampRange(-1, 1) },
  // Selective Color (selectiveColorEnabledは別処理)
  selectiveHue:        { filterFn: $Filter.setSelectiveHue,        clamp: clampHue },
  selectiveRange:      { filterFn: $Filter.setSelectiveRange,      clamp: clampRange(0, 180) },
  selectiveDesaturate: { filterFn: $Filter.setSelectiveDesaturate, clamp: clampRange(0, 1) },
  // Posterize
  posterizeLevels:     { filterFn: $Filter.setPosterizeLevels,     clamp: clampRange(2, 256) },
  // Hue Rotation
  hueRotation:         { filterFn: $Filter.setHueRotation,         clamp: clampRange(-180, 180) },
}

export const useFilter = (pointCount: number = 7): UseFilterReturn => {
  const filter = ref<Filter>($Filter.identity(pointCount))
  const currentPresetId = ref<string | null>(null)
  /** 現在適用中の3D LUT (プリセットで指定された場合) */
  const currentLut3d = ref<Lut3D | null>(null)
  /** フィルター強度 (0.0〜1.0) */
  const intensity = ref(1.0)

  // 3D LUTがある場合はそれを使用、なければ1D LUTを生成
  // 強度が1未満の場合はIdentityとブレンド
  const lut = computed<Lut>(() => {
    const baseLut = currentLut3d.value ?? $Filter.toLut(filter.value)

    // 強度が1.0ならそのまま返す
    if (intensity.value >= 0.999) return baseLut

    // 強度に応じてIdentityとブレンド
    if ($Lut3D.is(baseLut)) {
      return $Lut3D.blend(baseLut, intensity.value)
    } else {
      return $Lut1D.blend(baseLut, intensity.value)
    }
  })

  const setIntensity = (value: number) => {
    intensity.value = Math.max(0, Math.min(1, value))
  }

  // LUTに焼けないエフェクト
  const pixelEffects = computed<PixelEffects>(() => ({
    vibrance: filter.value.adjustment.vibrance,
    // Selective Color
    selectiveColorEnabled: filter.value.adjustment.selectiveColorEnabled,
    selectiveHue: filter.value.adjustment.selectiveHue,
    selectiveRange: filter.value.adjustment.selectiveRange,
    selectiveDesaturate: filter.value.adjustment.selectiveDesaturate,
    // Posterize
    posterizeLevels: filter.value.adjustment.posterizeLevels,
    // Hue Rotation
    hueRotation: filter.value.adjustment.hueRotation,
  }))

  const applyPreset = (preset: Preset) => {
    filter.value = $Preset.toFilter(preset, pointCount)
    currentPresetId.value = preset.id
    // 3D LUTプリセットの場合は保持
    currentLut3d.value = preset.lut3d ?? null
  }

  // パラメータ変更時はプリセットIDと3D LUTをクリア
  const clearPresetId = () => {
    currentPresetId.value = null
    currentLut3d.value = null
  }

  // セッターファクトリ
  const createSetter = (def: SetterDef): Setter => (value: number) => {
    filter.value = def.filterFn(filter.value, def.clamp(value))
    clearPresetId()
  }

  // 全セッターを一括生成 (数値型)
  const numericSetters = Object.fromEntries(
    Object.entries(SETTER_DEFS).map(([key, def]) => [key, createSetter(def)])
  )

  // selectiveColorEnabled セッター
  const setSelectiveColorEnabled: BoolSetter = (value) => {
    filter.value = $Filter.setSelectiveColorEnabled(filter.value, value)
    clearPresetId()
  }

  const setters: FilterSetters = {
    ...numericSetters,
    selectiveColorEnabled: setSelectiveColorEnabled,
  } as FilterSetters

  const setMasterPoint = (index: number, value: number) => {
    const newPoints = [...filter.value.master.points]
    newPoints[index] = Math.max(0, Math.min(1, value))
    filter.value = $Filter.setMaster(filter.value, { points: newPoints })
    clearPresetId()
  }

  const setMasterPoints = (points: number[]) => {
    filter.value = $Filter.setMaster(filter.value, { points })
    clearPresetId()
  }

  const reset = () => {
    filter.value = $Filter.identity(pointCount)
    currentPresetId.value = null
    currentLut3d.value = null
    intensity.value = 1.0
  }

  /** FilterConfig から初期化 (Site Repository 統合用) */
  const initializeFrom = (data: FilterInitData) => {
    // adjustment と curves を Filter に変換
    const newFilter: Filter = {
      adjustment: data.adjustment,
      master: { points: [...data.master.points] },
      r: data.r ? { points: [...data.r.points] } : null,
      g: data.g ? { points: [...data.g.points] } : null,
      b: data.b ? { points: [...data.b.points] } : null,
    }
    filter.value = newFilter
    intensity.value = data.intensity
    currentPresetId.value = data.presetId
    // 3D LUT はプリセット適用時のみ設定されるため、ここではクリア
    currentLut3d.value = null
  }

  return {
    filter,
    lut,
    intensity,
    setIntensity,
    pixelEffects,
    currentPresetId,
    applyPreset,
    setters,
    setMasterPoint,
    setMasterPoints,
    reset,
    initializeFrom,
  }
}
