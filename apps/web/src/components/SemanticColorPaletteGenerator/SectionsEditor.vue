<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  getSchemaByType,
  validateContent,
  hasErrorAt,
  getErrorsAt,
  type Section,
  type SectionType,
  type SectionContent,
  type SectionSchema,
  type FieldSchema,
  type ValidationResult,
} from '../../modules/SemanticSection'

// Section type labels for display
const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  header: 'Header',
  hero: 'Hero',
  features: 'Features',
  logos: 'Logos',
  howItWorks: 'How It Works',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'CTA',
  footer: 'Footer',
}

const props = defineProps<{
  sections: Section[]
  contents: Record<string, SectionContent>
  selectedSectionId: string | null
}>()

const emit = defineEmits<{
  'update:selectedSectionId': [value: string | null]
  'update:content': [sectionId: string, content: SectionContent]
}>()

// Track expanded array fields
const expandedArrayFields = ref<Set<string>>(new Set())

const toggleArrayField = (fieldKey: string) => {
  const newSet = new Set(expandedArrayFields.value)
  if (newSet.has(fieldKey)) {
    newSet.delete(fieldKey)
  } else {
    newSet.add(fieldKey)
  }
  expandedArrayFields.value = newSet
}

const isArrayExpanded = (fieldKey: string) => expandedArrayFields.value.has(fieldKey)

// Current sections list
const currentSections = computed(() => {
  return props.sections.map((section) => ({
    id: section.id,
    type: section.type,
    label: SECTION_TYPE_LABELS[section.type],
  }))
})

// Get selected section info
const selectedSection = computed(() => {
  if (!props.selectedSectionId) return null
  const section = props.sections.find(s => s.id === props.selectedSectionId)
  if (!section) return null
  return {
    ...section,
    label: SECTION_TYPE_LABELS[section.type],
    content: props.contents[section.id],
  }
})

// Get schema for selected section
const selectedSchema = computed((): SectionSchema | null => {
  if (!selectedSection.value) return null
  return getSchemaByType(selectedSection.value.type) ?? null
})

// Get validation result for selected section
const validationResult = computed((): ValidationResult | null => {
  if (!selectedSection.value || !selectedSchema.value) return null
  return validateContent(selectedSection.value.content, selectedSchema.value)
})

// Helper to get field schema by key
const getFieldSchema = (key: string): FieldSchema | undefined => {
  if (!selectedSchema.value) return undefined
  return selectedSchema.value.fields.find(f => f.key === key)
}

// Helper to check if a field has errors
const fieldHasError = (fieldKey: string): boolean => {
  if (!validationResult.value) return false
  return hasErrorAt(validationResult.value, [fieldKey])
}

// Helper to get field errors
const getFieldErrors = (fieldKey: string): string[] => {
  if (!validationResult.value) return []
  return getErrorsAt(validationResult.value, [fieldKey]).map(e => e.message)
}

// Navigate to section detail
const selectSection = (sectionId: string) => {
  emit('update:selectedSectionId', sectionId)
}

// Navigate back to list
const backToList = () => {
  emit('update:selectedSectionId', null)
}

// Update a single field in section content
const updateContentField = (sectionId: string, fieldKey: string, value: string) => {
  const currentContent = props.contents[sectionId]
  if (!currentContent) return

  emit('update:content', sectionId, {
    ...currentContent,
    [fieldKey]: value,
  })
}

// Update an item in an array field
const updateArrayItem = (
  sectionId: string,
  fieldKey: string,
  index: number,
  itemKey: string,
  value: string
) => {
  const currentContent = props.contents[sectionId]
  if (!currentContent) return

  const array = (currentContent as Record<string, unknown>)[fieldKey]
  if (!Array.isArray(array)) return

  const newArray = [...array]
  if (typeof newArray[index] === 'string') {
    newArray[index] = value
  } else if (typeof newArray[index] === 'object' && newArray[index] !== null) {
    newArray[index] = { ...newArray[index], [itemKey]: value }
  }

  emit('update:content', sectionId, {
    ...currentContent,
    [fieldKey]: newArray,
  })
}

