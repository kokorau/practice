import { ref, computed, readonly } from 'vue'

// ============================================================
// Types
// ============================================================

export type HtmlLayerId = 'title' | 'description'
export type ProcessorType = 'effect' | 'mask' | 'processor'

export interface LayerSelection {
  // Canvas layer selection
  layerId: string | null
  processorType: ProcessorType | null
  processorLayerId: string | null
  // HTML layer selection
  htmlLayerId: HtmlLayerId | null
}

// ============================================================
// Store State (singleton)
// ============================================================

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

// ============================================================
// Composable
// ============================================================

export function useLayerSelection() {
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
