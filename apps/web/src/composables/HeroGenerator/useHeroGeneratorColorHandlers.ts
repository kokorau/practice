/**
 * useHeroGeneratorColorHandlers
 *
 * カラー状態更新ハンドラーを管理するcomposable
 * brand/accent/foundationの3つのカラータイプに対するhue/saturation/value更新を処理
 */

import type { UseSiteColorsBridgeReturn } from '../SiteBuilder/useSiteColorsBridge'

/**
 * Pick only the writable HSV refs from UseSiteColorsBridgeReturn
 */
export type ColorStateRefs = Pick<
  UseSiteColorsBridgeReturn,
  | 'hue'
  | 'saturation'
  | 'value'
  | 'accentHue'
  | 'accentSaturation'
  | 'accentValue'
  | 'foundationHue'
  | 'foundationSaturation'
  | 'foundationValue'
>

export interface UseHeroGeneratorColorHandlersOptions {
  colors: ColorStateRefs
}

export interface UseHeroGeneratorColorHandlersReturn {
  handleColorStateUpdate: (
    colorType: 'brand' | 'accent' | 'foundation',
    key: 'hue' | 'saturation' | 'value' | 'hex',
    newValue: number
  ) => void
}

export const useHeroGeneratorColorHandlers = (
  options: UseHeroGeneratorColorHandlersOptions
): UseHeroGeneratorColorHandlersReturn => {
  const { colors } = options

  const handleColorStateUpdate = (
    colorType: 'brand' | 'accent' | 'foundation',
    key: 'hue' | 'saturation' | 'value' | 'hex',
    newValue: number
  ) => {
    // Skip 'hex' key as it's handled differently (read-only computed)
    if (key === 'hex') return

    switch (colorType) {
      case 'brand':
        if (key === 'hue') colors.hue.value = newValue
        else if (key === 'saturation') colors.saturation.value = newValue
        else if (key === 'value') colors.value.value = newValue
        break
      case 'accent':
        if (key === 'hue') colors.accentHue.value = newValue
        else if (key === 'saturation') colors.accentSaturation.value = newValue
        else if (key === 'value') colors.accentValue.value = newValue
        break
      case 'foundation':
        if (key === 'hue') colors.foundationHue.value = newValue
        else if (key === 'saturation') colors.foundationSaturation.value = newValue
        else if (key === 'value') colors.foundationValue.value = newValue
        break
    }
  }

  return {
    handleColorStateUpdate,
  }
}
