# 03: 六类源与六种拒绝

**What to build:** 我能粘四类源里的任意一种——仓库单文件、gist 直链、release 资产、归档包——每条只出现**真正能服务它**的服务，八个服务之间的能力差异第一次真正起作用。粘错东西时我得到的是一句具体原因，不是笼统的格式错误。

**Blocked by:** 02

**Status:** claimed

- [x] 仓库单文件产出 8 个加速地址（两个路径重排式 + 六个前缀拼接式）
- [x] gist 直链产出 7 个，`github.chenc.dev` 不出现（实现为 5 行：两个路径重排式不支持 gist，见 Answer 的冲突说明）
- [x] gist 页面地址 `gist.github.com/{user}/{id}` 与 gist raw 直链产出完全相同的结果
- [x] release 资产产出 6 个前缀拼接式地址，两个路径重排式服务不出现
- [x] 归档包产出 6 个前缀拼接式地址，两个路径重排式服务不出现
- [x] release 资产与归档包的地址原样透传，不被重排成 `gh/` 路径
- [x] `tree` 目录页被拒绝，理由是目录页不支持
- [x] `api.github.com` 被拒绝，理由与 `tree` 不同
- [x] `codeload.github.com` 被拒绝，理由与上两者不同
- [x] 仓库首页被拒绝，理由是缺少文件路径
- [x] 非 GitHub 域名被拒绝，理由是域名不支持
- [x] 无法识别的路径形状被拒绝，理由是形状无法识别
- [x] 旧式 `github.com/{owner}/{repo}/raw/{ref}/{path}` 与 `blob` 页产出相同结果
- [x] `?raw=true` 被丢弃；其他查询串原样保留；fragment 被丢弃
- [x] 测试覆盖四类源各至少一条、六种拒绝各一条

## Answer

**做了什么**

- 服务注册表补齐到 spec 表格的 8 条：两个路径重排式（`cdn.jsdelivr.net`、`cdn.jsdmirror.cn`，仅仓库单文件）+ 六个前缀拼接式；`gh-proxy.com`、`github.chenc.dev` 去协议前缀，其余保留。能力集合严格按表格数据，`github.chenc.dev` 不含 gist。
- 归一化覆盖四类源：
  - 仓库单文件：`blob` 页、旧式 `/raw/`、`raw.githubusercontent.com` 直链统一成 `{owner, repo, ref, path}` 四元组并重建 raw 直链；`refs/heads/`、`refs/tags/` 剥掉前缀保留 ref 名。
  - gist：`gist.github.com/{user}/{id}`（fragment 丢弃）与 `gist.githubusercontent.com/{user}/{id}/raw[…]` 都落成 `https://gist.githubusercontent.com/{user}/{id}/raw`，不反推锚点、不枚举文件、不调 API；卡片带 `note`「仅适用于单文件 gist」，`main.ts` 已有的 note 渲染直接生效。
  - release 资产（`/releases/download/{tag}/{file}`）与归档包（`/archive/refs/{heads|tags}/{ref}.zip`）以清洗后的原地址透传，只给前缀拼接式服务。
- 清洗：丢弃 fragment；`?raw=true` 按参数逐项剔除（其余参数保留原始文本与顺序）；重建直链与路径重排地址带同一查询串；前缀拼接直接继承。路径重排地址一律显式 `@ref`。
- 六种拒绝各自独立 `ErrorType`，判定顺序为 `api.github.com` / `codeload.github.com` → 非 GitHub 域名 → `tree` → 仓库首页 → 无法识别；主机名大小写不敏感（`GitHub.com` 可识别）。
- 能力过滤仍只在 `convert` 内完成，界面层未新增判断逻辑。

**验证证据**

- `npx vitest run`：`Test Files 2 passed (2)` / `Tests 34 passed (34)`（含工单 06 的 `tests/fallback.test.ts`，已把仓库单文件基线从 3 行更新为 8 行）。
- `npm run build`：`tsc --noEmit && vite build` 通过，`dist/index.html 11.13 kB │ gzip: 4.11 kB`；`dist/` 只有一个 `index.html`，无外链 `script`/`link`、无 `fetch(`。
- 测试为表驱动、只断言 `convert` 外部行为、期望值写完整字符串；覆盖四类源、六种拒绝、`?raw=true` 丢弃、未知查询串保留、fragment 丢弃、主机名大小写、同一文本混排（含空行与拒绝共存）、gist 页面与 raw 结果一致。

**关键文件**

- `src/normalize.ts`（四类源归一化、清洗规则、六种拒绝）
- `src/services.ts`（8 条注册表 + 备用入口记录、两种构造器）
- `src/types.ts`（`GistTarget` / `PassthroughTarget` / `RepoFileTarget.query`）
- `src/convert.ts`（能力过滤 + gist note）
- `tests/convert.test.ts`（表驱动用例）
- `tests/fallback.test.ts`（合并集成分支后更新仓库单文件基线为 8 行）

**提交**

- 代码提交：`c04b33d`
- 合并集成分支（含工单 06）的合并提交：`98d1152`
- 本工单记录随其后的 docs 提交进入 `ticket/03-six-source-types`。

**未验证 / 遗留与冲突**

- **spec 内部冲突（已按 spec 表格实现）**：Implementation Decisions 的散文说「gist 直链 → 7 个（`github.chenc.dev` 不支持）」，但同一节的表格给 `cdn.jsdelivr.net` / `cdn.jsdmirror.cn` 的能力只有「仓库单文件」，且 Problem Statement 明确「把 gist 地址交给 jsDelivr 一定是 404」。实测 `cdn.jsdelivr.net/gh/{user}/{gistId}…` 多种形态均 404，路径重排语法也拿不到 gist 的 `ref`/`path`。因此按表格数据实现为 5 行（五个前缀拼接式，无 chenc、无两个路径重排式），工单里的「7 个」未按字面满足。
- `ghfast.top` 在本网络出口对 raw 直链返回 403（见 `SERVICE-CHECKS.md`），注册表仍按 spec 标记为四类全支持，未改数据；这是已知的矩阵腐烂风险。
- `tree` 目录页、`api.github.com`、`codeload.github.com` 按 spec 属于 Out of Scope 的「不生成地址」，本工单只负责给出精确拒绝类型，不生成任何可用地址。
- 未做浏览器/视觉回归（项目约定不做浏览器测试）；gist note 的界面显示依赖 `main.ts` 既有 `.card-note` 渲染，仅以代码审阅与构建为证据。
