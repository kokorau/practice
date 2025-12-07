<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { SectionContent, RenderedPalette, FontConfig } from '../../modules/SiteSimulator/Domain/ValueObject'
import { $RenderedPalette } from '../../modules/SiteSimulator/Domain/ValueObject'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss, gapToMultiplier, paddingToMultiplier } from '../../modules/StylePack/Domain/ValueObject'
import { TemplateRenderer, TemplateRepository } from '../../modules/SiteSimulator/Infra'

const props = defineProps<{
  sections: readonly SectionContent[]
  renderedPalette: RenderedPalette
  font: FontConfig
  stylePack: StylePack
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const previewWidth = ref(1280)
const iframeHeight = ref(800) // default height

// ============================================================
// HTML構造（セクション内容のみに依存、パレット/スタイル変更時も変わらない）
// ============================================================
const renderedHtml = computed(() => {
  return props.sections
    .map(section => TemplateRenderer.render(section))
    .join('\n')
})

const templateStyles = computed(() => {
  return TemplateRepository.getStylesForSections(
    props.sections.map(s => ({ id: s.id, templateId: s.templateId }))
  )
})

const googleFontLink = computed(() => {
  const source = props.font.source
  if (source.vendor === 'google') {
    return `<link href="${source.url}" rel="stylesheet">`
  }
  return ''
})

const baseTemplate = computed(() => TemplateRepository.getDefaultBase())

// ============================================================
// CSS（パレット・フォント・スタイルパック変更時に変わる）
// ============================================================
const combinedStyles = computed(() => {
  const cssVars = $RenderedPalette.toCssVariables(props.renderedPalette)
  const baseStyle = baseTemplate.value?.meta.style ?? ''

  // スタイルパックの値をCSS変数として定義
  const dynamicVars = `:root {
  --font-family: ${props.font.family};
  --site-border-radius: ${roundedToCss[props.stylePack.rounded]};
  --site-padding-base: ${paddingToMultiplier[props.stylePack.padding]}rem;
  --site-gap: ${gapToMultiplier[props.stylePack.gap]}rem;
}`

  return `/* === Dynamic Variables === */
${dynamicVars}

/* === Color Variables === */
${cssVars}

/* === Base Template Styles === */
${baseStyle}

/* === Section Styles === */
${templateStyles.value}`
})

// ============================================================
// srcdoc管理（refで管理し、HTML変更時のみ更新）
// ============================================================
const srcdoc = ref('')

const generateSrcdoc = (html: string, css: string, fonts: string): string => {
  const template = baseTemplate.value?.meta.template
  if (!template) {
    return `<!DOCTYPE html><html><body>No base template found</body></html>`
  }

  return template
    .replace('{{fonts}}', fonts)
    .replace('{{styles}}', css)
    .replace('{{sections}}', html)
}

// 初期srcdocを生成
srcdoc.value = generateSrcdoc(renderedHtml.value, combinedStyles.value, googleFontLink.value)

// HTML構造が変わった場合のみsrcdocを更新（iframe reload）
watch(
  renderedHtml,
  (newHtml) => {
    srcdoc.value = generateSrcdoc(newHtml, combinedStyles.value, googleFontLink.value)
  }
)

// CSS変更時はcontentDocument経由でstyle要素を更新（no reload）
watch(
  combinedStyles,
  async (newCss) => {
    await nextTick()
    const iframe = iframeRef.value
    if (!iframe?.contentDocument) return

    const styleEl = iframe.contentDocument.querySelector('#dynamic-styles')
    if (styleEl) {
      styleEl.textContent = newCss
    }
  },
  { flush: 'post' }
)

// フォント変更時はcontentDocument経由でlinkタグを更新（no reload）
watch(
  googleFontLink,
  async (newFontLink) => {
    await nextTick()
    const iframe = iframeRef.value
    if (!iframe?.contentDocument) return

    // 既存のGoogle Fontリンクを探して更新、なければ追加
    const head = iframe.contentDocument.head
    let fontLinkEl = head.querySelector('link[href*="fonts.googleapis.com"]')

    if (newFontLink) {
      // 新しいURLを抽出
      const hrefMatch = newFontLink.match(/href="([^"]+)"/)
      const newHref = hrefMatch ? hrefMatch[1] : ''

      if (fontLinkEl) {
        fontLinkEl.setAttribute('href', newHref)
      } else {
        // 新しいlinkタグを作成
        const newLink = iframe.contentDocument.createElement('link')
        newLink.rel = 'stylesheet'
        newLink.href = newHref
        head.appendChild(newLink)
      }
    } else if (fontLinkEl) {
      // フォントリンクが不要になった場合は削除
      fontLinkEl.remove()
    }
  },
  { flush: 'post' }
)

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
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

const iframeWidth = computed(() => widthPresets[widthPreset.value])
const scale = computed(() => {
  const targetWidth = previewWidth.value
  if (targetWidth <= 0) return 0.5 // 最小スケール
  if (iframeWidth.value <= targetWidth) return 1
  return targetWidth / iframeWidth.value
})

const updateIframeHeight = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument?.body) return

  // Get content height
  const contentHeight = iframe.contentDocument.body.scrollHeight
  iframeHeight.value = contentHeight
}

const onIframeLoad = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument?.body) return

  // Wait for images to load before calculating height
  const images = iframe.contentDocument.querySelectorAll('img')
  const imagePromises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve()
    return new Promise<void>(resolve => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
  })

  Promise.all(imagePromises).then(() => {
    updateIframeHeight()
  })

  // Also observe for content changes
  const resizeObserver = new ResizeObserver(() => {
    updateIframeHeight()
  })
  resizeObserver.observe(iframe.contentDocument.body)
}
</script>

<template>
  <div ref="containerRef" class="demo-preview">
    <!-- iframe container -->
    <div class="iframe-container">
      <div
        class="iframe-wrapper"
        :style="{
          width: iframeWidth * scale + 'px',
          height: iframeHeight * scale + 'px',
        }"
      >
        <iframe
          ref="iframeRef"
          :srcdoc="srcdoc"
          :style="{
            width: iframeWidth + 'px',
            height: iframeHeight + 'px',
            transform: `scale(${scale})`,
          }"
          class="preview-iframe"
          sandbox="allow-same-origin"
          @load="onIframeLoad"
        />
      </div>
    </div>

    <!-- Width selector (bottom center) -->
    <div class="width-selector">
      <button
        v-for="(width, key) in widthPresets"
        :key="key"
        class="width-btn"
        :class="{ active: widthPreset === key }"
        :title="`${key} (${width}px)`"
        @click="widthPreset = key"
      >
        <span class="material-icons">
          {{ key === 'desktop' ? 'computer' : key === 'tablet' ? 'tablet' : 'smartphone' }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.demo-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.width-selector {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(31, 41, 55, 0.95);
  border-radius: 0.5rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.width-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.width-btn .material-icons {
  font-size: 1.25rem;
}

.width-btn:hover {
  color: white;
  background: rgba(55, 65, 81, 0.5);
}

.width-btn.active {
  color: white;
  background: #3b82f6;
}

.iframe-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  padding: 1rem;
}

.iframe-wrapper {
  position: relative;
  border-radius: 0.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.preview-iframe {
  border: none;
  background: white;
  transform-origin: top left;
}
</style>
