<script setup lang="ts">
/**
 * SchemaFields
 *
 * Renders form fields automatically from a schema definition.
 * Supports number (slider) and boolean (checkbox) fields.
 */
import { computed } from 'vue'
import { getFields, type ObjectSchema, type FieldMeta } from '@practice/schema'
import RangeInput from './RangeInput.vue'

const props = withDefaults(defineProps<{
  schema: ObjectSchema
  modelValue: Record<string, unknown>
  /** Raw params with PropertyValue preserved (for DSL display) */
  rawParams?: Record<string, unknown> | null
  /** Fields to exclude from rendering (e.g., 'enabled') */
  exclude?: string[]
  /** Number of columns for the grid layout (1 or 2) */
  columns?: 1 | 2
}>(), {
  columns: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'update:rawValue': [key: string, value: unknown]
}>()

const fields = computed<FieldMeta[]>(() => {
  const all = getFields(props.schema)
  if (!props.exclude?.length) return all
  return all.filter(f => !props.exclude!.includes(f.key))
})

const updateField = (key: string, value: unknown) => {
  // Merge the changed field with current modelValue to avoid losing other fields
  // Note: This preserves existing values while updating only the changed field
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="schema-fields" :class="{ 'schema-fields--two-columns': columns === 2 }">
    <template v-for="field in fields" :key="field.key">
      <!-- Number field: slider -->
      <RangeInput
        v-if="field.schema.type === 'number'"
        :label="field.schema.label"
        :min="field.schema.min"
        :max="field.schema.max"
        :step="field.schema.step"
        :model-value="(modelValue[field.key] as number) ?? field.schema.default"
        :raw-value="rawParams?.[field.key]"
        @update:model-value="updateField(field.key, $event)"
        @update:raw-value="emit('update:rawValue', field.key, $event)"
      />

      <!-- Boolean field: checkbox -->
      <label v-else-if="field.schema.type === 'boolean'" class="schema-checkbox">
        <input
          type="checkbox"
          :checked="(modelValue[field.key] as boolean) ?? field.schema.default"
          @change="updateField(field.key, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ field.schema.label }}</span>
      </label>

      <!-- Select field: dropdown -->
      <div v-else-if="field.schema.type === 'select'" class="schema-select-group">
        <label class="schema-select-label">{{ field.schema.label }}</label>
        <select
          class="schema-select"
          :value="(modelValue[field.key] as string) ?? field.schema.default"
          @change="updateField(field.key, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="opt in field.schema.options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </template>
  </div>
</template>

<style scoped>
.schema-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.schema-fields--two-columns {
  grid-template-columns: 1fr 1fr;
}

.schema-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
  cursor: pointer;
}

:global(.dark) .schema-checkbox {
  color: oklch(0.70 0.02 260);
}

.schema-checkbox input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: oklch(0.55 0.20 250);
}

.schema-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.schema-select-label {
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .schema-select-label {
  color: oklch(0.70 0.02 260);
}

.schema-select {
  padding: 0.5rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.25 0.02 260);
  font-size: 0.75rem;
  cursor: pointer;
}

:global(.dark) .schema-select {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.schema-select:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}
</style>
