# con-oo-phenix-726 - Review

## Review 结论

代码已经把 `Game/Sudoku` 接入到了开局、输入、撤销/重做这些主流程中，不再只是测试专用对象；但接入仍不彻底。校验、胜利判定、提示等关键业务规则仍主要停留在 Svelte store 一侧重算或旁路实现，导致领域对象没有成为唯一业务中心，整体属于“有领域对象、有适配层，但核心规则分散”的状态。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 校验与胜利判定没有真正以领域模型为单一事实来源

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/grid.js:46-52,125-164; src/node_modules/@sudoku/stores/game.js:7-18
- 原因：适配层只从 `game.toJSON().sudoku` 取出原始网格，再在 store 里重新计算 `invalidCells` 和 `gameWon`，而不是消费 `Sudoku.getInvalidCells()` / `Sudoku.isValid()` 或由 `Game` 直接导出的结果。这样会把数独业务规则拆成两份实现，领域对象虽然接入了输入流程，但没有接管完整业务语义，后续一旦规则调整，领域层和 UI 层很容易漂移。

### 2. 提示功能绕过了题目领域状态，直接对当前 UI 盘面重新求解

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:65-73
- 原因：`applyHint` 直接读取 `playingGrid` 并调用外部 `solveSudoku`，然后再把结果写回 `game.guess(...)`。这意味着提示答案并不是从当前 `Game/Sudoku` 持有的题目语义中导出，而是依赖“当前用户盘面还能否被求解”。当用户已经填错时，提示行为是否仍对应原题唯一解，取决于外部求解器而不是领域模型本身，业务语义不稳。

### 3. 适配层把 `toJSON()` 当成实时读取接口，运行时依赖了序列化结构

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:46-49
- 原因：`syncFromGame()` 每次都通过 `game.toJSON().sudoku` 取运行态数据，而不是调用专门的查询方法。这使 `toJSON()` 同时承担“持久化格式”和“UI 读模型”两种职责，导致领域模型的外表化结构反向约束前端运行时，破坏职责边界，也让后续演化序列化协议时更难保持兼容。

### 4. 新开局流程没有重置候选数状态，游戏生命周期不完整

- 严重程度：major
- 位置：src/node_modules/@sudoku/game.js:13-34; src/node_modules/@sudoku/stores/candidates.js:3-29; src/components/Board/Cell.svelte:40-44
- 原因：`startNew` / `startCustom` 会重置难度、棋盘、光标、计时和提示次数，但不会清空 `candidates`。而棋盘渲染时只要某格存在候选数就优先显示候选数，因此旧局残留的笔记有机会直接泄漏到新局。这说明部分游戏状态仍游离于 `Game` 生命周期之外，Svelte 接入没有把整局游戏状态收拢干净。

### 5. 领域 API 直接暴露了面向视图的字符串坐标格式

- 严重程度：minor
- 位置：src/domain/sudoku.js:54-63
- 原因：`getInvalidCells()` 返回的是 `"col,row"` 这样的字符串键，而 `guess(...)` 使用的是 `{ row, col, value }` 对象接口。领域层在同一对象里混用了两套坐标表达，并且返回值明显偏向 UI 高亮用途，这会让领域边界变得含糊，也解释了为什么前端后来选择自己再算一遍冲突格。

## 优点

### 1. 领域对象有明确的封装边界，主动防御外部直接篡改

- 位置：src/domain/sudoku.js:43-49,91-92,116-125; src/domain/game.js:58-68
- 原因：`Sudoku` 在创建、读取和序列化时都做了深拷贝，`Game` 也会克隆传入的 `sudoku` 并在 `getSudoku()` 时返回副本。这保证了 UI 不能直接拿到内部可变数组，封装意识是到位的。

### 2. 撤销/重做采用增量历史而不是整盘快照，职责划分清晰

- 位置：src/domain/game.js:74-124
- 原因：`Game` 只记录 `{row,col,oldValue,newValue}`，由 `Sudoku` 负责实际落子，`Game` 负责历史管理，并在新一步后清空 redo 栈。这比把整盘快照塞进历史更符合对象职责，也更利于后续扩展。

### 3. 主游戏流程已经真实经过领域对象，而不是只在测试里存在

- 位置：src/node_modules/@sudoku/stores/grid.js:54-84; src/node_modules/@sudoku/game.js:13-34; src/components/Modal/Types/Welcome.svelte:16-24; src/components/Controls/Keyboard.svelte:18-24; src/components/Controls/ActionBar/Actions.svelte:33-39
- 原因：开局会创建新的 `Game/Sudoku`，键盘输入会走 `game.guess(...)`，撤销/重做会走 `game.undo()` / `game.redo()`。从“开始一局游戏”“用户输入”“撤销/重做”这几条主链路看，领域对象已经进入真实 UI 流程。

### 4. 序列化和反序列化具备基础版本与形状校验

- 位置：src/domain/sudoku.js:25-33,164-178; src/domain/game.js:149-176
- 原因：`Sudoku` 和 `Game` 都提供了 `toJSON()` / `fromJSON` 风格入口，并对 version、grid 形状、history move 结构做了验证。这对于对象持久化和调试都是加分项。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/*`、`src/node_modules/@sudoku/*.js` 及相关 `.svelte` 调用点，未运行测试，也未实际点击界面验证运行时行为。
- 关于提示功能在“当前盘面已填错或无解”情况下的具体表现，结论来自 `src/node_modules/@sudoku/stores/grid.js` 与 `src/node_modules/@sudoku/sudoku.js` 的静态控制流分析，未实际执行外部求解器验证。
- 本审查严格聚焦于 `src/domain/*` 及其 Svelte 接入链路；未扩展评审到无关目录、样式细节或测试代码本身。
