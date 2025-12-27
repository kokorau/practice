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
  <div class="flex flex-col h-full bg-gray-800">
    <!-- No selection -->
    <div v-if="!asset" class="flex-1 flex items-center justify-center text-gray-500">
      <p class="text-sm">Select a file to preview</p>
    </div>

    <!-- Asset selected -->
    <template v-else>
      <!-- Preview area -->
      <div class="flex-1 overflow-auto bg-gray-900">
        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center h-full text-gray-500">
          Loading...
        </div>

        <!-- Image preview -->
        <template v-else-if="previewType === 'image'">
          <div class="flex items-center justify-center h-full p-4">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="asset.name"
              class="max-w-full max-h-full object-contain"
            />
          </div>
        </template>

        <!-- Font preview -->
        <template v-else-if="previewType === 'font' && fontFamily">
          <div class="p-6 space-y-6">
            <!-- Size samples -->
            <div
              v-for="size in fontSizes"
              :key="size"
              class="border-b border-gray-700 pb-4"
            >
              <div class="text-xs text-gray-500 mb-1">{{ size }}px</div>
              <div
                class="text-white"
                :style="{ fontFamily: fontFamily, fontSize: `${size}px` }"
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
              </div>
              <div
                class="text-white"
                :style="{ fontFamily: fontFamily, fontSize: `${size}px` }"
              >
                abcdefghijklmnopqrstuvwxyz
              </div>
            </div>

            <!-- Sample texts -->
            <div
              v-for="sample in fontSamples"
              :key="sample.label"
              class="border-b border-gray-700 pb-4"
            >
              <div class="text-xs text-gray-500 mb-1">{{ sample.label }}</div>
              <div
                class="text-white text-2xl"
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
            class="p-6 prose prose-invert prose-sm max-w-none"
            v-html="renderedMarkdown"
          />
        </template>

        <!-- Code preview -->
        <template v-else-if="previewType === 'code'">
          <pre class="p-4 text-sm overflow-auto h-full"><code v-html="highlightedCode" /></pre>
        </template>

        <!-- Plain text preview -->
        <template v-else-if="previewType === 'text'">
          <pre class="p-4 text-sm text-gray-300 whitespace-pre-wrap">{{ textContent }}</pre>
        </template>

        <!-- Video preview -->
        <template v-else-if="previewType === 'video'">
          <div class="flex items-center justify-center h-full text-gray-500 text-sm">
            Video preview not implemented
          </div>
        </template>

        <!-- Audio preview -->
        <template v-else-if="previewType === 'audio'">
          <div class="flex items-center justify-center h-full text-gray-500 text-sm">
            Audio preview not implemented
          </div>
        </template>

        <!-- Other types -->
        <template v-else>
          <div class="flex flex-col items-center justify-center h-full text-gray-500">
            <div class="text-4xl mb-2">{{ asset.meta.type }}</div>
            <div class="text-sm">No preview available</div>
          </div>
        </template>
      </div>

      <!-- Info panel -->
      <div class="flex-shrink-0 border-t border-gray-700 p-4 space-y-2">
        <h3 class="font-medium text-white truncate" :title="asset.name">{{ asset.name }}</h3>

        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span class="text-gray-500">Type</span>
          <span class="text-gray-300">{{ asset.meta.mimeType }}</span>

          <span class="text-gray-500">Size</span>
          <span class="text-gray-300">{{ formatSize(asset.meta.size) }}</span>

          <span class="text-gray-500">Created</span>
          <span class="text-gray-300">{{ formatDate(asset.meta.createdAt) }}</span>
        </div>

        <!-- Title & Description -->
        <div v-if="asset.meta.title || asset.meta.description" class="pt-2 border-t border-gray-700">
          <div v-if="asset.meta.title && asset.meta.title !== asset.name" class="text-sm">
            <span class="text-gray-500">Title: </span>
            <span class="text-gray-300">{{ asset.meta.title }}</span>
          </div>
          <div v-if="asset.meta.description" class="text-sm text-gray-400 mt-1">
            {{ asset.meta.description }}
          </div>
        </div>

        <!-- Tags -->
        <div v-if="asset.meta.tags.length > 0" class="flex flex-wrap gap-1 pt-2">
          <span
            v-for="tag in asset.meta.tags"
            :key="tag"
            class="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* Prism.js overrides for dark theme */
pre[class*='language-'],
code[class*='language-'] {
  background: transparent;
}
</style>