// Add item to array field
const addArrayItem = (sectionId: string, fieldKey: string) => {
  const currentContent = props.contents[sectionId]
  if (!currentContent) return

  const array = (currentContent as Record<string, unknown>)[fieldKey]
  if (!Array.isArray(array)) return

  let newItem: unknown
  if (array.length > 0) {
    const sample = array[0]
    if (typeof sample === 'string') {
      newItem = ''
    } else if (typeof sample === 'object' && sample !== null) {
      newItem = Object.fromEntries(
        Object.keys(sample).map(k => [k, ''])
      )
    }
  } else {
    newItem = ''
  }

  emit('update:content', sectionId, {
    ...currentContent,
    [fieldKey]: [...array, newItem],
  })
}

// Remove item from array field
const removeArrayItem = (sectionId: string, fieldKey: string, index: number) => {
  const currentContent = props.contents[sectionId]
  if (!currentContent) return

  const array = (currentContent as Record<string, unknown>)[fieldKey]
  if (!Array.isArray(array)) return

  const newArray = array.filter((_, i) => i !== index)

  emit('update:content', sectionId, {
    ...currentContent,
    [fieldKey]: newArray,
  })
}

// Expose for parent
defineExpose({
  backToList,
})
</script>

<template>
  <div class="sections-editor">
    <!-- List View -->
    <template v-if="!selectedSection">
      <div class="sections-list">
        <button
          v-for="(section, index) in currentSections"
          :key="section.id"
          class="section-item section-item--clickable"
          @click="selectSection(section.id)"
        >
          <span class="section-number">{{ index + 1 }}</span>
          <div class="section-info">
            <span class="section-label">{{ section.label }}</span>
            <code class="section-type">{{ section.type }}</code>
          </div>
          <span class="section-arrow">›</span>
        </button>
      </div>
    </template>

    <!-- Detail View -->
    <template v-else>
      <div class="section-detail">
        <div class="section-detail-header">
          <span class="section-detail-type">{{ selectedSection.type }}</span>
        </div>

        <!-- Validation Summary -->
        <div v-if="validationResult && !validationResult.valid" class="validation-summary">
          <span class="validation-summary-icon">!</span>
          <span class="validation-summary-text">{{ validationResult.errors.length }} validation error(s)</span>
        </div>

        <!-- Content Fields -->
        <div class="content-fields">
          <template v-for="(value, key) in selectedSection.content" :key="key">
            <!-- String field -->
            <div v-if="typeof value === 'string'" class="content-field" :class="{ 'has-error': fieldHasError(key as string) }">
              <div class="content-field-header">
                <label class="content-field-label">
                  {{ getFieldSchema(key as string)?.label ?? key }}
                  <span v-if="getFieldSchema(key as string)?.required !== false" class="content-field-required">*</span>
                </label>
                <span v-if="getFieldSchema(key as string)?.constraints?.maxLength" class="content-field-constraint">
                  {{ (value as string).length }}/{{ getFieldSchema(key as string)?.constraints?.maxLength }}
                </span>
              </div>
              <input
                type="text"
                class="content-field-input"
                :class="{ 'has-error': fieldHasError(key as string) }"
                :value="value"
                :maxlength="getFieldSchema(key as string)?.constraints?.maxLength"
                @input="updateContentField(selectedSection.id, key as string, ($event.target as HTMLInputElement).value)"
              />
              <div v-if="fieldHasError(key as string)" class="content-field-errors">
                <span v-for="error in getFieldErrors(key as string)" :key="error" class="content-field-error">{{ error }}</span>
              </div>
            </div>

            <!-- Array field -->
            <div v-else-if="Array.isArray(value)" class="content-field content-field--array" :class="{ 'has-error': fieldHasError(key as string) }">
              <button
                class="content-field-array-header"
                :class="{ 'has-error': fieldHasError(key as string) }"
                @click="toggleArrayField(key as string)"
              >
                <div class="content-field-header">
                  <span class="content-field-label">
                    {{ getFieldSchema(key as string)?.label ?? key }}
                    <span v-if="getFieldSchema(key as string)?.required !== false" class="content-field-required">*</span>
                  </span>
                </div>
                <span class="content-field-array-meta">
                  <span class="content-field-array-count">{{ value.length }}</span>
                  <span class="content-field-array-toggle" :class="{ expanded: isArrayExpanded(key as string) }">›</span>
                </span>
              </button>
              <div v-if="fieldHasError(key as string) && !isArrayExpanded(key as string)" class="content-field-errors">
                <span v-for="error in getFieldErrors(key as string)" :key="error" class="content-field-error">{{ error }}</span>
              </div>

              <!-- Expanded array items -->
              <div v-if="isArrayExpanded(key as string)" class="content-field-array-items">
                <div
                  v-for="(item, itemIndex) in value"
                  :key="itemIndex"
                  class="array-item"
                >
                  <div class="array-item-header">
                    <span class="array-item-index">{{ itemIndex + 1 }}</span>
                    <button
                      class="array-item-remove"
                      @click="removeArrayItem(selectedSection.id, key as string, itemIndex)"
                      title="Remove item"
                    >×</button>
                  </div>

                  <!-- String item -->
                  <template v-if="typeof item === 'string'">
                    <input
                      type="text"
                      class="content-field-input"
                      :value="item"
                      @input="updateArrayItem(selectedSection.id, key as string, itemIndex, '', ($event.target as HTMLInputElement).value)"
                    />
                  </template>

                  <!-- Object item -->
                  <template v-else-if="typeof item === 'object' && item !== null">
                    <div class="array-item-fields">
                      <div
                        v-for="(fieldValue, fieldKey) in item"
                        :key="fieldKey"
                        class="array-item-field"
                      >
                        <label class="array-item-field-label">{{ fieldKey }}</label>
                        <input
                          v-if="typeof fieldValue === 'string'"
                          type="text"
                          class="content-field-input content-field-input--small"
                          :value="fieldValue"
                          @input="updateArrayItem(selectedSection.id, key as string, itemIndex, fieldKey as string, ($event.target as HTMLInputElement).value)"
                        />
                        <span v-else class="array-item-field-value">{{ typeof fieldValue }}</span>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Add button -->
                <button
                  class="array-item-add"
                  @click="addArrayItem(selectedSection.id, key as string)"
                >
                  + Add item
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Sections List */
.sections-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: oklch(0.96 0.005 260);
  border-radius: 6px;
  transition: background 0.15s;
}

