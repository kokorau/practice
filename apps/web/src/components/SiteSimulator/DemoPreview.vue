<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { SemanticColorToken, SectionContent, RenderedPalette } from '../../modules/SiteSimulator/Domain/ValueObject'
import { $RenderedPalette } from '../../modules/SiteSimulator/Domain/ValueObject'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss } from '../../modules/StylePack/Domain/ValueObject'
import { TemplateRenderer, TemplateRepository } from '../../modules/SiteSimulator/Infra'

const props = defineProps<{
  sections: readonly SectionContent[]
  getCssColor: (token: SemanticColorToken) => string
  renderedPalette: RenderedPalette
  font: FontPreset | undefined
  stylePack: StylePack
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const previewWidth = ref(1280)

const fontFamily = computed(() => props.font?.family ?? 'system-ui, sans-serif')
const borderRadius = computed(() => roundedToCss[props.stylePack.rounded])

const renderedHtml = computed(() => {
  return props.sections
    .map(section =>
      TemplateRenderer.render(section, {
        getCssColor: props.getCssColor,
        stylePack: props.stylePack,
      })
    )
    .join('\n')
})

const templateStyles = computed(() => {
  return TemplateRepository.getStylesForSections(
    props.sections.map(s => ({ id: s.id, templateId: s.templateId }))
  )
})

const googleFontLink = computed(() => {
  if (!props.font) return ''
  const family = props.font.family.replace(/ /g, '+')
  return `<link href="https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap" rel="stylesheet">`
})

const iframeSrcdoc = computed(() => {
  const cssVars = $RenderedPalette.toCssVariables(props.renderedPalette)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${googleFontLink.value}
  <style>
    /* === Color Variables === */
    ${cssVars}

    /* === Base Reset === */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: ${fontFamily.value}, system-ui, sans-serif;
      background-color: var(--color-surface-base);
      color: var(--color-text-primary);
      line-height: 1.5;
    }

    .site-container {
      border-radius: ${borderRadius.value};
      overflow: hidden;
      min-height: 100vh;
    }

    /* === Template Styles === */
    ${templateStyles.value}
  </style>
</head>
<body>
  <div class="site-container">
    ${renderedHtml.value}
  </div>
</body>
</html>`
})

// Resize observer for responsive preview
const containerRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (containerRef.value) {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        previewWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(containerRef.value)
    onUnmounted(() => resizeObserver.disconnect())
  }
})

// Width presets
type WidthPreset = 'desktop' | 'tablet' | 'mobile'
const widthPreset = ref<WidthPreset>('desktop')

const widthPresets: Record<WidthPreset, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
}

const iframeWidth = computed(() => widthPresets[widthPreset.value])
const scale = computed(() => {
  const maxWidth = previewWidth.value - 32 // padding
  if (iframeWidth.value <= maxWidth) return 1
  return maxWidth / iframeWidth.value
})
</script>

<template>
  <div ref="containerRef" class="demo-preview">
    <!-- Width selector -->
    <div class="width-selector">
      <button
        v-for="(width, key) in widthPresets"
        :key="key"
        class="width-btn"
        :class="{ active: widthPreset === key }"
        @click="widthPreset = key"
      >
        {{ key }} ({{ width }}px)
      </button>
    </div>

    <!-- iframe container -->
    <div class="iframe-container">
      <iframe
        ref="iframeRef"
        :srcdoc="iframeSrcdoc"
        :style="{
          width: iframeWidth + 'px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }"
        class="preview-iframe"
        sandbox="allow-same-origin"
      />
    </div>
  </div>
</template>

<style scoped>
.demo-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.width-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.width-btn {
  padding: 0.375rem 0.75rem;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 0.375rem;
  color: #9ca3af;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.width-btn:hover {
  background: #374151;
  color: white;
}

.width-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.iframe-container {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: #0a0a0a;
  border-radius: 0.5rem;
}

.preview-iframe {
  border: none;
  background: white;
  height: 2000px; /* tall enough for content */
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}
</style>
