<template>
  <div class="grid grid-cols-[260px_1fr] h-screen bg-white overflow-hidden">
    <!-- Left Panel -->
    <div class="border-r border-black/10 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-black/10">
        <h2
          class="text-sm font-medium text-black"
          :class="currentView !== 'home' ? 'cursor-pointer hover:opacity-60' : ''"
          @click="currentView !== 'home' && (currentView = 'home')"
        >
          <span v-if="currentView !== 'home'">← </span>{{ currentViewTitle }}
        </h2>
      </div>

      <!-- View Content -->
      <div class="flex-1 overflow-y-auto p-2">
        <!-- Home -->
        <ul v-if="currentView === 'home'">
          <li
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentView = 'sections'"
          >
            <span class="text-sm">Sections</span>
            <span class="text-xs text-black/40">{{ page.sections.length }}</span>
          </li>
          <li
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentView = 'palette'"
          >
            <span class="text-sm">Palette</span>
            <span class="text-xs text-black/40">{{ currentPresetLabel }}</span>
          </li>
          <li
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentView = 'mode'"
          >
            <span class="text-sm">Mode</span>
            <span class="text-xs text-black/40">{{ page.theme.isDark ? 'Dark' : 'Light' }}</span>
          </li>
          <li
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentView = 'filter'"
          >
            <span class="text-sm">Filter</span>
            <span class="text-xs text-black/40">{{ currentFilterLabel }}</span>
          </li>
          <li
            class="flex justify-between items-center px-3 py-2.5 text-black cursor-pointer hover:bg-black/5"
            @click="currentView = 'font'"
          >
            <span class="text-sm">Font</span>
            <span class="text-xs text-black/40">{{ currentFontLabel }}</span>
          </li>
        </ul>

        <!-- Sections List -->
        <div v-if="currentView === 'sections'">
          <ul>
            <li
              v-for="(section, index) in page.sections"
              :key="section.id"
              class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
              @click="editSection(index)"
            >
              <span class="flex-1">{{ getSectionLabel(section.type) }}</span>
              <span
                class="text-black/30 hover:text-black"
                @click.stop="removeSection(index)"
              >×</span>
            </li>
          </ul>
          <div
            class="px-3 py-2 text-sm text-black/50 cursor-pointer hover:text-black hover:bg-black/5"
            @click="addSection"
          >
            + Add Section
          </div>
        </div>

        <!-- Edit Section -->
        <ul v-if="currentView === 'edit-section' && editingIndex !== null">
          <li
            v-for="type in sectionTypes"
            :key="type.id"
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="setSectionType(type.id)"
          >
            <span class="w-4 text-center">{{ page.sections[editingIndex]?.type === type.id ? '●' : '' }}</span>
            <span>{{ type.label }}</span>
          </li>
        </ul>

        <!-- Palette -->
        <ul v-if="currentView === 'palette'">
          <li
            v-for="preset in presets"
            :key="preset.id"
            class="flex items-center gap-2 px-3 py-2 text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.paletteId = preset.id"
          >
            <span class="w-4 text-center text-sm">{{ page.theme.paletteId === preset.id ? '●' : '' }}</span>
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
        <ul v-if="currentView === 'mode'">
          <li
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.isDark = false"
          >
            <span class="w-4 text-center">{{ !page.theme.isDark ? '●' : '' }}</span>
            <span>Light</span>
          </li>
          <li
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.isDark = true"
          >
            <span class="w-4 text-center">{{ page.theme.isDark ? '●' : '' }}</span>
            <span>Dark</span>
          </li>
        </ul>

        <!-- Filter -->
        <ul v-if="currentView === 'filter'">
          <li
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.filterId = undefined"
          >
            <span class="w-4 text-center">{{ !page.theme.filterId ? '●' : '' }}</span>
            <span>None</span>
          </li>
          <li
            v-for="preset in filterPresets"
            :key="preset.id"
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.filterId = preset.id"
          >
            <span class="w-4 text-center">{{ page.theme.filterId === preset.id ? '●' : '' }}</span>
            <span>{{ preset.name }}</span>
          </li>
        </ul>

        <!-- Font -->
        <ul v-if="currentView === 'font'" class="space-y-0.5">
          <li
            v-for="font in GoogleFontPresets"
            :key="font.id"
            class="flex items-center gap-2 px-3 py-2 text-sm text-black cursor-pointer hover:bg-black/5"
            @click="page.theme.fontId = font.id"
          >
            <span class="w-4 text-center">{{ page.theme.fontId === font.id ? '●' : '' }}</span>
            <span>{{ font.name }}</span>
            <span class="text-xs text-black/30">{{ font.category }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right Panel: Preview -->
    <div class="overflow-y-auto bg-black/[0.02]">
      <div class="p-6">
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <div v-html="renderedHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { Page, SectionType, PageContents } from '../modules/Section/Domain/ValueObject'
import type {
  HeroContent,
  FeatureContent,
  TextContent,
  ThreeColumnTextContent,
  ImageTextContent,
  CTAContent,
  GalleryContent,
  FeatureCardContent,
  HeaderContent,
  FooterContent,
  AboutContent,
  SectionContent,
} from '../modules/Section/Domain/ValueObject/SectionTemplate'
import { renderPage } from '../modules/Section/Domain/ValueObject'
import type { PalettePreset } from '../modules/ColorPalette/Domain/ValueObject'
import { generateOklchPalette, PalettePresets, $ColorPalette } from '../modules/ColorPalette/Domain/ValueObject'
import type { Srgb } from '../modules/Color/Domain/ValueObject'
import { $Filter, $Preset } from '../modules/Filter/Domain'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { GoogleFontPresets } from '../assets/constants/GoogleFontPresets'

type ViewId = 'home' | 'sections' | 'edit-section' | 'palette' | 'mode' | 'filter' | 'font'

const currentView = ref<ViewId>('home')
const editingIndex = ref<number | null>(null)

// Filter presets
const filterPresets = getPresets()

const page = reactive<Page>({
  id: 'preview-page',
  theme: {
    paletteId: 'ocean',
    isDark: false,
    filterId: undefined,
    fontId: 'inter',
  },
  sections: [
    { id: 'header-1', type: 'header' },
    { id: 'hero-1', type: 'hero' },
    { id: 'about-1', type: 'about' },
    { id: 'feature-card-1', type: 'feature-card' },
    { id: 'image-text-1', type: 'image-text' },
    { id: 'gallery-1', type: 'gallery' },
    { id: 'cta-1', type: 'cta' },
    { id: 'footer-1', type: 'footer' },
  ],
})

const sectionTypes: { id: SectionType; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'About' },
  { id: 'three-column-text', label: '3 Column Text' },
  { id: 'image-text', label: 'Image + Text' },
  { id: 'feature', label: 'Feature List' },
  { id: 'feature-card', label: 'Feature Cards' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'cta', label: 'CTA' },
  { id: 'text', label: 'Text' },
  { id: 'footer', label: 'Footer' },
]