:global(.dark) .section-item {
  background: oklch(0.18 0.02 260);
}

.section-item:hover {
  background: oklch(0.94 0.01 260);
}

:global(.dark) .section-item:hover {
  background: oklch(0.22 0.02 260);
}

.section-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: oklch(0.90 0.01 260);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .section-number {
  background: oklch(0.28 0.02 260);
  color: oklch(0.70 0.02 260);
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .section-label {
  color: oklch(0.90 0.01 260);
}

.section-type {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-type {
  color: oklch(0.60 0.02 260);
}

.section-item--clickable {
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
}

.section-arrow {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
  margin-left: auto;
}

:global(.dark) .section-arrow {
  color: oklch(0.50 0.02 260);
}

/* Section Detail View */
.section-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-detail-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: oklch(0.92 0.01 260);
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.45 0.02 260);
}

:global(.dark) .section-detail-type {
  background: oklch(0.22 0.02 260);
  color: oklch(0.65 0.02 260);
}

/* Validation Summary */
.validation-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: oklch(0.95 0.05 25);
  border: 1px solid oklch(0.85 0.10 25);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

:global(.dark) .validation-summary {
  background: oklch(0.20 0.05 25);
  border-color: oklch(0.35 0.10 25);
}

.validation-summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: oklch(0.60 0.18 25);
  color: white;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}

.validation-summary-text {
  font-size: 0.75rem;
  color: oklch(0.45 0.10 25);
}

:global(.dark) .validation-summary-text {
  color: oklch(0.75 0.10 25);
}

/* Content Fields */
.content-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.content-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.content-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-field-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.45 0.02 260);
}

:global(.dark) .content-field-label {
  color: oklch(0.65 0.02 260);
}

.content-field-required {
  color: oklch(0.60 0.18 25);
  margin-left: 0.125rem;
}

