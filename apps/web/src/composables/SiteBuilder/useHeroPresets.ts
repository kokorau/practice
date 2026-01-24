/**
 * useHeroPresets
 *
 * プリセット管理ロジックを管理するcomposable
 * - presetManager初期化
 * - プリセットのload/apply/export
 * - selectedPresetIdの管理
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Timeline } from '@practice/timeline'
import {
  type HeroViewConfig,
  type HeroViewPreset,
  type HeroViewRepository,
  type HeroViewPresetRepository,
  type ExportPresetOptions,
  type MergeMode,
  type HeroEditorUIState,
  type PresetColorConfig,
  createInMemoryHeroViewPresetRepository,
  createBrowserPresetExporter,
  createPresetManager,
  getPresetConfig,
  isAnimatedPreset,
} from '@practice/section-visual'

export interface UseHeroPresetsOptions {
  heroViewRepository: HeroViewRepository
  editorUIState: Ref<HeroEditorUIState>
  fromHeroViewConfig: (config: HeroViewConfig) => Promise<void>
  /** カスタムプリセットリポジトリ（省略時はデフォルトプリセット） */
  presetRepository?: HeroViewPresetRepository
}

export interface UseHeroPresetsReturn {
  presets: Ref<HeroViewPreset[]>
  selectedPresetId: Ref<string | null>
  /** Currently selected preset (derived from selectedPresetId) */
  selectedPreset: ComputedRef<HeroViewPreset | undefined>
  /** Timeline from selected preset (only if animated preset) */
  selectedTimeline: ComputedRef<Timeline | undefined>
  loadPresets: (applyInitial?: boolean) => Promise<PresetColorConfig | null>
  applyPreset: (presetId: string, mergeMode?: MergeMode) => Promise<PresetColorConfig | null>
  exportPreset: (exportOptions?: ExportPresetOptions) => ReturnType<ReturnType<typeof createPresetManager>['exportAsPreset']>
  presetUsecase: {
    exportPreset: (options?: { id?: string; name?: string }) => ReturnType<ReturnType<typeof createPresetManager>['exportAsPreset']>
    createPreset: (options?: { id?: string; name?: string }) => ReturnType<ReturnType<typeof createPresetManager>['createPreset']>
  }
}

export const useHeroPresets = (
  options: UseHeroPresetsOptions
): UseHeroPresetsReturn => {
  const {
    heroViewRepository,
    editorUIState,
    fromHeroViewConfig,
    presetRepository: customPresetRepository,
  } = options

  // ============================================================
  // Preset Manager Initialization
  // ============================================================
  const presetRepository = customPresetRepository ?? createInMemoryHeroViewPresetRepository()
  const presetExportAdapter = createBrowserPresetExporter()
  const presetManager = createPresetManager({
    presetRepository,
    heroViewRepository,
    presetExportPort: presetExportAdapter,
  })

  const presetUsecase = {
    exportPreset: (options?: { id?: string; name?: string }) => {
      return presetManager.exportAsPreset(options)
    },
    createPreset: (options?: { id?: string; name?: string }) => {
      return presetManager.createPreset(options)
    },
  }

  // ============================================================
  // Preset State
  // ============================================================
  const presets = ref<HeroViewPreset[]>([])
  const selectedPresetId = computed({
    get: () => editorUIState.value.preset.selectedPresetId,
    set: (val: string | null) => { editorUIState.value.preset.selectedPresetId = val },
  })

  // Derived computeds
  const selectedPreset = computed(() => {
    const presetId = selectedPresetId.value
    return presets.value.find((p) => p.id === presetId)
  })

  const selectedTimeline = computed((): Timeline | undefined => {
    const preset = selectedPreset.value
    if (preset && isAnimatedPreset(preset)) {
      return preset.timeline
    }
    return undefined
  })

  // ============================================================
  // Preset Management Functions
  // ============================================================
  const loadPresets = async (applyInitial = true) => {
    presets.value = await presetManager.getPresets()
    if (applyInitial) {
      // Use selected preset if it exists in loaded presets, otherwise fall back to first preset
      const currentId = selectedPresetId.value
      const existsInPresets = currentId && presets.value.some(p => p.id === currentId)
      const presetIdToApply = existsInPresets ? currentId : presets.value[0]?.id
      if (presetIdToApply) {
        const preset = await presetManager.applyPreset(presetIdToApply)
        if (preset) {
          selectedPresetId.value = presetIdToApply
          // Skip fromHeroViewConfig for animated presets (they use $PropertyValue bindings)
          // The config is already set by presetManager.applyPreset via getPresetConfig
          if (!isAnimatedPreset(preset)) {
            const config = getPresetConfig(preset)
            if (config) {
              await fromHeroViewConfig(config)
            }
          }
          return preset.colorPreset ?? null
        }
      }
    }
    return null
  }

  const applyPreset = async (presetId: string, mergeMode: MergeMode = 'replace') => {
    const preset = await presetManager.applyPreset(presetId, mergeMode)
    if (preset) {
      selectedPresetId.value = presetId
      // Skip fromHeroViewConfig for animated presets (they use $PropertyValue bindings)
      // The config is already set by presetManager.applyPreset via getPresetConfig
      if (!isAnimatedPreset(preset)) {
        const config = getPresetConfig(preset)
        if (config) {
          await fromHeroViewConfig(config)
        }
      }
      return preset.colorPreset ?? null
    }
    return null
  }

  const exportPreset = (exportOptions: ExportPresetOptions = {}) => {
    return presetManager.exportAsPreset(exportOptions)
  }

  return {
    presets,
    selectedPresetId,
    selectedPreset,
    selectedTimeline,
    loadPresets,
    applyPreset,
    exportPreset,
    presetUsecase,
  }
}
