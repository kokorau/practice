/**
 * useHeroForeground
 *
 * Foreground (HTML layer) management for HeroScene
 * - ForegroundElement CRUD operations
 * - CompiledView derivation
 */

import { computed, type ComputedRef, type WritableComputedRef, type Ref } from 'vue'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import {
  type HeroViewRepository,
  type HeroViewConfig,
  type ForegroundLayerConfig,
  type CompiledHeroView,
  type FontResolver,
  type ForegroundConfigPort,
  type SelectionPort,
  compileHeroView,
  createForegroundElementUsecase,
} from '@practice/section-visual'
import type { ForegroundColorContext } from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

export interface UseHeroForegroundOptions {
  heroViewRepository: HeroViewRepository
  repoConfig: Ref<HeroViewConfig>
  foregroundConfig: WritableComputedRef<ForegroundLayerConfig>
  primitivePalette: ComputedRef<PrimitivePalette>
  isDark: Ref<boolean> | ComputedRef<boolean>
  foregroundColorContext: ComputedRef<ForegroundColorContext>
  fontResolver: FontResolver
  selectedForegroundElementId: WritableComputedRef<string | null>
  clearCanvasSelection: () => void
}

export interface ForegroundElementUsecaseReturn {
  getSelectedElement: ReturnType<typeof createForegroundElementUsecase>['getSelectedElement']
  selectElement: ReturnType<typeof createForegroundElementUsecase>['selectElement']
  addElement: ReturnType<typeof createForegroundElementUsecase>['addElement']
  removeElement: ReturnType<typeof createForegroundElementUsecase>['removeElement']
  updateElement: (elementId: string, updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => void
  updateSelectedElement: (updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => void
}

export interface UseHeroForegroundReturn {
  compiledView: ComputedRef<CompiledHeroView>
  foregroundElementUsecase: ForegroundElementUsecaseReturn
}

// ============================================================
// Composable
// ============================================================

export function useHeroForeground(options: UseHeroForegroundOptions): UseHeroForegroundReturn {
  const {
    repoConfig,
    primitivePalette,
    isDark,
    foregroundColorContext,
    fontResolver,
    foregroundConfig,
    selectedForegroundElementId,
    clearCanvasSelection,
  } = options

  // ============================================================
  // Compiled HeroView (source of truth for rendering)
  // ============================================================
  const compiledView = computed((): CompiledHeroView => {
    // Get current config (foreground is already in repoConfig via computed setter)
    const config: HeroViewConfig = repoConfig.value

    // Create color context with font resolver
    const colorContext = {
      ...foregroundColorContext.value,
      fontResolver,
    }

    return compileHeroView(
      config,
      primitivePalette.value,
      isDark.value,
      { foregroundColorContext: colorContext }
    )
  })

  // ============================================================
  // ForegroundElement Usecase
  // ============================================================
  let _foregroundElementUsecase: ReturnType<typeof createForegroundElementUsecase> | null = null

  const getForegroundElementUsecase = () => {
    if (!_foregroundElementUsecase) {
      const foregroundConfigPort: ForegroundConfigPort = {
        get: () => foregroundConfig.value,
        set: (config: ForegroundLayerConfig) => {
          foregroundConfig.value = config
        },
      }

      const foregroundSelectionPort: SelectionPort = {
        getSelectedId: () => selectedForegroundElementId.value,
        setSelectedId: (id: string | null) => {
          selectedForegroundElementId.value = id
        },
        clearCanvasSelection,
      }

      _foregroundElementUsecase = createForegroundElementUsecase({
        foregroundConfig: foregroundConfigPort,
        selection: foregroundSelectionPort,
      })
    }
    return _foregroundElementUsecase
  }

  const foregroundElementUsecase: ForegroundElementUsecaseReturn = {
    getSelectedElement: () => getForegroundElementUsecase().getSelectedElement(),
    selectElement: (elementId: string | null) => getForegroundElementUsecase().selectElement(elementId),
    addElement: (type: 'title' | 'description') => getForegroundElementUsecase().addElement(type),
    removeElement: (elementId: string) => getForegroundElementUsecase().removeElement(elementId),
    updateElement: (elementId: string, updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) =>
      getForegroundElementUsecase().updateElement(elementId, updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateElement']>[1]),
    updateSelectedElement: (updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) =>
      getForegroundElementUsecase().updateSelectedElement(updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateSelectedElement']>[0]),
  }

  return {
    compiledView,
    foregroundElementUsecase,
  }
}
