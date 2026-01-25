/**
 * useHeroGeneratorPanelHandlers
 *
 * RightPropertyPanelのイベントハンドラーを管理するcomposable
 * - handleForegroundUpdate: 前景要素の更新
 * - handleBackgroundUpdate: 背景の更新
 * - handleMaskUpdate: マスクの更新
 */

import type { HeroPrimitiveKey } from '@practice/section-visual'
import type { UseForegroundElementReturn } from '../useForegroundElement'

// Generic writable ref type that accepts both Ref and WritableComputedRef
type WritableRef<T> = { value: T }

/**
 * Pick only the selected element refs from UseForegroundElementReturn
 */
export type ForegroundElementRefs = Pick<
  UseForegroundElementReturn,
  | 'selectedElementColorKey'
  | 'selectedElementContent'
  | 'selectedElementPosition'
  | 'selectedElementFontSize'
  | 'selectedElementFontWeight'
  | 'selectedElementLetterSpacing'
  | 'selectedElementLineHeight'
>

export interface BackgroundState {
  updateBackgroundSurfaceParams: (params: Record<string, unknown>) => void
  updateSingleBackgroundSurfaceParam: (paramName: string, value: string | number | boolean) => void
}

export interface MaskState {
  updateSurfaceParams: (params: Record<string, unknown>) => void
  updateMaskShapeParams: (params: Record<string, unknown>) => void
  updateSingleSurfaceParam: (paramName: string, value: string | number | boolean) => void
}

export interface PatternState {
  selectedBackgroundIndex: WritableRef<number>
  selectedMidgroundTextureIndex: WritableRef<number>
  selectedMaskIndex: WritableRef<number | null>
}

export interface UseHeroGeneratorPanelHandlersOptions {
  foregroundRefs: ForegroundElementRefs
  background: BackgroundState
  mask: MaskState
  pattern: PatternState
}

export interface UseHeroGeneratorPanelHandlersReturn {
  handleForegroundUpdate: (key: string, value: unknown) => void
  handleBackgroundUpdate: (key: string, value: unknown) => void
  handleMaskUpdate: (key: string, value: unknown) => void
  /** Handle single background param update (preserves PropertyValue types) */
  handleBackgroundParamUpdate: (paramName: string, value: unknown) => void
  /** Handle single mask param update (preserves PropertyValue types) */
  handleMaskParamUpdate: (paramName: string, value: unknown) => void
}

export const useHeroGeneratorPanelHandlers = (
  options: UseHeroGeneratorPanelHandlersOptions
): UseHeroGeneratorPanelHandlersReturn => {
  const { foregroundRefs, background, mask, pattern } = options

  const handleForegroundUpdate = (key: string, value: unknown) => {
    switch (key) {
      case 'elementColorKey':
        foregroundRefs.selectedElementColorKey.value = value as HeroPrimitiveKey
        break
      case 'elementContent':
        foregroundRefs.selectedElementContent.value = value as string
        break
      case 'elementPosition':
        foregroundRefs.selectedElementPosition.value = value as typeof foregroundRefs.selectedElementPosition.value
        break
      case 'elementFontSize':
        foregroundRefs.selectedElementFontSize.value = value as number
        break
      case 'elementFontWeight':
        foregroundRefs.selectedElementFontWeight.value = value as number
        break
      case 'elementLetterSpacing':
        foregroundRefs.selectedElementLetterSpacing.value = value as number
        break
      case 'elementLineHeight':
        foregroundRefs.selectedElementLineHeight.value = value as number
        break
    }
  }

  const handleBackgroundUpdate = (key: string, value: unknown) => {
    switch (key) {
      case 'selectPattern':
        if (value !== null) pattern.selectedBackgroundIndex.value = value as number
        break
      case 'surfaceParams':
        background.updateBackgroundSurfaceParams(value as Record<string, unknown>)
        break
    }
  }

  const handleMaskUpdate = (key: string, value: unknown) => {
    switch (key) {
      case 'selectPattern':
        if (value !== null) pattern.selectedMidgroundTextureIndex.value = value as number
        break
      case 'surfaceParams':
        mask.updateSurfaceParams(value as Record<string, unknown>)
        break
      case 'selectedShapeIndex':
        pattern.selectedMaskIndex.value = value as number
        break
      case 'shapeParams':
        mask.updateMaskShapeParams(value as Record<string, unknown>)
        break
    }
  }

  const handleBackgroundParamUpdate = (paramName: string, value: unknown) => {
    background.updateSingleBackgroundSurfaceParam(paramName, value as string | number | boolean)
  }

  const handleMaskParamUpdate = (paramName: string, value: unknown) => {
    mask.updateSingleSurfaceParam(paramName, value as string | number | boolean)
  }

  return {
    handleForegroundUpdate,
    handleBackgroundUpdate,
    handleMaskUpdate,
    handleBackgroundParamUpdate,
    handleMaskParamUpdate,
  }
}
