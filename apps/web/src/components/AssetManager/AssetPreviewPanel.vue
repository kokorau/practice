<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { marked } from 'marked'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import type { Asset } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'

const props = defineProps<{
  asset: Asset | null
}>()

const previewUrl = ref<string | null>(null)
const textContent = ref<string | null>(null)
const fontFamily = ref<string | null>(null)
const isLoading = ref(false)

/** フォントカウンター（一意なフォント名生成用） */
let fontCounter = 0

/** MIMEタイプからプレビュータイプを判定 */
type PreviewType = 'image' | 'markdown' | 'code' | 'text' | 'font' | 'video' | 'audio' | 'none'

const getPreviewType = (mimeType: string, fileName: string): PreviewType => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('font/') || fileName.match(/\.(woff2?|ttf|otf|eot)$/i)) return 'font'

  // Markdown
  if (mimeType === 'text/markdown' || fileName.endsWith('.md')) return 'markdown'

  // Code files
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.vue', '.json', '.css', '.html', '.xml']
  const codeMimeTypes = ['application/json', 'application/javascript', 'text/javascript']
  if (codeExtensions.some((ext) => fileName.endsWith(ext)) || codeMimeTypes.includes(mimeType)) {
    return 'code'
  }

  // Plain text
  if (mimeType.startsWith('text/')) return 'text'

  return 'none'
}

/** 拡張子からPrism言語を取得 */
const getPrismLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'markup',
    xml: 'markup',
    vue: 'markup',
  }
  return langMap[ext ?? ''] ?? 'plaintext'
}

const previewType = computed<PreviewType>(() => {
  if (!props.asset) return 'none'
  return getPreviewType(props.asset.meta.mimeType, props.asset.name)
})

const highlightedCode = computed(() => {
  if (!textContent.value || previewType.value !== 'code') return ''
  const lang = getPrismLanguage(props.asset?.name ?? '')
  const grammar = Prism.languages[lang]
  if (!grammar) return escapeHtml(textContent.value)
  return Prism.highlight(textContent.value, grammar, lang)
})

const renderedMarkdown = computed(() => {
  if (!textContent.value || previewType.value !== 'markdown') return ''
  return marked(textContent.value)
})

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatDate = (date: Date) => {
  return date.toLocaleString()
}

// Clean up previous URL
const revokeUrl = () => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
}

/** フォントを動的に読み込む */
const loadFont = async (url: string, name: string): Promise<string> => {
  const familyName = `preview-font-${++fontCounter}-${name.replace(/[^a-zA-Z0-9]/g, '-')}`
  const fontFace = new FontFace(familyName, `url(${url})`)
  await fontFace.load()
  document.fonts.add(fontFace)
  return familyName
}

/** フォントサンプルテキスト */
const fontSamples = [
  { label: 'English', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'Numbers', text: '0123456789' },
  { label: 'Japanese', text: 'あいうえお かきくけこ 日本語テスト' },
]

const fontSizes = [12, 16, 24, 32, 48]

