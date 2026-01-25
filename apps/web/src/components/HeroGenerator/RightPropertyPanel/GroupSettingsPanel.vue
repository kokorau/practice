<script setup lang="ts">
const props = defineProps<{
  opacity: number
  offsetX: number
  offsetY: number
  rotation: number
}>()

const emit = defineEmits<{
  (e: 'update:param', key: string, value: number): void
}>()

const handleUpdate = (key: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    emit('update:param', key, value)
  }
}
</script>

<template>
  <div class="group-settings">
    <div class="settings-section">
      <p class="settings-label">Transform</p>
      <div class="fields">
        <div class="field">
          <div class="field-header">
            <div class="field-label">Opacity</div>
            <div class="field-range">0 ~ 1</div>
          </div>
          <input
            type="number"
            :value="opacity"
            min="0"
            max="1"
            step="0.01"
            @change="handleUpdate('opacity', $event)"
          />
        </div>
        <div class="field">
          <div class="field-header">
            <div class="field-label">Offset X</div>
            <div class="field-range">-1 ~ 1</div>
          </div>
          <input
            type="number"
            :value="offsetX"
            min="-1"
            max="1"
            step="0.01"
            @change="handleUpdate('offsetX', $event)"
          />
        </div>
        <div class="field">
          <div class="field-header">
            <div class="field-label">Offset Y</div>
            <div class="field-range">-1 ~ 1</div>
          </div>
          <input
            type="number"
            :value="offsetY"
            min="-1"
            max="1"
            step="0.01"
            @change="handleUpdate('offsetY', $event)"
          />
        </div>
        <div class="field">
          <div class="field-header">
            <div class="field-label">Rotation</div>
            <div class="field-range">-180 ~ 180</div>
          </div>
          <input
            type="number"
            :value="rotation"
            min="-180"
            max="180"
            step="1"
            @change="handleUpdate('rotation', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-settings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-section {
  padding: 0.5rem 0;
}

.settings-label {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .settings-label {
  color: oklch(0.70 0.02 260);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .field-label {
  color: oklch(0.80 0.02 260);
}

.field-range {
  font-size: 0.625rem;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .field-range {
  color: oklch(0.55 0.02 260);
}

input[type="number"] {
  width: 100%;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  background: oklch(0.98 0.005 260);
  color: oklch(0.20 0.02 260);
}

:global(.dark) input[type="number"] {
  border-color: oklch(0.30 0.02 260);
  background: oklch(0.15 0.02 260);
  color: oklch(0.90 0.02 260);
}

input[type="number"]:focus {
  outline: none;
  border-color: oklch(0.55 0.15 250);
}
</style>
