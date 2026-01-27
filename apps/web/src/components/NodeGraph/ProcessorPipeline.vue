<script setup lang="ts">
/**
 * ProcessorPipeline
 *
 * A container that represents a ProcessorNodeConfig.
 * Contains FilterNodes (effects and/or masks) and optionally GraymapNodes.
 *
 * Layout:
 * - Main flow: horizontal (Effect → Effect → Mask)
 * - Graymap: positioned below its associated Mask
 *
 * All input connections come to the Pipeline boundary (not individual filters).
 */

defineProps<{
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div
    class="processor-pipeline"
    :class="{ 'is-selected': selected }"
    @click.self="emit('click')"
  >
    <!-- Title (outside, above the box) -->
    <div class="node-title">
      <span class="material-icons node-icon">tune</span>
      <span class="node-name">Processor</span>
    </div>

    <!-- Pipeline body -->
    <div class="pipeline-body">
      <!-- Filter nodes and graymaps go here via slot -->
      <div class="pipeline-content">
        <slot />
      </div>

      <!-- Input junction (left side) - where multiple inputs merge -->
      <div class="junction junction-input" />

      <!-- Output port (right side) -->
      <div class="port port-output" />
    </div>
  </div>
</template>

<style scoped>
.processor-pipeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
}

.node-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
}

.node-icon {
  font-size: 14px;
  color: #8a8a9a;
}

.node-name {
  font-size: 11px;
  font-weight: 500;
  color: #8a8a9a;
}

.processor-pipeline.is-selected .node-name {
  color: #b0b0c0;
}

.processor-pipeline.is-selected .node-icon {
  color: #b0b0c0;
}

.pipeline-body {
  position: relative;
  padding: 16px 20px;
  border: 1px solid #4a4a5a;
  border-radius: 4px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.processor-pipeline:hover .pipeline-body {
  border-color: #6a6a7a;
}

.processor-pipeline.is-selected .pipeline-body {
  border-color: #8a8a9a;
  box-shadow: 0 0 0 2px rgba(138, 138, 154, 0.3);
}

.pipeline-content {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

/* Junction: where multiple inputs merge (visual indicator) */
.junction {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #3b4d7a;
  border-radius: 50%;
}

.junction-input {
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
}

/* Output port */
.port {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b4d7a;
  border-radius: 50%;
}

.port-output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
