// Sudoku 局面对象：管理盘面数据、填数规则与序列化。

import { cloneGrid } from './grid-copy.js'

const JSON_VERSION = 1

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

// 加入局面合法性检查 
function isGrid9x9(grid) {
  if (!Array.isArray(grid) || grid.length !== 9) return false

  for (let row = 0; row < 9; row++) {
    if (!Array.isArray(grid[row]) || grid[row].length !== 9) return false
    for (let col = 0; col < 9; col++) {
      if (!isIntegerBetween(grid[row][col], 0, 9)) return false
    }
  }

  return true
}

function isValidSudokuJson(json) {
  // 基本结构检查
  if (!json || typeof json !== 'object') return false

  return (
    json.version === JSON_VERSION &&
    isGrid9x9(json.initial) &&
    isGrid9x9(json.grid)
  )
}

/** 由 initial / cells 两份快照构造局面对象*/
/**
 * 创建数独模型
 * @param {Array<Array<number>>} initialSnapshot - 初始盘面快照，包含提示格信息
 * @param {Array<Array<number>>} cellSnapshot - 当前盘面快照，包含用户填入的数字
 * @returns {Object} 数独模型对象，包含操作盘面的方法
 */
function createSudokuModel(initialSnapshot, cellSnapshot) {
  if (!isGrid9x9(initialSnapshot) || !isGrid9x9(cellSnapshot)) {
    throw new Error('createSudoku: expected 9x9 grid with values 0..9')
  }

  const initial = cloneGrid(initialSnapshot)
  let cells = cloneGrid(cellSnapshot)

  // 判断指定单元格是否为提示格
  const isClueCell = (row, col) => initial[row][col] !== 0

  const getInvalidCells = () => {
    const invalid = []
    const seen = new Set()

    const add = (row, col) => {
      const key = `${col},${row}`
      if (seen.has(key)) return
      seen.add(key)
      invalid.push(key)
    }

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const value = cells[row][col]
        if (value === 0) continue

        for (let i = 0; i < 9; i++) {
          if (i !== col && cells[row][i] === value) add(row, col)
          if (i !== row && cells[i][col] === value) add(row, col)
        }

        const startRow = Math.floor(row / 3) * 3
        const startCol = Math.floor(col / 3) * 3
        for (let boxRow = startRow; boxRow < startRow + 3; boxRow++) {
          for (let boxCol = startCol; boxCol < startCol + 3; boxCol++) {
            if (boxRow === row && boxCol === col) continue
            if (cells[boxRow][boxCol] === value) add(row, col)
          }
        }
      }
    }

    return invalid
  }

  return {
    // 返回盘面副本，避免外部修改内部数组，盘面的深拷贝
    getGrid() {
      return cloneGrid(cells)
    },

    guess(move) {
      if (!move || typeof move !== 'object') return false
      const { row, col, value } = move
      if (!isIntegerBetween(row, 0, 8) || !isIntegerBetween(col, 0, 8)) {
        return false
      }
      if (!isIntegerBetween(value, 0, 9)) return false
      // 检查是否为提示格，提示格不允许修改
      if (isClueCell(row, col)) return false
      if (cells[row][col] === value) return false

      cells[row][col] = value
      return true
    },

    getInvalidCells,

    isValid() {
      return getInvalidCells().length === 0
    },

    clone() {
      return createSudokuModel(initial, cells)
    },

    toJSON() {
      return {
        version: JSON_VERSION,
        initial: cloneGrid(initial),
        grid: cloneGrid(cells),
      }
    },

    /**
     * 将数独模型转换为字符串格式，用于调试
     * @returns {string} 格式化的数独盘面字符串
     * @description 生成一个可视化的数独盘面，包含宫线分隔，空格用 `.` 表示
     */
    toString() {
      // 定义分隔线
      const sep = ' *-------*-------*-------*\n'
    
      let out = `Sudoku(v${JSON_VERSION})\n${sep}`
      

      for (let r = 0; r < 9; r++) {
        // 在第 3 行和第 6 行后添加分隔线
        if (r === 3 || r === 6) out += sep
        out += '| '
        
        for (let c = 0; c < 9; c++) {
          if (c === 3 || c === 6) out += '| '
          const v = cells[r][c]
          // 将 0 转换为 '.'，其他值转换为字符串
          out += (v === 0 ? '.' : String(v)) + ' '
        }
        
        out += '|\n'
      }
      
      // 添加底部分隔线
      out += sep
      // 移除末尾的空白字符并返回
      return out.trimEnd()
    },
  }
}

/** 从 9×9 题目创建局面（会拷贝入参） */
export function createSudoku(input) {
  if (!isGrid9x9(input)) {
    throw new Error('createSudoku: expected 9x9 grid with values 0..9')
  }
  const base = cloneGrid(input)
  return createSudokuModel(base, base)
}

/** 从 `toJSON()` 结果或 JSON 字符串恢复局面 */
export function createSudokuFromJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  if (!isValidSudokuJson(data)) {
    throw new Error('createSudokuFromJSON: invalid payload')
  }
  return createSudokuModel(data.initial, data.grid)
}