import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import {
  type SiteBlueprint,
  type FilterState,
  $SiteBlueprint,
  $FilterState,
  $CorePalette,
  $SemanticPalette,
  $RenderedColor,
  $RenderedPalette,
  type SemanticPalette,
  type SemanticColorToken,
  type RenderedPalette,
} from '../../modules/SiteSimulator/Domain/ValueObject'
import type { Filter, Preset, Lut } from '../../modules/Filter/Domain'
import { $Filter, $Preset } from '../../modules/Filter/Domain'
import type { FilterSetters } from '../Filter/useFilter'
import { GoogleFontPresets } from '../../assets/constants/GoogleFontPresets'
import { StylePackPresets, defaultStylePack } from '../../modules/StylePack/Domain/ValueObject'

/**
 * useSiteBlueprint - SiteBlueprint をベースにした状態管理
 *
 * SiteBlueprint を単一の状態として保持し、派生データを computed で提供。
 * ConfigPanel との互換性のため、FilterSetters も提供する。
 */
export type UseSiteBlueprintReturn = {
  // === Core State ===
  blueprint: Ref<SiteBlueprint>

  // === Derived (for Preview) ===
  lut: ComputedRef<Lut>
  semanticPalette: ComputedRef<SemanticPalette>
  renderedPalette: ComputedRef<RenderedPalette>

  // === Convenience Accessors ===
  brandColor: ComputedRef<Oklch>
  accentColor: ComputedRef<Oklch>
  selectedAccentOklch: ComputedRef<Oklch | null>
  filterState: ComputedRef<FilterState>
  filter: ComputedRef<Filter>
  intensity: ComputedRef<number>
  currentPresetId: ComputedRef<string | null>
  fontId: ComputedRef<string>
  stylePackId: ComputedRef<string>
  currentFont: ComputedRef<typeof GoogleFontPresets[number] | undefined>
  currentStylePack: ComputedRef<typeof defaultStylePack>

  // === Updaters ===
  setBrandColor: (color: Oklch) => void
  setAccentColor: (color: Oklch | null) => void
  setIntensity: (value: number) => void
  applyPreset: (preset: Preset) => void
  setMasterPoint: (index: number, value: number) => void
  resetFilter: () => void
  setFontId: (id: string) => void
  setStylePackId: (id: string) => void

  // === FilterSetters (for ConfigPanel compatibility) ===
  setters: FilterSetters
}

const POINT_COUNT = 7

