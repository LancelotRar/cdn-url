# 02: 第二种语法与 jsDelivr 家族

**What to build:** 同一条仓库单文件地址现在同时产出 3 个加速地址，我能直接看出两种地址语法的差别：`gh-proxy.com` 那类是把原地址拼在端点后面，`cdn.jsdelivr.net` 那类是把 `owner/repo@ref/path` 重排进自己的路径。`refs/heads/` 这类前缀被剥掉，`@ref` 在结果里明确可见，我不需要猜它用了哪个版本。

**Blocked by:** 01

**Status:** resolved

- [x] 一条仓库单文件地址产出 3 行：`gh-proxy.com`、`cdn.jsdelivr.net`、`cdn.jsdmirror.cn`
- [x] 两个路径重排式服务的地址形如 `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}`，ref 显式出现
- [x] 输入带 `refs/heads/` 时，产出的 ref 等同于剥掉前缀后的分支名
- [x] 输入带 `refs/tags/` 时行为同理
- [x] 两个路径重排式服务对同一条源产出相同路径、仅主机名不同
- [x] 测试覆盖：`refs/heads/` 剥离、`@ref` 显式、两个路径重排式加速地址的完整字符串
- [x] 加速地址以完整文本展示，不被截断

## Answer

**做了什么**

- 注册表新增两条 `rearrange`（路径重排）服务：`cdn.jsdelivr.net`、`cdn.jsdmirror.cn`，能力仅 `repo-file`，构造形如 `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}`。
- `buildAcceleratedUrl` 的入参从直链字符串改成归一化目标（`NormalizedTarget`，含 `owner/repo/ref/path` 与 `directUrl`），两种语法共用同一入口；界面层未增加判断逻辑。
- 归一化剥离 `refs/heads/`、`refs/tags/` 前缀后保留其后的 ref 名，重建直链也用剥离后的 ref；仅剥这两个前缀，未臆造 ref 含斜杠的形态。
- 一条仓库单文件源地址现在产出 3 行：`gh-proxy.com`、`cdn.jsdelivr.net`、`cdn.jsdmirror.cn`。
- CSS 已满足完整展示：`.line-url` 用 `word-break: break-all`，全文件无 `text-overflow: ellipsis`、`white-space: nowrap`、`overflow: hidden` 组合，无需改动。

**验证证据**

- `npx vitest run`：`Test Files 1 passed (1)` / `Tests 7 passed (7)`。
- `npm run build`：`tsc --noEmit && vite build` 通过，`dist/index.html 7.79 kB │ gzip: 3.24 kB`，单文件产物正常内联。
- 测试为表驱动、只断言 `convert` 外部行为、期望值写完整字符串，覆盖 `refs/heads/` 剥离、`refs/tags/` 剥离、`@ref` 显式、两条路径重排地址完整字符串、同路径只差主机名。

**关键文件**

- `src/services.ts`（注册表两条新服务、`buildAcceleratedUrl` 改归一化目标入参）
- `src/normalize.ts`（`refs/heads/`、`refs/tags/` 前缀剥离）
- `src/types.ts`（新增 `RepoFileTarget` / `NormalizedTarget`）
- `src/convert.ts`（传入归一化目标）
- `tests/convert.test.ts`（3 行输出与两种语法用例）

**提交**

- 代码提交：`092fe42`
- 本工单记录随其后的 docs 提交进入 `ticket/02-second-grammar`。

**未验证 / 遗留**

- 未做浏览器或视觉回归测试（项目约定不做浏览器测试）；「完整展示不被截断」仅以 CSS 审查为证据。
- 仅支持 `raw.githubusercontent.com` 一种仓库单文件输入形态；`blob` 页、旧式 `/raw/` 等由工单 03 处理。
