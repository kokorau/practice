/**
 * useHeroGeneratorColorHandlers
 *
 * カラー状態更新ハンドラーを管理するcomposable
 * brand/accent/foundationの3つのカラータイプに対するhue/saturation/value更新を処理
 */

type WritableRef<T> = { value: T }

export interface ColorRefs {
  hue: WritableRef<number>
  saturation: WritableRef<number>
  value: WritableRef<number>
}

export interface UseHeroGeneratorColorHandlersOptions {
  brand: ColorRefs
  accent: ColorRefs
  foundation: ColorRefs
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
  const { brand, accent, foundation } = options

  const handleColorStateUpdate = (
    colorType: 'brand' | 'accent' | 'foundation',
    key: 'hue' | 'saturation' | 'value' | 'hex',
    newValue: number
  ) => {
    // Skip 'hex' key as it's handled differently (read-only computed)
    if (key === 'hex') return

    switch (colorType) {
      case 'brand':
        if (key === 'hue') brand.hue.value = newValue
        else if (key === 'saturation') brand.saturation.value = newValue
        else if (key === 'value') brand.value.value = newValue
        break
      case 'accent':
        if (key === 'hue') accent.hue.value = newValue
        else if (key === 'saturation') accent.saturation.value = newValue
        else if (key === 'value') accent.value.value = newValue
        break
      case 'foundation':
        if (key === 'hue') foundation.hue.value = newValue
        else if (key === 'saturation') foundation.saturation.value = newValue
        else if (key === 'value') foundation.value.value = newValue
        break
    }
  }

  return {
    handleColorStateUpdate,
  }
}