export const useSiteBlueprint = (): UseSiteBlueprintReturn => {
  // === Core State ===
  const blueprint = ref<SiteBlueprint>($SiteBlueprint.default())

  // === Convenience Accessors ===
  const brandColor = computed(() => blueprint.value.brandColor)
  const selectedAccentOklch = computed(() => blueprint.value.accentColor)

  // Accent color with default fallback
  const accentColor = computed(() => {
    return blueprint.value.accentColor ?? $Oklch.create(0.75, 0.15, 70)
  })

  const filterState = computed(() => blueprint.value.filterState)
  const filter = computed(() => blueprint.value.filterState.filter)
  const intensity = computed(() => blueprint.value.filterState.intensity)
  const currentPresetId = computed(() => blueprint.value.filterState.presetId)
  const fontId = computed(() => blueprint.value.font.fontId)
  const stylePackId = computed(() => blueprint.value.style.stylePackId)

  const currentFont = computed(() =>
    GoogleFontPresets.find(f => f.id === fontId.value)
  )

  const currentStylePack = computed(() =>
    StylePackPresets.find(s => s.id === stylePackId.value)?.style ?? defaultStylePack
  )

  // === Derived Data ===
  const lut = computed<Lut>(() => $FilterState.toLut(filterState.value))

  const corePalette = computed(() =>
    $CorePalette.create(
      brandColor.value,
      accentColor.value,
      $Oklch.create(0.99, 0, 0)
    )
  )

  const semanticPalette = computed(() => $SemanticPalette.fromCorePalette(corePalette.value))

  const renderedPalette = computed(() => {
    const colors = new Map<string, ReturnType<typeof $RenderedColor.fromOklch>>()
    const palette = semanticPalette.value
    const categories: (keyof SemanticPalette)[] = ['surface', 'text', 'brand', 'accent']

    for (const category of categories) {
      const group = palette[category]
      for (const key of Object.keys(group)) {
        const oklch = group[key as keyof typeof group]
        const token = `${category}.${key}` as SemanticColorToken
        colors.set(token, $RenderedColor.fromOklchWithLut(oklch, lut.value))
      }
    }

    return $RenderedPalette.create(colors, 'default', currentPresetId.value ?? 'none')
  })

  // === Updaters ===
  const setBrandColor = (color: Oklch) => {
    blueprint.value = $SiteBlueprint.setBrandColor(blueprint.value, color)
  }

  const setAccentColor = (color: Oklch | null) => {
    blueprint.value = $SiteBlueprint.setAccentColor(blueprint.value, color)
  }

  const setIntensity = (value: number) => {
    const newFilterState = $FilterState.setIntensity(filterState.value, value)
    blueprint.value = $SiteBlueprint.setFilterState(blueprint.value, newFilterState)
  }

  const applyPreset = (preset: Preset) => {
    const newFilter = $Preset.toFilter(preset, POINT_COUNT)
    const newFilterState = $FilterState.applyPreset(
      filterState.value,
      preset.id,
      newFilter,
      preset.lut3d ?? null
    )
    blueprint.value = $SiteBlueprint.setFilterState(blueprint.value, newFilterState)
  }

  const setMasterPoint = (index: number, value: number) => {
    const newFilterState = $FilterState.setMasterPoint(filterState.value, index, value)
    blueprint.value = $SiteBlueprint.setFilterState(blueprint.value, newFilterState)
  }

  const resetFilter = () => {
    blueprint.value = $SiteBlueprint.setFilterState(
      blueprint.value,
      $FilterState.identity(POINT_COUNT)
    )
  }

  const setFontId = (id: string) => {
    blueprint.value = $SiteBlueprint.setFontId(blueprint.value, id)
  }

  const setStylePackId = (id: string) => {
    blueprint.value = $SiteBlueprint.setStylePackId(blueprint.value, id)
  }

  // === FilterSetters (for ConfigPanel compatibility) ===
  const createFilterSetter = <K extends keyof Filter['adjustment']>(
    _key: K,
    filterFn: (f: Filter, v: Filter['adjustment'][K]) => Filter
  ) => (value: Filter['adjustment'][K]) => {
    const newFilter = filterFn(filter.value, value)
    const newFilterState = $FilterState.setFilter(filterState.value, newFilter)
    blueprint.value = $SiteBlueprint.setFilterState(blueprint.value, newFilterState)
  }

  const setters: FilterSetters = {
    exposure: createFilterSetter('exposure', $Filter.setExposure),
    highlights: createFilterSetter('highlights', $Filter.setHighlights),
    shadows: createFilterSetter('shadows', $Filter.setShadows),
    whites: createFilterSetter('whites', $Filter.setWhites),
    blacks: createFilterSetter('blacks', $Filter.setBlacks),
    brightness: createFilterSetter('brightness', $Filter.setBrightness),
    contrast: createFilterSetter('contrast', $Filter.setContrast),
    temperature: createFilterSetter('temperature', $Filter.setTemperature),
    tint: createFilterSetter('tint', $Filter.setTint),
    clarity: createFilterSetter('clarity', $Filter.setClarity),
    fade: createFilterSetter('fade', $Filter.setFade),
    vibrance: createFilterSetter('vibrance', $Filter.setVibrance),
    splitShadowHue: createFilterSetter('splitShadowHue', $Filter.setSplitShadowHue),
    splitShadowAmount: createFilterSetter('splitShadowAmount', $Filter.setSplitShadowAmount),
    splitHighlightHue: createFilterSetter('splitHighlightHue', $Filter.setSplitHighlightHue),
    splitHighlightAmount: createFilterSetter('splitHighlightAmount', $Filter.setSplitHighlightAmount),
    splitBalance: createFilterSetter('splitBalance', $Filter.setSplitBalance),
    toe: createFilterSetter('toe', $Filter.setToe),
    shoulder: createFilterSetter('shoulder', $Filter.setShoulder),
    liftR: createFilterSetter('liftR', $Filter.setLiftR),
    liftG: createFilterSetter('liftG', $Filter.setLiftG),
    liftB: createFilterSetter('liftB', $Filter.setLiftB),
    gammaR: createFilterSetter('gammaR', $Filter.setGammaR),
    gammaG: createFilterSetter('gammaG', $Filter.setGammaG),
    gammaB: createFilterSetter('gammaB', $Filter.setGammaB),
    gainR: createFilterSetter('gainR', $Filter.setGainR),
    gainG: createFilterSetter('gainG', $Filter.setGainG),
    gainB: createFilterSetter('gainB', $Filter.setGainB),
    selectiveColorEnabled: (value: boolean) => {
      const newFilter = $Filter.setSelectiveColorEnabled(filter.value, value)
      const newFilterState = $FilterState.setFilter(filterState.value, newFilter)
      blueprint.value = $SiteBlueprint.setFilterState(blueprint.value, newFilterState)
    },
    selectiveHue: createFilterSetter('selectiveHue', $Filter.setSelectiveHue),
    selectiveRange: createFilterSetter('selectiveRange', $Filter.setSelectiveRange),
    selectiveDesaturate: createFilterSetter('selectiveDesaturate', $Filter.setSelectiveDesaturate),
    posterizeLevels: createFilterSetter('posterizeLevels', $Filter.setPosterizeLevels),
    hueRotation: createFilterSetter('hueRotation', $Filter.setHueRotation),
  }

  return {
    blueprint,
    lut,
    semanticPalette,
    renderedPalette,
    brandColor,
    accentColor,
    selectedAccentOklch,
    filterState,
    filter,
    intensity,
    currentPresetId,
    fontId,
    stylePackId,
    currentFont,
    currentStylePack,
    setBrandColor,
    setAccentColor,
    setIntensity,
    applyPreset,
    setMasterPoint,
    resetFilter,
    setFontId,
    setStylePackId,
    setters,
  }
}
