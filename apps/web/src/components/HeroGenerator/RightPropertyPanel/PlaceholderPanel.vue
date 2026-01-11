<script setup lang="ts">
defineProps<{
  type: 'processor' | 'layer' | 'empty'
  layerName?: string
}>()

const config = {
  processor: {
    icon: 'tune',
    text: 'Processor',
    hint: 'Processors modify how layers are rendered. Select Effect or Mask below to configure.',
  },
  layer: {
    icon: 'tune',
    text: '', // Will use layerName prop
    hint: 'Click Effect or Mask to edit processor settings',
  },
  empty: {
    icon: 'layers',
    text: 'No layer selected',
    hint: 'Select a layer from the left panel to edit its properties',
  },
}
</script>

<template>
  <div class="property-placeholder">
    <span class="material-icons property-icon">{{ config[type].icon }}</span>
    <p class="property-text">{{ type === 'layer' ? layerName : config[type].text }}</p>
    <p class="property-hint">{{ config[type].hint }}</p>
  </div>
</template>

<style scoped>
.property-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .property-placeholder {
  color: oklch(0.55 0.02 260);
}

.property-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.property-text {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .property-text {
  color: oklch(0.65 0.02 260);
}

.property-hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  max-width: 180px;
}
</style>
