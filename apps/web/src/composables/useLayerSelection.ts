import { ref, computed, readonly, inject, provide, type InjectionKey, type Ref, type DeepReadonly } from 'vue'
import type { HtmlLayerId, ProcessorType, LayerSelection } from '@practice/section-visual'

// Re-export types for backward compatibility
export type { HtmlLayerId, ProcessorType, LayerSelection } from '@practice/section-visual'

export interface LayerSelectionReturn {
  // State (readonly)
  layerId: DeepReadonly<Ref<string | null>>
  processorType: DeepReadonly<Ref<ProcessorType | null>>
  processorLayerId: DeepReadonly<Ref<string | null>>
  htmlLayerId: DeepReadonly<Ref<HtmlLayerId | null>>

  // Computed
  selection: Ref<LayerSelection>
  isCanvasLayerSelected: Ref<boolean>
  isHtmlLayerSelected: Ref<boolean>
  isProcessorSelected: Ref<boolean>

  // Actions
  selectCanvasLayer: (id: string) => void
  selectProcessor: (layerIdValue: string, type: ProcessorType) => void
  selectHtmlLayer: (id: HtmlLayerId) => void
  clearSelection: () => void
  clearProcessorSelection: () => void
}

// ============================================================
// Injection Key
// ============================================================

export const LayerSelectionKey: InjectionKey<LayerSelectionReturn> = Symbol('LayerSelection')

// ============================================================
// Factory Function
// ============================================================

export function createLayerSelection(): LayerSelectionReturn {
  const layerId = ref<string | null>(null)
  const processorType = ref<ProcessorType | null>(null)
  const processorLayerId = ref<string | null>(null)
  const htmlLayerId = ref<HtmlLayerId | null>(null)

  // ============================================================
  // Computed
  // ============================================================

  const isCanvasLayerSelected = computed(() => layerId.value !== null)
  const isHtmlLayerSelected = computed(() => htmlLayerId.value !== null)
  const isProcessorSelected = computed(() => processorType.value !== null)

  const selection = computed<LayerSelection>(() => ({
    layerId: layerId.value,
    processorType: processorType.value,
    processorLayerId: processorLayerId.value,
    htmlLayerId: htmlLayerId.value,
  }))

  // ============================================================
  // Actions
  // ============================================================

  function selectCanvasLayer(id: string) {
    layerId.value = id
    processorType.value = null
    processorLayerId.value = null
    // Clear HTML selection when selecting canvas layer
    htmlLayerId.value = null
  }

  function selectProcessor(layerIdValue: string, type: ProcessorType) {
    processorType.value = type
    processorLayerId.value = layerIdValue
    // Keep layerId as is (processor belongs to the layer)
    // Clear HTML selection
    htmlLayerId.value = null
  }

  function selectHtmlLayer(id: HtmlLayerId) {
    htmlLayerId.value = id
    // Clear canvas layer selection
    layerId.value = null
    processorType.value = null
    processorLayerId.value = null
  }

  function clearSelection() {
    layerId.value = null
    processorType.value = null
    processorLayerId.value = null
    htmlLayerId.value = null
  }

  function clearProcessorSelection() {
    processorType.value = null
    processorLayerId.value = null
  }

  return {
    // State (readonly)
    layerId: readonly(layerId),
    processorType: readonly(processorType),
    processorLayerId: readonly(processorLayerId),
    htmlLayerId: readonly(htmlLayerId),

    // Computed
    selection,
    isCanvasLayerSelected,
    isHtmlLayerSelected,
    isProcessorSelected,

    // Actions
    selectCanvasLayer,
    selectProcessor,
    selectHtmlLayer,
    clearSelection,
    clearProcessorSelection,
  }
}

// ============================================================
// Provider Function
// ============================================================

export function provideLayerSelection(): LayerSelectionReturn {
  const layerSelection = createLayerSelection()
  provide(LayerSelectionKey, layerSelection)
  return layerSelection
}

// ============================================================
// Composable (inject-based)
// ============================================================

export function useLayerSelection(): LayerSelectionReturn {
  const injected = inject(LayerSelectionKey)
  if (!injected) {
    throw new Error('useLayerSelection must be used within a component that has called provideLayerSelection')
  }
  return injected
}
