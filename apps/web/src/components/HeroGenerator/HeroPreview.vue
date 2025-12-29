<script setup lang="ts">
import { ref } from 'vue'
import type { LayoutId } from '../SiteBuilder/layoutPatterns'

defineProps<{
  selectedLayout: LayoutId
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

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

        <!-- 前景: CTA + テキスト -->
        <div class="layer-foreground">
          <div class="hero-content" :class="`layout-${selectedLayout}`">
            <h1 class="hero-title scp-title">Build Amazing</h1>
            <p class="hero-subtitle scp-body">Create beautiful, responsive websites.<br>Design with confidence.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Styles are defined in HeroViewGeneratorView.css -->
