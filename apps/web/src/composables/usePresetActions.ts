import type { Ref } from 'vue'
import type { HeroViewConfig, PresetColorConfig, PresetHsvColor } from '@practice/section-visual'

/**
 * HSV color values for brand/accent/foundation
 * Compatible with both ColorPreset and PresetColorConfig
 */
export interface ColorPresetColors {
  brand: PresetHsvColor
  accent: PresetHsvColor
  foundation: PresetHsvColor
}

/**
 * Color state refs from useSiteColorsBridge
 */
export interface ColorStateRefs {
  hue: Ref<number>
  saturation: Ref<number>
  value: Ref<number>
  accentHue: Ref<number>
  accentSaturation: Ref<number>
  accentValue: Ref<number>
  foundationHue: Ref<number>
  foundationSaturation: Ref<number>
  foundationValue: Ref<number>
}

/**
 * Options for usePresetActions
 */
export interface UsePresetActionsOptions {
  colorState: ColorStateRefs
  toHeroViewConfig: () => HeroViewConfig
  applyPreset: (presetId: string) => Promise<PresetColorConfig | null>
}

/**
 * Return type of usePresetActions
 */
export interface UsePresetActionsReturn {
  applyColorPreset: (preset: ColorPresetColors) => void
  applyLayoutPreset: (presetId: string) => Promise<void>
  exportPreset: () => void
}

/**
 * Apply HSV color values to refs
 */
const applyHsvToRefs = (
  hsv: PresetHsvColor,
  hueRef: Ref<number>,
  saturationRef: Ref<number>,
  valueRef: Ref<number>,
) => {
  hueRef.value = hsv.hue
  saturationRef.value = hsv.saturation
  valueRef.value = hsv.value
}

/**
 * Extract HSV values from refs
 */
const extractHsvFromRefs = (
  hueRef: Ref<number>,
  saturationRef: Ref<number>,
  valueRef: Ref<number>,
): PresetHsvColor => ({
  hue: hueRef.value,
  saturation: saturationRef.value,
  value: valueRef.value,
})

/**
 * Composable for preset actions (apply color/layout presets, export preset)
 *
 * Extracts preset-related logic from HeroViewGeneratorView.vue
 */
export const usePresetActions = (options: UsePresetActionsOptions): UsePresetActionsReturn => {
  const { colorState, toHeroViewConfig, applyPreset } = options

  /**
   * Apply a color preset to the color state
   */
  const applyColorPreset = (preset: ColorPresetColors) => {
    applyHsvToRefs(preset.brand, colorState.hue, colorState.saturation, colorState.value)
    applyHsvToRefs(preset.accent, colorState.accentHue, colorState.accentSaturation, colorState.accentValue)
    applyHsvToRefs(preset.foundation, colorState.foundationHue, colorState.foundationSaturation, colorState.foundationValue)
  }

  /**
   * Apply a layout preset by ID
   * Also applies the color preset if available
   */
  const applyLayoutPreset = async (presetId: string) => {
    const colorPreset = await applyPreset(presetId)
    if (colorPreset) {
      applyColorPreset(colorPreset)
    }
  }

  /**
   * Export current configuration as a preset JSON file
   */
  const exportPreset = () => {
    const preset = {
      id: `custom-${Date.now()}`,
      name: 'Custom Preset',
      config: toHeroViewConfig(),
      colorPreset: {
        brand: extractHsvFromRefs(colorState.hue, colorState.saturation, colorState.value),
        accent: extractHsvFromRefs(colorState.accentHue, colorState.accentSaturation, colorState.accentValue),
        foundation: extractHsvFromRefs(colorState.foundationHue, colorState.foundationSaturation, colorState.foundationValue),
      },
    }

    const json = JSON.stringify(preset, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hero-preset-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    applyColorPreset,
    applyLayoutPreset,
    exportPreset,
  }
}
