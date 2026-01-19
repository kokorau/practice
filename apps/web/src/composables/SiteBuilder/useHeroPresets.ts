/**
 * useHeroPresets
 *
 * プリセット管理ロジックを管理するcomposable
 * - presetManager初期化
 * - プリセットのload/apply/export
 * - selectedPresetIdの管理
 */

import { ref, computed, type Ref } from 'vue'
import {
  type HeroViewConfig,
  type HeroViewPreset,
  type HeroViewRepository,
  type ExportPresetOptions,
  type MergeMode,
  type HeroEditorUIState,
  type PresetColorConfig,
  createInMemoryHeroViewPresetRepository,
  createBrowserPresetExporter,
  createPresetManager,
} from '@practice/section-visual'

export interface UseHeroPresetsOptions {
  heroViewRepository: HeroViewRepository
  editorUIState: Ref<HeroEditorUIState>
  fromHeroViewConfig: (config: HeroViewConfig) => Promise<void>
}

export interface UseHeroPresetsReturn {
  presets: Ref<HeroViewPreset[]>
  selectedPresetId: Ref<string | null>
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
  } = options

  // ============================================================
  // Preset Manager Initialization
  // ============================================================
  const presetRepository = createInMemoryHeroViewPresetRepository()
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

  // ============================================================
  // Preset Management Functions
  // ============================================================
  const loadPresets = async (applyInitial = true) => {
    presets.value = await presetManager.getPresets()
    if (applyInitial && selectedPresetId.value) {
      const preset = await presetManager.applyPreset(selectedPresetId.value)
      if (preset) {
        await fromHeroViewConfig(preset.config)
        return preset.colorPreset ?? null
      }
    }
    return null
  }

  const applyPreset = async (presetId: string, mergeMode: MergeMode = 'replace') => {
    const preset = await presetManager.applyPreset(presetId, mergeMode)
    if (preset) {
      selectedPresetId.value = presetId
      await fromHeroViewConfig(preset.config)
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
    loadPresets,
    applyPreset,
    exportPreset,
    presetUsecase,
  }
}
