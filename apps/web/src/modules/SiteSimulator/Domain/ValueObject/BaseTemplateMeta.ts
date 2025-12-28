/**
 * BaseTemplateMeta - ベーステンプレートのメタデータ
 *
 * ページ全体の HTML 構造を定義する。
 * セクションは {{sections}} プレースホルダーで挿入される。
 *
 * template 内で使えるプレースホルダー:
 *   {{fonts}}     - Google Fonts の <link> タグ
 *   {{styles}}    - CSS変数 + ベースCSS + セクションCSS
 *   {{sections}}  - レンダリングされたセクション HTML
 */
export type BaseTemplateMeta = {
  readonly templateId: string
  readonly name: string
  readonly description: string
  readonly template: string
  readonly style: string
}

export const $BaseTemplateMeta = {
  create(
    templateId: string,
    name: string,
    description: string,
    template: string,
    style: string
  ): BaseTemplateMeta {
    return { templateId, name, description, template, style }
  },
}

/**
 * BaseTemplate - ベーステンプレート定義
 */
export type BaseTemplate = {
  readonly meta: BaseTemplateMeta
}
