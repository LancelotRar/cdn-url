# 01: 骨架 + 从粘贴到复制的最小闭环

**What to build:** 我在一个不需要服务器的页面里粘一条 `raw.githubusercontent.com` 仓库单文件地址，页面上出现一行 `gh-proxy.com` 的加速地址；我点「复制」把它拿到剪贴板，点「打开」能自己验证它通不通。这一条同时把工程骨架立起来——构建、单文件产物、测试运行器，否则后面所有切片都没有落点。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 产物是单个自包含 HTML 文件，双击能在浏览器里打开并渲染，不依赖本地服务器
- [x] 粘贴一条 `raw.githubusercontent.com` 仓库单文件地址后，出现且仅出现一行加速地址，文本为 `https://gh-proxy.com/raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}`
- [x] 点该行「复制」后，剪贴板内容与该行地址完全一致
- [x] 点该行「打开」在新标签页打开该地址
- [x] 测试运行器可执行，且至少有一条表驱动用例，输入真实地址、断言加速地址的完整字符串
- [x] 输入为空时页面不渲染任何卡片，也不报错

## Answer

### 做了什么

- 工程骨架：TypeScript + Vite 8 + Vitest 5，`vite-plugin-singlefile` 把 JS/CSS 内联成单个 `dist/index.html`；关闭 modulePreload polyfill，产物里不再出现 `fetch(`。
- 唯一接缝 `src/convert.ts`：`convert(text) → ConversionResult`，只做「逐行 trim → 归一化 → 按能力挑服务 → 拼加速地址」，界面层只渲染。
- 归一化 `src/normalize.ts`：工单 01 只把 `raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}` 解析成四元组并重建直链；`api.github.com`、`codeload.github.com`、非 GitHub 域名与其余形状给出错误类型。
- 服务注册表 `src/services.ts`：仅一条 `gh-proxy.com`（前缀拼接、去掉协议前缀、能力全集）。
- 界面 `src/main.ts` + `src/styles.css`：多行输入框、逐条卡片、每行完整地址 + 「复制」+ 「打开」；空输入不渲染卡片也不报错。复制优先 `navigator.clipboard`，不可用时退回 `textarea + document.execCommand('copy')`（`src/clipboard.ts`）。
- 测试 `tests/convert.test.ts`：Vitest 表驱动，两条真实 `raw.githubusercontent.com` 地址断言完整加速地址字符串，两条空输入断言零卡片。

### 验证

- `npx vitest run` → `Test Files 1 passed (1)`、`Tests 4 passed (4)`。
- `npm run build` → `dist/index.html 7.39 kB`（tsc --noEmit 通过）。产物自检：`dist` 下只有 `index.html`；`grep -c "fetch(" dist/index.html` = 0；无 `<link>`；唯一 `<script>` 为无 `src` 的内联 module。
- `file://` 实测（Edge 157 headless，经 CDP 直接打开 `dist/index.html`）：协议 `file:`、初始 0 卡片；填入真实地址后 1 张卡片、1 行完整地址 `https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/README.md`，打开链接 `target="_blank"`；可信点击「复制」后按钮显示「已复制」；清空输入后 0 卡片 0 错误；整页网络请求数为 0。
- 交互补充实测（本地 http 静态服务 + 真实浏览器）：点击复制后 `navigator.clipboard.readText()` 返回与该行完全一致的地址。

### 关键文件

- `src/convert.ts`、`src/normalize.ts`、`src/services.ts`、`src/types.ts`
- `src/main.ts`、`src/clipboard.ts`、`src/styles.css`
- `tests/convert.test.ts`
- `index.html`、`vite.config.ts`、`vitest.config.ts`、`tsconfig.json`、`package.json`

### 提交

- `ticket/01-minimal-loop`：`9adefe1` feat: 建立单文件静态页骨架并打通 gh-proxy.com 转换闭环（代码提交）

### 遗留

- 归一化只覆盖 `raw.githubusercontent.com`；`blob` 页、旧式 `/raw/`、`refs/heads/` 剥离、`?raw=true` 清洗、gist、release 资产、归档包留给后续工单。
- 注册表只有 `gh-proxy.com`；其余 7 个服务、jsDelivr 备用入口开关、卡片级/页面级复制、支持矩阵留给后续工单。
