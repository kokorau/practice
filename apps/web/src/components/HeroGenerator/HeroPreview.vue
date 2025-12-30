<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  compileForegroundLayout,
  DEFAULT_FOREGROUND_CONFIG,
  type ForegroundConfig,
} from '../../composables/SiteBuilder'

const props = withDefaults(defineProps<{
  foregroundConfig?: ForegroundConfig
}>(), {
  foregroundConfig: () => DEFAULT_FOREGROUND_CONFIG,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

const positionedGroups = computed(() => compileForegroundLayout(props.foregroundConfig))

defineExpose({
  canvasRef,
})
</script>

<template>
  <div class="hero-preview-container">
    <div class="hero-preview-wrapper">
      <div class="hero-preview-frame hero-palette-preview context-canvas">
        <!-- 後景: テクスチャ or カスタム画像 (Canvas に描画) -->
        <canvas ref="canvasRef" class="layer-background" />

        <!-- 中景: グラフィック（後で実装） -->
        <div class="layer-midground">
          <!-- 画像やグラフィックテキスト -->
        </div>

        <!-- 前景: CTA + テキスト (9-grid layout) -->
        <div class="layer-foreground foreground-grid">
          <div
            v-for="group in positionedGroups"
            :key="group.position"
            class="grid-cell"
            :class="`position-${group.position}`"
          >
            <component
              v-for="(el, i) in group.elements"
              :key="i"
              :is="el.tag"
              :class="el.className"
            >{{ el.content }}</component>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Styles are defined in HeroViewGeneratorView.css -->
