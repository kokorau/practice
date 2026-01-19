/**
 * SectionDefinitions - セクションのテンプレートとスキーマ定義
 *
 * Site と同じレベルで定義され、Site から参照される。
 */

// ============================================================================
// Section Templates
// ============================================================================

export interface SectionTemplate {
  readonly kind: string
  readonly template: string
}

export interface SectionTemplates {
  readonly [kind: string]: SectionTemplate
}

// ============================================================================
// Section Schemas
// ============================================================================

export interface FieldConstraints {
  readonly maxLength?: number
  readonly minLength?: number
  readonly minItems?: number
  readonly maxItems?: number
}

export interface FieldSchema {
  readonly key: string
  readonly type: 'text' | 'url' | 'list' | 'object'
  readonly label?: string
  readonly required?: boolean
  readonly constraints?: FieldConstraints
  readonly aiHint?: string
}

export interface SectionSchema {
  readonly id: string
  readonly type: string
  readonly name: string
  readonly description?: string
  readonly fields: readonly FieldSchema[]
}

export interface SectionSchemas {
  readonly [type: string]: SectionSchema
}
