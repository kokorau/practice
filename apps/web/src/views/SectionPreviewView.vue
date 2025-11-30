<template>
  <div class="grid grid-cols-[260px_1fr] h-screen bg-white">
    <!-- Left Panel -->
    <div class="border-r border-black/10 flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-black/10">
        <h2
          class="text-sm font-medium text-black"
          :class="currentPage !== 'home' ? 'cursor-pointer hover:opacity-60' : ''"
          @click="currentPage !== 'home' && (currentPage = 'home')"
        >
          <span v-if="currentPage !== 'home'">← </span>{{ currentPageTitle }}
        </h2>
      </div>

      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto p-2">
        <!-- Home -->
        <ul v-if="currentPage === 'home'">
          <li
            v-for="page in pages"
            :key="page.id"
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentPage = page.id"
          >
            <span class="text-sm">{{ page.label }}</span>
            <span class="text-xs text-black/40">{{ page.value }}</span>
          </li>
        </ul>

        <!-- Section Type -->
        <ul v-if="currentPage === 'section'">
          <li
            v-for="type in sectionTypes"
            :key="type.id"
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="sectionType = type.id"
          >
            <span class="w-4 text-center">{{ sectionType === type.id ? '●' : '' }}</span>
            <span>{{ type.label }}</span>
          </li>
        </ul>

        <!-- Palette -->
        <ul v-if="currentPage === 'palette'">
          <li
            v-for="preset in presets"
            :key="preset.id"
            class="flex items-center gap-2 px-3 py-2 text-black cursor-pointer hover:bg-black/5"
            @click="selectedPresetId = preset.id"
          >
            <span class="w-4 text-center text-sm">{{ selectedPresetId === preset.id ? '●' : '' }}</span>
            <div class="flex">
              <span
                v-for="(color, i) in getPresetColors(preset)"
                :key="color.name"
                class="w-5 h-5 first:rounded-l last:rounded-r"
                :class="i !== 0 ? '-ml-0.5' : ''"
                :style="{ backgroundColor: color.css }"
              />
            </div>
            <span class="text-xs">{{ preset.name }}</span>
          </li>
        </ul>

        <!-- Mode -->
        <ul v-if="currentPage === 'mode'">
          <li
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="isDark = false"
          >
            <span class="w-4 text-center">{{ !isDark ? '●' : '' }}</span>
            <span>Light</span>
          </li>
          <li
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="isDark = true"
          >
            <span class="w-4 text-center">{{ isDark ? '●' : '' }}</span>
            <span>Dark</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right Panel: Preview -->
    <div class="p-6 flex flex-col gap-4 overflow-y-auto bg-black/[0.02]">
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="min-h-[200px]" v-html="renderedHtml"></div>
      </div>

      <details class="bg-black rounded-lg">
        <summary class="px-4 py-2.5 text-xs text-white/60 cursor-pointer">HTML</summary>
        <pre class="px-4 pb-4 overflow-x-auto text-xs leading-relaxed"><code class="text-white/80 whitespace-pre-wrap break-all">{{ renderedHtml }}</code></pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Section, SectionType, HeroContent, FeatureContent, TextContent } from '../modules/Section/Domain/ValueObject'
import { renderSection } from '../modules/Section/Domain/ValueObject'
import type { PalettePreset } from '../modules/ColorPalette/Domain/ValueObject'
import { generateOklchPalette, PalettePresets } from '../modules/ColorPalette/Domain/ValueObject'
import type { Srgb } from '../modules/Color/Domain/ValueObject'

type PageId = 'home' | 'section' | 'palette' | 'mode'

const currentPage = ref<PageId>('home')
const sectionType = ref<SectionType>('hero')
const selectedPresetId = ref('ocean')
const isDark = ref(false)

const sectionTypes = [
  { id: 'hero' as SectionType, label: 'Hero' },
  { id: 'feature' as SectionType, label: 'Feature' },
  { id: 'text' as SectionType, label: 'Text' },
]

const currentSectionLabel = computed(() =>
  sectionTypes.find(t => t.id === sectionType.value)?.label ?? ''
)

const currentPresetLabel = computed(() =>
  PalettePresets.find(p => p.id === selectedPresetId.value)?.name ?? ''
)

const pages = computed(() => [
  { id: 'section' as PageId, label: 'Section', value: currentSectionLabel.value },
  { id: 'palette' as PageId, label: 'Palette', value: currentPresetLabel.value },
  { id: 'mode' as PageId, label: 'Mode', value: isDark.value ? 'Dark' : 'Light' },
])

const currentPageTitle = computed(() => {
  if (currentPage.value === 'home') return 'Section Preview'
  return pages.value.find(p => p.id === currentPage.value)?.label ?? ''
})

const presets = PalettePresets

const srgbToCss = (color: Srgb): string => {
  return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`
}

const getPresetColors = (preset: PalettePreset) => {
  const p = generateOklchPalette({ ...preset.config, isDark: isDark.value })
  return [
    { name: 'base', css: srgbToCss(p.base) },
    { name: 'brand', css: srgbToCss(p.brand) },
    { name: 'primary', css: srgbToCss(p.primary) },
    { name: 'secondary', css: srgbToCss(p.secondary) },
  ]
}

const palette = computed(() => {
  const preset = presets.find(p => p.id === selectedPresetId.value) ?? presets[0]!
  return generateOklchPalette({ ...preset.config, isDark: isDark.value })
})

const section = computed<Section>(() => ({
  id: 'preview',
  type: sectionType.value,
}))

const heroContent: HeroContent = {
  title: 'Build Something Amazing',
  subtitle: 'Create beautiful, responsive websites with our powerful design system.',
  ctaText: 'Get Started',
}

const featureContent: FeatureContent = {
  title: 'Features',
  description: 'Everything you need to build modern web applications.',
  items: [
    { title: 'Fast', description: 'Optimized for speed and performance.' },
    { title: 'Flexible', description: 'Customize everything to your needs.' },
    { title: 'Beautiful', description: 'Stunning designs out of the box.' },
  ],
}

const textContent: TextContent = {
  title: 'About Us',
  body: 'We are a team of passionate developers and designers dedicated to creating the best possible experience for our users. Our mission is to make web development accessible to everyone, regardless of their technical background.',
}

const content = computed(() => {
  switch (sectionType.value) {
    case 'hero':
    case 'cta':
      return heroContent
    case 'feature':
    case 'gallery':
      return featureContent
    case 'text':
      return textContent
  }
})

const renderedHtml = computed(() => {
  return renderSection(section.value, palette.value, content.value)
})
</script>

