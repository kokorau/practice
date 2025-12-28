import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import {
  type SiteBlueprint,
  type FilterState,
  type FontConfig,
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
import { TemplateRepository, blueprintRepository } from '../../modules/SiteSimulator/Infra'
import { createUpdateBlueprintUseCase } from '../../modules/SiteSimulator/Application'
import type { Filter, Preset, Lut } from '../../modules/Filter/Domain'
import { $Filter, $Preset } from '../../modules/Filter/Domain'
import type { FilterSetters } from '../Filter/useFilter'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePackPreset, StylePack } from '../../modules/StylePack/Domain/ValueObject'

// UseCase instance (singleton)
const useCase = createUpdateBlueprintUseCase(blueprintRepository)

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
  fontPresetId: ComputedRef<string>
  stylePresetId: ComputedRef<string>
  currentFont: ComputedRef<FontConfig>
  currentStylePack: ComputedRef<StylePack>

  // === Updaters ===
  setBrandColor: (color: Oklch) => void
  setAccentColor: (color: Oklch | null) => void
  setIntensity: (value: number) => void
  applyPreset: (preset: Preset) => void
  setMasterPoint: (index: number, value: number) => void
  resetFilter: () => void
  setFont: (fontPreset: FontPreset) => void
  setStyle: (stylePreset: StylePackPreset) => void

  // === FilterSetters (for ConfigPanel compatibility) ===
  setters: FilterSetters
}

const POINT_COUNT = 7

/**
 * Create default blueprint with template data
 */
const createDefaultBlueprint = (): SiteBlueprint => {
  const defaultSections = TemplateRepository.getDefaultSections()
  const baseTemplate = TemplateRepository.getDefaultBase()?.meta
  const utilityStyles = TemplateRepository.getUtilityStyle()

  const sectionTemplates = new Map<string, ReturnType<typeof TemplateRepository.getMeta>>()
  for (const section of defaultSections) {
    const meta = TemplateRepository.getMeta(section.templateId)
    if (meta) {
      sectionTemplates.set(section.templateId, meta)
    }
  }

  return $SiteBlueprint.create({
    sections: defaultSections,
    baseTemplate,
    sectionTemplates: sectionTemplates as Map<string, NonNullable<ReturnType<typeof TemplateRepository.getMeta>>>,
    utilityStyles,
  })
}

export const useSiteBlueprint = (): UseSiteBlueprintReturn => {
  // === Core State ===
  // Repository から取得、なければデフォルト作成
  const initialBlueprint = useCase.get() ?? createDefaultBlueprint()
  const blueprint = ref<SiteBlueprint>(initialBlueprint)

  // 初期状態を Repository に保存
  if (!useCase.get()) {
    useCase.update(initialBlueprint)
  }

  // === Subscription ===
  // 外部からの変更（他の composable、共同編集等）を検知して ref を更新
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = blueprintRepository.subscribe((updated) => {
      // 外部からの更新を ref に反映
      blueprint.value = updated
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  /**
   * Blueprint を更新し、Repository に永続化
   * Repository が listener に通知するため、他の subscriber も更新される
   */
  const updateBlueprint = (newBlueprint: SiteBlueprint) => {
    useCase.update(newBlueprint)
  }

  // === Convenience Accessors ===
  const brandColor = computed(() => blueprint.value.palette.brandColor)
  const selectedAccentOklch = computed(() => blueprint.value.palette.accentColor)

  // Accent color with default fallback
  const accentColor = computed(() => {
    return blueprint.value.palette.accentColor ?? $Oklch.create(0.75, 0.15, 70)
  })

  const filterState = computed(() => blueprint.value.filterState)
  const filter = computed(() => blueprint.value.filterState.filter)
  const intensity = computed(() => blueprint.value.filterState.intensity)
  const currentPresetId = computed(() => blueprint.value.filterState.presetId)
  const fontPresetId = computed(() => blueprint.value.font.presetId)
  const stylePresetId = computed(() => blueprint.value.style.presetId)

  // Blueprint内のfontは実体を持つ（FontConfig）
  const currentFont = computed(() => blueprint.value.font)

  // Blueprint内のstyleは実体を持つ（StyleConfig.style = StylePack）
  const currentStylePack = computed(() => blueprint.value.style.style)

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

  // === Updaters (all go through updateBlueprint → UseCase → Repository) ===
  const setBrandColor = (color: Oklch) => {
    updateBlueprint($SiteBlueprint.setBrandColor(blueprint.value, color))
  }

  const setAccentColor = (color: Oklch | null) => {
    updateBlueprint($SiteBlueprint.setAccentColor(blueprint.value, color))
  }

  const setIntensity = (value: number) => {
    const newFilterState = $FilterState.setIntensity(filterState.value, value)
    updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, newFilterState))
  }

  const applyPreset = (preset: Preset) => {
    const newFilter = $Preset.toFilter(preset, POINT_COUNT)
    const newFilterState = $FilterState.applyPreset(
      filterState.value,
      preset.id,
      newFilter,
      preset.lut3d ?? null
    )
    updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, newFilterState))
  }

  const setMasterPoint = (index: number, value: number) => {
    const newFilterState = $FilterState.setMasterPoint(filterState.value, index, value)
    updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, newFilterState))
  }

  const resetFilter = () => {
    updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, $FilterState.identity(POINT_COUNT)))
  }

  const setFont = (fontPreset: FontPreset) => {
    updateBlueprint($SiteBlueprint.setFont(blueprint.value, fontPreset))
  }

  const setStyle = (stylePreset: StylePackPreset) => {
    updateBlueprint($SiteBlueprint.setStyle(blueprint.value, stylePreset))
  }

  // === FilterSetters (for ConfigPanel compatibility) ===
  const createFilterSetter = <K extends keyof Filter['adjustment']>(
    _key: K,
    filterFn: (f: Filter, v: Filter['adjustment'][K]) => Filter
  ) => (value: Filter['adjustment'][K]) => {
    const newFilter = filterFn(filter.value, value)
    const newFilterState = $FilterState.setFilter(filterState.value, newFilter)
    updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, newFilterState))
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
      updateBlueprint($SiteBlueprint.setFilterState(blueprint.value, newFilterState))
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
    fontPresetId,
    stylePresetId,
    currentFont,
    currentStylePack,
    setBrandColor,
    setAccentColor,
    setIntensity,
    applyPreset,
    setMasterPoint,
    resetFilter,
    setFont,
    setStyle,
    setters,
  }
}