.content-field-constraint {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .content-field-constraint {
  color: oklch(0.55 0.02 260);
}

.content-field.has-error .content-field-constraint {
  color: oklch(0.55 0.15 25);
}

.content-field-errors {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.content-field-error {
  font-size: 0.65rem;
  color: oklch(0.55 0.18 25);
}

:global(.dark) .content-field-error {
  color: oklch(0.70 0.15 25);
}

.content-field-input {
  padding: 0.5rem 0.625rem;
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 6px;
  background: oklch(0.99 0.005 260);
  color: oklch(0.20 0.02 260);
  font-size: 0.8rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.content-field-input:focus {
  outline: none;
  border-color: oklch(0.55 0.18 250);
  box-shadow: 0 0 0 3px oklch(0.55 0.18 250 / 0.15);
}

:global(.dark) .content-field-input {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.28 0.02 260);
  color: oklch(0.90 0.01 260);
}

:global(.dark) .content-field-input:focus {
  border-color: oklch(0.55 0.16 250);
  box-shadow: 0 0 0 3px oklch(0.55 0.16 250 / 0.2);
}

.content-field-input.has-error {
  border-color: oklch(0.70 0.15 25);
}

.content-field-input.has-error:focus {
  border-color: oklch(0.60 0.18 25);
  box-shadow: 0 0 0 3px oklch(0.60 0.18 25 / 0.15);
}

.content-field-input--small {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
}

/* Array Fields */
.content-field--array {
  gap: 0;
}

.content-field-array-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.005 260);
  border: 1px solid oklch(0.90 0.01 260);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.content-field-array-header:hover {
  background: oklch(0.94 0.01 260);
}

:global(.dark) .content-field-array-header {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.26 0.02 260);
}

:global(.dark) .content-field-array-header:hover {
  background: oklch(0.20 0.02 260);
}

.content-field-array-header.has-error {
  border-color: oklch(0.70 0.15 25);
}

.content-field-array-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.content-field-array-count {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  background: oklch(0.90 0.01 260);
  border-radius: 4px;
  color: oklch(0.45 0.02 260);
}

:global(.dark) .content-field-array-count {
  background: oklch(0.26 0.02 260);
  color: oklch(0.65 0.02 260);
}

.content-field-array-toggle {
  font-size: 0.9rem;
  color: oklch(0.55 0.02 260);
  transition: transform 0.15s;
}

.content-field-array-toggle.expanded {
  transform: rotate(90deg);
}

:global(.dark) .content-field-array-toggle {
  color: oklch(0.55 0.02 260);
}

/* Array Items */
.content-field-array-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid oklch(0.90 0.01 260);
}

:global(.dark) .content-field-array-items {
  border-left-color: oklch(0.26 0.02 260);
}

.array-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  background: oklch(0.98 0.005 260);
  border-radius: 6px;
}

:global(.dark) .array-item {
  background: oklch(0.15 0.02 260);
}

.array-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.array-item-index {
  font-size: 0.65rem;
  font-weight: 600;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .array-item-index {
  color: oklch(0.55 0.02 260);
}

.array-item-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: oklch(0.55 0.02 260);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.array-item-remove:hover {
  background: oklch(0.65 0.15 25);
  color: white;
}

:global(.dark) .array-item-remove:hover {
  background: oklch(0.55 0.15 25);
}

.array-item-fields {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.array-item-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.array-item-field-label {
  font-size: 0.6rem;
  font-weight: 500;
  color: oklch(0.55 0.02 260);
  text-transform: capitalize;
}

:global(.dark) .array-item-field-label {
  color: oklch(0.55 0.02 260);
}

.array-item-field-value {
  font-size: 0.7rem;
  color: oklch(0.60 0.02 260);
  font-style: italic;
}

.array-item-add {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed oklch(0.85 0.01 260);
  border-radius: 6px;
  color: oklch(0.55 0.02 260);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.array-item-add:hover {
  background: oklch(0.96 0.01 260);
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .array-item-add {
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.60 0.02 260);
}

:global(.dark) .array-item-add:hover {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.40 0.02 260);
}
</style>
