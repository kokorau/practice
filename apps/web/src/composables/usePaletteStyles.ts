import { watch, onMounted, onUnmounted, type Ref } from 'vue'
import { toCSSText, toCSSRuleSetsText } from '../modules/SemanticColorPalette/Infra'
import type { SemanticColorPalette } from '../modules/SemanticColorPalette/Domain'

// ============================================================
// Types
// ============================================================

export interface UsePaletteStylesOptions {
  cssSelector?: string
  dataAttribute?: string
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for injecting dynamic palette CSS styles into the document head.
 *
 * Creates a <style> element that contains CSS custom properties and rule sets
 * derived from the semantic palette. The styles are automatically updated when
 * the palette changes and cleaned up when the component unmounts.
 *
 * @param semanticPalette - Reactive reference to the semantic color palette
 * @param options - Configuration options
 * @param options.cssSelector - CSS selector for scoping the palette variables (default: '.hero-palette-preview')
 * @param options.dataAttribute - Data attribute name for the style element (default: 'data-hero-palette')
 */
export function usePaletteStyles(
  semanticPalette: Ref<SemanticColorPalette>,
  options: UsePaletteStylesOptions = {}
) {
  const {
    cssSelector = '.hero-palette-preview',
    dataAttribute = 'data-hero-palette',
  } = options

  let styleElement: HTMLStyleElement | null = null

  const updateStyles = () => {
    if (!styleElement) return
    const colorVariables = toCSSText(semanticPalette.value, cssSelector)
    const cssRuleSets = toCSSRuleSetsText()
    styleElement.textContent = `${colorVariables}\n\n${cssRuleSets}`
  }

  watch(semanticPalette, updateStyles)

  onMounted(() => {
    styleElement = document.createElement('style')
    styleElement.setAttribute(dataAttribute, '')
    document.head.appendChild(styleElement)
    updateStyles()
  })

  onUnmounted(() => {
    if (styleElement) {
      document.head.removeChild(styleElement)
      styleElement = null
    }
  })

  return {
    updateStyles,
  }
}
