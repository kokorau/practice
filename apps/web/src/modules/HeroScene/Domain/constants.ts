/**
 * Hero Canvas の基準寸法
 *
 * 1920x1080 (Full HD) を基準として、レスポンシブにスケーリングする。
 * この寸法は以下の用途で使用される：
 * - HeroPreview コンポーネントでのプレビュー表示
 * - HeroViewGenerator での画像出力
 * - useHeroScene での EditorState 初期化
 * - スクリーンキャプチャのデフォルト解像度
 */
export const HERO_CANVAS_WIDTH = 1920
export const HERO_CANVAS_HEIGHT = 1080

/**
 * Hero Canvas の基準寸法オブジェクト
 */
export const HERO_CANVAS_DIMENSIONS = {
  width: HERO_CANVAS_WIDTH,
  height: HERO_CANVAS_HEIGHT,
} as const
