<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { PreviewArtifact, ArtifactChangeType } from '../../modules/SiteSimulator/Domain'
import { TemplateRepository } from '../../modules/SiteSimulator/Infra'

const props = defineProps<{
  artifact: PreviewArtifact | null
  lastChangeType: ArtifactChangeType | null
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const previewWidth = ref(1280)
const iframeHeight = ref(800)

const baseTemplate = computed(() => TemplateRepository.getDefaultBase())

// ============================================================
// srcdoc管理（refで管理し、HTML変更時のみ更新）
// ============================================================
const srcdoc = ref('')

const generateSrcdoc = (artifact: PreviewArtifact): string => {
  const template = baseTemplate.value?.meta.template
  if (!template) {
    return `<!DOCTYPE html><html><body>No base template found</body></html>`
  }

  return template
    .replace('{{fonts}}', artifact.fonts)
    .replace('{{styles}}', artifact.css)
    .replace('{{sections}}', artifact.html)
}

// ============================================================
// Artifact変更時の更新処理
// ============================================================
watch(
  () => props.artifact,
  async (newArtifact, oldArtifact) => {
    if (!newArtifact) return

    const changeType = props.lastChangeType

    // 初回または HTML変更時またはboth → srcdoc更新（iframe reload）
    if (!oldArtifact || changeType === 'html' || changeType === 'both') {
      srcdoc.value = generateSrcdoc(newArtifact)
      return
    }

    // CSS変更のみ → contentDocument経由で更新（no reload）
    if (changeType === 'css') {
      await nextTick()
      const iframe = iframeRef.value
      if (!iframe?.contentDocument) return

      // style要素を更新
      const styleEl = iframe.contentDocument.querySelector('#dynamic-styles')
      if (styleEl) {
        styleEl.textContent = newArtifact.css
      }

      // font linkを更新
      const head = iframe.contentDocument.head
      let fontLinkEl = head.querySelector('link[href*="fonts.googleapis.com"]')

      if (newArtifact.fonts) {
        const hrefMatch = newArtifact.fonts.match(/href="([^"]+)"/)
        const newHref = hrefMatch ? hrefMatch[1] : ''

        if (fontLinkEl) {
          fontLinkEl.setAttribute('href', newHref)
        } else {
          const newLink = iframe.contentDocument.createElement('link')
          newLink.rel = 'stylesheet'
          newLink.href = newHref
          head.appendChild(newLink)
        }
      } else if (fontLinkEl) {
        fontLinkEl.remove()
      }
    }
  },
  { immediate: true, flush: 'post' }
)

// ============================================================
// Resize & Width Presets
// ============================================================
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
  if (targetWidth <= 0) return 0.5
  if (iframeWidth.value <= targetWidth) return 1
  return targetWidth / iframeWidth.value
})

const updateIframeHeight = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument?.body) return
  iframeHeight.value = iframe.contentDocument.body.scrollHeight
}

const onIframeLoad = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument?.body) return

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