const getSectionLabel = (type: SectionType) =>
  sectionTypes.find(t => t.id === type)?.label ?? type

const currentPresetLabel = computed(() =>
  PalettePresets.find(p => p.id === page.theme.paletteId)?.name ?? ''
)

const currentFilterLabel = computed(() =>
  page.theme.filterId
    ? filterPresets.find(p => p.id === page.theme.filterId)?.name ?? 'Custom'
    : 'None'
)

const currentFontLabel = computed(() =>
  GoogleFontPresets.find(f => f.id === page.theme.fontId)?.name ?? 'System'
)

const currentFont = computed(() =>
  GoogleFontPresets.find(f => f.id === page.theme.fontId)
)

const currentViewTitle = computed(() => {
  switch (currentView.value) {
    case 'home': return 'Page Preview'
    case 'sections': return 'Sections'
    case 'edit-section': return 'Section Type'
    case 'palette': return 'Palette'
    case 'mode': return 'Mode'
    case 'filter': return 'Filter'
    case 'font': return 'Font'
  }
})

const presets = PalettePresets

const srgbToCss = (color: Srgb): string => {
  return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`
}

const getPresetColors = (preset: PalettePreset) => {
  const p = generateOklchPalette({ ...preset.config, isDark: page.theme.isDark })
  return [
    { name: 'base', css: srgbToCss(p.base) },
    { name: 'brand', css: srgbToCss(p.brand) },
    { name: 'primary', css: srgbToCss(p.primary) },
    { name: 'secondary', css: srgbToCss(p.secondary) },
  ]
}

const basePalette = computed(() => {
  const preset = presets.find(p => p.id === page.theme.paletteId) ?? presets[0]!
  return generateOklchPalette({ ...preset.config, isDark: page.theme.isDark })
})

const palette = computed(() => {
  const base = basePalette.value
  if (!page.theme.filterId) return base

  const filterPreset = filterPresets.find(p => p.id === page.theme.filterId)
  if (!filterPreset) return base

  // Use 3D LUT if available, otherwise generate 1D LUT from filter
  const lut = filterPreset.lut3d ?? $Filter.toLut($Preset.toFilter(filterPreset))
  return $ColorPalette.applyLut(base, lut)
})

// Section management
const addSection = () => {
  const id = `section-${Date.now()}`
  page.sections.push({ id, type: 'text' })
}

const removeSection = (index: number) => {
  page.sections.splice(index, 1)
}

const editSection = (index: number) => {
  editingIndex.value = index
  currentView.value = 'edit-section'
}

const setSectionType = (type: SectionType) => {
  const idx = editingIndex.value
  if (idx !== null) {
    const section = page.sections[idx]
    if (section) {
      section.type = type
    }
  }
}

// Sample contents
const contents: PageContents = {
  'hero-1': {
    title: 'Build Something Amazing',
    subtitle: 'Create beautiful, responsive websites with our powerful design system.',
    ctaText: 'Get Started',
  } as HeroContent,
  'feature-1': {
    title: 'Features',
    description: 'Everything you need to build modern web applications.',
    items: [
      { title: 'Fast', description: 'Optimized for speed and performance.' },
      { title: 'Flexible', description: 'Customize everything to your needs.' },
      { title: 'Beautiful', description: 'Stunning designs out of the box.' },
    ],
  } as FeatureContent,
  'text-1': {
    title: 'About Us',
    body: 'We are a team of passionate developers and designers dedicated to creating the best possible experience for our users.',
  } as TextContent,
}

const getDefaultContent = (type: SectionType): SectionContent => {
  switch (type) {
    case 'header':
      return {
        logoText: 'Brand',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Features', url: '#features' },
          { label: 'Contact', url: '#contact' },
        ],
      } as HeaderContent
    case 'hero':
      return {
        title: 'Build Something Amazing',
        subtitle: 'Create beautiful, responsive websites with our powerful design system.',
        ctaText: 'Get Started',
      } as HeroContent
    case 'about':
      return {
        title: 'About Us',
        description: 'We are a team of passionate developers and designers dedicated to creating the best possible experience for our users. Our mission is to make the web more beautiful and accessible.',
        buttonText: 'Learn More',
        buttonUrl: '#',
      } as AboutContent
    case 'three-column-text':
      return {
        columns: [
          { title: 'Mission', text: 'To empower creators with the tools they need to build amazing digital experiences.' },
          { title: 'Vision', text: 'A world where anyone can bring their ideas to life on the web.' },
          { title: 'Values', text: 'Innovation, simplicity, and user-centric design guide everything we do.' },
        ],
      } as ThreeColumnTextContent
    case 'image-text':
      return {
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        imageAlt: 'Team collaboration',
        title: 'Work Together',
        text: 'Collaboration is at the heart of what we do. Our platform makes it easy to work together on projects of any size.',
        imagePosition: 'left',
      } as ImageTextContent
    case 'feature':
      return {
        title: 'Features',
        description: 'Everything you need to build modern web applications.',
        items: [
          { title: 'Fast', description: 'Optimized for speed and performance.' },
          { title: 'Flexible', description: 'Customize everything to your needs.' },
          { title: 'Beautiful', description: 'Stunning designs out of the box.' },
        ],
      } as FeatureContent
    case 'feature-card':
      return {
        title: 'What We Offer',
        cards: [
          { imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', title: 'Analytics', description: 'Track your performance with detailed analytics.' },
          { imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400', title: 'Collaboration', description: 'Work together seamlessly with your team.' },
          { imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', title: 'Integration', description: 'Connect with your favorite tools and services.' },
        ],
      } as FeatureCardContent
    case 'gallery':
      return {
        images: [
          { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', alt: 'Coding' },
          { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', alt: 'Team' },
          { url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400', alt: 'Tech' },
          { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400', alt: 'Work' },
          { url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400', alt: 'Code' },
          { url: 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=400', alt: 'Design' },
        ],
      } as GalleryContent
    case 'cta':
      return {
        title: 'Ready to Get Started?',
        description: 'Join thousands of satisfied customers who have transformed their workflow.',
        buttonText: 'Start Free Trial',
        buttonUrl: '#',
      } as CTAContent
    case 'footer':
      return {
        logoText: 'Brand',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Features', url: '#features' },
          { label: 'Contact', url: '#contact' },
        ],
        info: {
          address: '123 Main Street, City',
          phone: '+1 (555) 123-4567',
          email: 'hello@example.com',
        },
        copyright: '© 2024 Brand. All rights reserved.',
      } as FooterContent
    case 'text':
    default:
      return {
        title: 'Section Title',
        body: 'This is a text section. You can add any content here to describe your product, service, or story.',
      } as TextContent
  }
}

const dynamicContents = computed<PageContents>(() => {
  const result: PageContents = {}
  for (const section of page.sections) {
    result[section.id] = contents[section.id] ?? getDefaultContent(section.type)
  }
  return result
})

const renderedHtml = computed(() => {
  return renderPage(page, palette.value, dynamicContents.value, currentFont.value)
})
</script>
