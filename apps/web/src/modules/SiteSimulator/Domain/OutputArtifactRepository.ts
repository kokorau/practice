/**
 * PreviewArtifact - プレビュー表示用の軽量な出力成果物
 *
 * SiteArtifact（完全な出力バンドル）とは異なり、
 * リアルタイムプレビューに必要な最小限の情報のみを含む。
 */
export type PreviewArtifact = {
  /** レンダリングされたセクションHTML（CSS変数を参照） */
  readonly html: string
  /** CSS変数 + スタイル定義 */
  readonly css: string
  /** Google Fonts読み込みタグ */
  readonly fonts: string
}

/**
 * 変更の種類
 * - 'html': HTMLのみ変更（セクション構造・コンテンツ）→ iframe reload必要
 * - 'css': CSSのみ変更（パレット・フォント・スタイル）→ style更新のみ
 * - 'both': 両方変更 → iframe reload必要
 */
export type ArtifactChangeType = 'html' | 'css' | 'both'

export type OutputArtifactListener = (
  artifact: PreviewArtifact,
  changeType: ArtifactChangeType
) => void

/**
 * Repository interface for Preview Artifact.
 *
 * BlueprintからレンダリングされたPreviewArtifactを管理し、
 * 変更の種類（HTML/CSS）を検出してlistenerに通知する。
 */
export type OutputArtifactRepository = {
  get(): PreviewArtifact | null

  /**
   * 新しいArtifactを保存し、変更を検出してlistenerに通知
   */
  save(artifact: PreviewArtifact): void

  clear(): void

  /**
   * Artifact変更をsubscribe
   * @returns unsubscribe function
   */
  subscribe(listener: OutputArtifactListener): () => void
}

/**
 * PreviewArtifact Factory
 */
export const $PreviewArtifact = {
  create: (html: string, css: string, fonts: string): PreviewArtifact => ({
    html,
    css,
    fonts,
  }),

  /**
   * HTMLのハッシュを計算（変更検出用）
   * シンプルな文字列比較のため、実際のハッシュ関数は使わない
   */
  htmlSignature: (artifact: PreviewArtifact): string => artifact.html,

  /**
   * CSSのハッシュを計算（変更検出用）
   */
  cssSignature: (artifact: PreviewArtifact): string => artifact.css,

  /**
   * 2つのArtifactを比較して変更の種類を判定
   */
  detectChangeType: (
    prev: PreviewArtifact | null,
    next: PreviewArtifact
  ): ArtifactChangeType => {
    if (!prev) return 'both'

    const htmlChanged = prev.html !== next.html
    const cssChanged = prev.css !== next.css || prev.fonts !== next.fonts

    if (htmlChanged && cssChanged) return 'both'
    if (htmlChanged) return 'html'
    if (cssChanged) return 'css'

    // 変更なし（通常は呼ばれないが、念のため）
    return 'css'
  },
}
