/**
 * ForegroundElementUsecase
 *
 * 前景要素（タイトル、説明文）の操作を管理するユースケース
 */

import type {
  ForegroundLayerConfig,
  ForegroundElementConfig,
  ForegroundElementType,
  GridPosition,
  HeroPrimitiveKey,
} from '../Domain/HeroViewConfig'

// ============================================================
// Types
// ============================================================

/**
 * 前景要素の更新内容
 */
export interface ForegroundElementUpdate {
  position?: GridPosition
  content?: string
  fontId?: string
  fontSize?: number
  colorKey?: HeroPrimitiveKey | 'auto'
}

/**
 * 前景設定へのアクセスポート
 */
export interface ForegroundConfigPort {
  /** 現在の設定を取得 */
  get(): ForegroundLayerConfig
  /** 設定を更新 */
  set(config: ForegroundLayerConfig): void
}

/**
 * 選択状態へのアクセスポート
 */
export interface SelectionPort {
  /** 現在の選択IDを取得 */
  getSelectedId(): string | null
  /** 選択IDを設定 */
  setSelectedId(id: string | null): void
  /** キャンバスレイヤーの選択をクリア */
  clearCanvasSelection(): void
}

// ============================================================
// Usecase Interface
// ============================================================

/**
 * 前景要素操作のユースケース
 */
export interface ForegroundElementUsecase {
  /**
   * 選択中の要素を取得
   */
  getSelectedElement(): ForegroundElementConfig | null

  /**
   * 要素を選択
   * @param elementId 選択する要素ID（null で選択解除）
   */
  selectElement(elementId: string | null): void

  /**
   * 要素を追加
   * @param type 要素タイプ（title または description）
   * @returns 新しい要素のID
   */
  addElement(type: ForegroundElementType): string

  /**
   * 要素を削除
   * @param elementId 削除する要素のID
   */
  removeElement(elementId: string): void

  /**
   * 要素を更新
   * @param elementId 更新する要素のID
   * @param updates 更新内容
   */
  updateElement(elementId: string, updates: ForegroundElementUpdate): void

  /**
   * 選択中の要素を更新
   * @param updates 更新内容
   */
  updateSelectedElement(updates: ForegroundElementUpdate): void
}

// ============================================================
// Usecase Dependencies
// ============================================================

export interface ForegroundElementUsecaseDeps {
  foregroundConfig: ForegroundConfigPort
  selection: SelectionPort
}

// ============================================================
// Implementation
// ============================================================

/**
 * ForegroundElementUsecaseの実装を作成
 */
export const createForegroundElementUsecase = (
  deps: ForegroundElementUsecaseDeps
): ForegroundElementUsecase => {
  const { foregroundConfig, selection } = deps

  const getSelectedElement = (): ForegroundElementConfig | null => {
    const selectedId = selection.getSelectedId()
    if (!selectedId) return null
    return foregroundConfig.get().elements.find((el) => el.id === selectedId) ?? null
  }

  const selectElement = (elementId: string | null): void => {
    selection.setSelectedId(elementId)
    if (elementId !== null) {
      selection.clearCanvasSelection()
    }
  }

  const addElement = (type: ForegroundElementType): string => {
    const id = `${type}-${Date.now()}`
    const newElement: ForegroundElementConfig = {
      id,
      type,
      visible: true,
      position: 'middle-center',
      content: type === 'title' ? 'New Title' : 'New description text',
      fontSize: type === 'title' ? 3 : 1,
    }

    const current = foregroundConfig.get()
    foregroundConfig.set({
      ...current,
      elements: [...current.elements, newElement],
    })

    // Select the newly added element
    selectElement(id)

    return id
  }

  const removeElement = (elementId: string): void => {
    const current = foregroundConfig.get()
    foregroundConfig.set({
      ...current,
      elements: current.elements.filter((el) => el.id !== elementId),
    })

    // Clear selection if the removed element was selected
    if (selection.getSelectedId() === elementId) {
      selection.setSelectedId(null)
    }
  }

  const updateElement = (elementId: string, updates: ForegroundElementUpdate): void => {
    const current = foregroundConfig.get()
    foregroundConfig.set({
      ...current,
      elements: current.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    })
  }

  const updateSelectedElement = (updates: ForegroundElementUpdate): void => {
    const selectedId = selection.getSelectedId()
    if (selectedId) {
      updateElement(selectedId, updates)
    }
  }

  return {
    getSelectedElement,
    selectElement,
    addElement,
    removeElement,
    updateElement,
    updateSelectedElement,
  }
}