watch(
  () => props.asset,
  async (asset) => {
    revokeUrl()
    textContent.value = null
    fontFamily.value = null

    if (!asset) return

    isLoading.value = true
    try {
      const type = getPreviewType(asset.meta.mimeType, asset.name)

      if (type === 'image') {
        previewUrl.value = await $Asset.toObjectUrl(asset)
      } else if (type === 'font') {
        const url = await $Asset.toObjectUrl(asset)
        previewUrl.value = url
        fontFamily.value = await loadFont(url, asset.name)
      } else if (type === 'markdown' || type === 'code' || type === 'text') {
        const blob = await $Asset.toBlob(asset)
        textContent.value = await blob.text()
      }
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  revokeUrl()
})
</script>

<template>
  <div class="preview-container">
    <!-- No selection -->
    <div v-if="!asset" class="preview-empty">
      <p class="preview-empty-text">Select a file to preview</p>
    </div>

    <!-- Asset selected -->
    <template v-else>
      <!-- Preview area -->
      <div class="preview-area">
        <!-- Loading -->
        <div v-if="isLoading" class="preview-loading">
          Loading...
        </div>

        <!-- Image preview -->
        <template v-else-if="previewType === 'image'">
          <div class="preview-image-wrapper">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="asset.name"
              class="preview-image"
            />
          </div>
        </template>

        <!-- Font preview -->
        <template v-else-if="previewType === 'font' && fontFamily">
          <div class="preview-font">
            <!-- Size samples -->
            <div
              v-for="size in fontSizes"
              :key="size"
              class="font-sample"
            >
              <div class="font-sample-label">{{ size }}px</div>
              <div
                class="font-sample-text"
                :style="{ fontFamily: fontFamily, fontSize: `${size}px` }"
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
              </div>
              <div
                class="font-sample-text"
                :style="{ fontFamily: fontFamily, fontSize: `${size}px` }"
              >
                abcdefghijklmnopqrstuvwxyz
              </div>
            </div>

            <!-- Sample texts -->
            <div
              v-for="sample in fontSamples"
              :key="sample.label"
              class="font-sample"
            >
              <div class="font-sample-label">{{ sample.label }}</div>
              <div
                class="font-sample-text font-sample-text-lg"
                :style="{ fontFamily: fontFamily }"
              >
                {{ sample.text }}
              </div>
            </div>
          </div>
        </template>

        <!-- Markdown preview -->
        <template v-else-if="previewType === 'markdown'">
          <div
            class="preview-markdown prose prose-sm max-w-none"
            v-html="renderedMarkdown"
          />
        </template>

        <!-- Code preview -->
        <template v-else-if="previewType === 'code'">
          <pre class="preview-code"><code v-html="highlightedCode" /></pre>
        </template>

        <!-- Plain text preview -->
        <template v-else-if="previewType === 'text'">
          <pre class="preview-text">{{ textContent }}</pre>
        </template>

        <!-- Video preview -->
        <template v-else-if="previewType === 'video'">
          <div class="preview-unsupported">
            Video preview not implemented
          </div>
        </template>

        <!-- Audio preview -->
        <template v-else-if="previewType === 'audio'">
          <div class="preview-unsupported">
            Audio preview not implemented
          </div>
        </template>

        <!-- Other types -->
        <template v-else>
          <div class="preview-unsupported">
            <div class="preview-unsupported-type">{{ asset.meta.type }}</div>
            <div class="preview-unsupported-text">No preview available</div>
          </div>
        </template>
      </div>

      <!-- Info panel -->
      <div class="info-panel">
        <h3 class="info-filename" :title="asset.name">{{ asset.name }}</h3>

        <div class="info-grid">
          <span class="info-label">Type</span>
          <span class="info-value info-value-break">{{ asset.meta.mimeType }}</span>

          <span class="info-label">Size</span>
          <span class="info-value">{{ formatSize(asset.meta.size) }}</span>

          <span class="info-label">Created</span>
          <span class="info-value">{{ formatDate(asset.meta.createdAt) }}</span>
        </div>

        <!-- Title & Description -->
        <div v-if="asset.meta.title || asset.meta.description" class="info-extra">
          <div v-if="asset.meta.title && asset.meta.title !== asset.name" class="info-extra-row">
            <span class="info-label">Title: </span>
            <span class="info-value">{{ asset.meta.title }}</span>
          </div>
          <div v-if="asset.meta.description" class="info-description">
            {{ asset.meta.description }}
          </div>
        </div>

        <!-- Tags -->
        <div v-if="asset.meta.tags.length > 0" class="info-tags">
          <span
            v-for="tag in asset.meta.tags"
            :key="tag"
            class="info-tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-empty-text {
  margin: 0;
  font-size: 0.875rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .preview-empty-text {
  color: oklch(0.55 0.02 260);
}

.preview-area {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .preview-loading {
  color: oklch(0.55 0.02 260);
}

.preview-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-font {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.font-sample {
  padding-bottom: 1rem;
  border-bottom: 1px solid oklch(0.85 0.01 260);
}

:global(.dark) .font-sample {
  border-bottom-color: oklch(0.30 0.02 260);
}

.font-sample-label {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.25rem;
}

:global(.dark) .font-sample-label {
  color: oklch(0.55 0.02 260);
}

.font-sample-text {
  color: oklch(0.25 0.02 260);
}

:global(.dark) .font-sample-text {
  color: oklch(0.90 0.01 260);
}

.font-sample-text-lg {
  font-size: 1.5rem;
}

.preview-markdown {
  padding: 1.5rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .preview-markdown {
  color: oklch(0.90 0.01 260);
}

.preview-code {
  padding: 1rem;
  font-size: 0.875rem;
  overflow: auto;
  height: 100%;
  margin: 0;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .preview-code {
  color: oklch(0.90 0.01 260);
}

.preview-text {
  padding: 1rem;
  font-size: 0.875rem;
  white-space: pre-wrap;
  margin: 0;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .preview-text {
  color: oklch(0.80 0.02 260);
}

.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: oklch(0.50 0.02 260);
  font-size: 0.875rem;
}

:global(.dark) .preview-unsupported {
  color: oklch(0.55 0.02 260);
}

.preview-unsupported-type {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.preview-unsupported-text {
  font-size: 0.875rem;
}

.info-panel {
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
  border-top: 1px solid oklch(0.85 0.01 260);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:global(.dark) .info-panel {
  border-top-color: oklch(0.30 0.02 260);
}

.info-filename {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.dark) .info-filename {
  color: oklch(0.90 0.01 260);
}

.info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  font-size: 0.8rem;
  width: 100%;
}

.info-label {
  color: oklch(0.50 0.02 260);
}

:global(.dark) .info-label {
  color: oklch(0.55 0.02 260);
}

.info-value {
  color: oklch(0.35 0.02 260);
  min-width: 0;
}

:global(.dark) .info-value {
  color: oklch(0.80 0.02 260);
}

.info-value-break {
  word-break: break-all;
}

.info-extra {
  padding-top: 0.5rem;
  border-top: 1px solid oklch(0.85 0.01 260);
}

:global(.dark) .info-extra {
  border-top-color: oklch(0.30 0.02 260);
}

.info-extra-row {
  font-size: 0.8rem;
}

.info-description {
  font-size: 0.8rem;
  color: oklch(0.45 0.02 260);
  margin-top: 0.25rem;
}

:global(.dark) .info-description {
  color: oklch(0.60 0.02 260);
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-top: 0.5rem;
}

.info-tag {
  padding: 0.125rem 0.5rem;
  font-size: 0.7rem;
  background: oklch(0.94 0.005 260);
  color: oklch(0.40 0.02 260);
  border-radius: 4px;
}

:global(.dark) .info-tag {
  background: oklch(0.22 0.02 260);
  color: oklch(0.70 0.02 260);
}
</style>

<style>
/* Prism.js overrides for dark theme */
pre[class*='language-'],
code[class*='language-'] {
  background: transparent;
}
</style>
