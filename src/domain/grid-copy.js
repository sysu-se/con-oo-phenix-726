/** 复制 9×9 数独网格（行数组独立，避免浅拷贝引用共享） */
export function cloneGrid(grid) {
  return grid.map((row) => [...row])
}
