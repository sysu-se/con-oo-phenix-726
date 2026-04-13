// 统一导出作业要求的四个函数。
import {
  createSudoku as createSudokuImpl,
  createSudokuFromJSON as createSudokuFromJSONImpl,
} from './sudoku.js'
import {
  createGame as createGameImpl,
  createGameFromJSON as createGameFromJSONImpl,
} from './game.js'

export function createSudoku(input) {
  return createSudokuImpl(input)
}

export function createSudokuFromJSON(json) {
  return createSudokuFromJSONImpl(json)
}

export function createGame({ sudoku }) {
  return createGameImpl({ sudoku })
}

export function createGameFromJSON(json) {
  return createGameFromJSONImpl(json)
}
