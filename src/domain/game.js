// Game 对象：持有 Sudoku，并维护撤销/重做双栈。

import { createSudokuFromJSON } from './sudoku.js'

const JSON_VERSION = 1

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

function isValidCellValue(value) {
  return isIntegerBetween(value, 0, 9)
}

function isValidMoveShape(move) {
  return (
    !!move &&
    typeof move === 'object' &&
    isIntegerBetween(move.row, 0, 8) &&
    isIntegerBetween(move.col, 0, 8) &&
    isValidCellValue(move.value)
  )
}

function isValidHistoryMove(move) {
  return (
    !!move &&
    typeof move === 'object' &&
    isIntegerBetween(move.row, 0, 8) &&
    isIntegerBetween(move.col, 0, 8) &&
    isValidCellValue(move.oldValue) &&
    isValidCellValue(move.newValue)
  )
}

function copyHistoryMove(m) {
  if (!isValidHistoryMove(m)) {
    throw new Error('createGame: invalid history move')
  }

  return {
    row: m.row,
    col: m.col,
    oldValue: m.oldValue,
    newValue: m.newValue,
  }
}

// 创建一局游戏
export function createGame({ sudoku, undoStack: seedUndo = [], redoStack: seedRedo = [] }) {
  if (!sudoku || typeof sudoku.clone !== 'function') {
    throw new Error('createGame: sudoku must be a Sudoku model')
  }
  if (!Array.isArray(seedUndo) || !Array.isArray(seedRedo)) {
    throw new Error('createGame: history stacks must be arrays')
  }

  const currentSudoku = sudoku.clone()
  // 初始化撤销栈（拷贝初始数据）
  const undoStack = seedUndo.map(copyHistoryMove)
  // 初始化重做栈（拷贝初始数据）
  const redoStack = seedRedo.map(copyHistoryMove)

  return {
    // 获取数独模型实例
    getSudoku() {
      return currentSudoku.clone()      // 返回克隆，保护会话边界
    },

    /**
     * 用户一步；若盘面未变（如改提示格）则不入栈。
     * 新的一步会清空 redo 栈。
     */
    guess(move) {
      if (!isValidMoveShape(move)) return false

      const { row, col, value } = move
      const grid = currentSudoku.getGrid()
      const oldValue = grid[row][col]
      if (oldValue === value) return false

      // 尝试在数独模型中应用移动
      const applied = currentSudoku.guess(move)
      // 如果移动未成功应用（如修改提示格），直接返回
      if (!applied) return false

      // 将移动记录添加到撤销栈
      undoStack.push({ row, col, oldValue, newValue: value })
      // 清空重做栈
      redoStack.length = 0
      return true
    },

    // 撤销上一步操作
    undo() {
      const entry = undoStack.pop()
      if (!entry) return false
      // 恢复到操作前的状态
      const reverted = currentSudoku.guess({
        row: entry.row,
        col: entry.col,
        value: entry.oldValue,
      })
      if (!reverted) return false
      // 将操作添加到重做栈
      redoStack.push(entry)
      return true
    },

    // 重做上一步被撤销的操作
    redo() {
      const entry = redoStack.pop()
      if (!entry) return false

      // 重新应用该操作
      const replayed = currentSudoku.guess({
        row: entry.row,
        col: entry.col,
        value: entry.newValue,
      })
      if (!replayed) return false
      undoStack.push(entry)
      return true
    },

    // 检查是否可以撤销操作
    canUndo() {
      return undoStack.length > 0
    },

    // 检查是否可以重做操作
    canRedo() {
      return redoStack.length > 0
    },

    // 将游戏状态转换为 JSON 格式
    toJSON() {
      return {
        version: JSON_VERSION,
        sudoku: currentSudoku.toJSON(),
        undoStack: undoStack.map(copyHistoryMove),
        redoStack: redoStack.map(copyHistoryMove),
      }
    },
  }
}

// 从 `toJSON()` 恢复整局（含可选的撤销/重做栈）
export function createGameFromJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  
  // 验证数据是否为有效对象
  if (!data || typeof data !== 'object') {
    throw new Error('createGameFromJSON: invalid payload')
  }

  if (data.version !== JSON_VERSION) {
    throw new Error('createGameFromJSON: unsupported version')
  }

  if (!Array.isArray(data.undoStack) || !Array.isArray(data.redoStack)) {
    throw new Error('createGameFromJSON: invalid history stacks')
  }
  if (!data.undoStack.every(isValidHistoryMove) || !data.redoStack.every(isValidHistoryMove)) {
    throw new Error('createGameFromJSON: invalid history move')
  }

  // 从 JSON 数据恢复数独模型
  const restoredSudoku = createSudokuFromJSON(data.sudoku)

  // 创建并返回游戏实例
  return createGame({
    sudoku: restoredSudoku,
    undoStack: data.undoStack,
    redoStack: data.redoStack,
  })
}