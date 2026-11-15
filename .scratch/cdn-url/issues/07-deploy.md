# 07: 发布

**What to build:** 这个页面有了一个固定网址，我在手机上打开就能完成一次「粘贴 → 复制」，不用开电脑；同一个产物下载下来双击打开，行为与线上完全一致。

**Blocked by:** 06

**Status:** claimed

- [ ] 推送到远端后，GitHub Pages 上可以访问该页面
- [ ] 线上页面能完成一次完整的「粘贴 → 生成 → 复制」
- [ ] 手机浏览器上能完成同样的一次操作
- [ ] 从 Pages 下载下来的单文件产物，双击打开后行为与线上一致
- [x] 构建产物不包含任何运行时网络请求，页面功能不依赖外部资源

## Answer

**做了什么**

- 新增 `.github/workflows/deploy.yml`：`push: main` + `workflow_dispatch` 触发；`build` job 执行 `npm ci` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact`（`path: dist`）；`deploy` job（`needs: build`）用 `actions/deploy-pages` 发布，`environment: github-pages`，`url: ${{ steps.deployment.outputs.page_url }}`。权限 `contents: read` / `pages: write` / `id-token: write`，`concurrency: group: pages`、`cancel-in-progress: false`。用 Actions artifact 方式发布，不写 `gh-pages` 分支。
- 未改业务代码，未改 `vite.config.ts`。`base` 结论：产物已由 `vite-plugin-singlefile` 全部内联（构建日志只有一条 `Inlining` hint），HTML 里不存在任何 `src=`/`href=` 资源属性，也不存在 `/src/`、`/assets/`、`<base>`，因此项目子路径 `/cdn-url/` 不影响加载，保持 Vite 默认 `base` 即可。将来若引入未内联的外部资源，才需要把 `base` 设为 `'/cdn-url/'`。
- 未新增 `.nojekyll`：Actions artifact 发布不经过 Jekyll 构建，不需要。未新增 README（仓库暂无 README，按规则不在本工单擅自创建）；部署说明保留在 `C:\Users\Lancelot\AppData\Local\Temp\opencode\cdn-url-impl\DEPLOY-NOTES.md`。

**Actions 版本依据（webfetch 查询日期：2026-11-16，来源：各官方仓库 GitHub Releases API + tag API）**

| Action | 使用 | 最新 release | 主版本 tag 存在性 |
| --- | --- | --- | --- |
| actions/checkout | `@v7` | v7.0.1（2026-07-20） | `refs/tags/v7` → 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | `@v7` | v7.1.0（2026-10-08） | `refs/tags/v7` → 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/configure-pages | `@v6` | v6.0.0（2026-03-25） | `refs/tags/v6` → 45bfe0192ca1faeb007ade9deae92b16b8254a0d |
| actions/upload-pages-artifact | `@v5` | v5.0.0（2026-04-10） | `refs/tags/v5` → fc324d3547104276b827a68afc52ff2a11cc49c9 |
| actions/deploy-pages | `@v5` | v5.0.1（2026-09-01） | `refs/tags/v5` → 368f82528645a54fb793d4d04e342629a3f51346 |

输入项逐个核对过官方 `action.yml`（不是凭记忆）：`setup-node` 的 `node-version`/`cache`、`upload-pages-artifact` 的 `path`（必填，默认 `_site/`）、`deploy-pages` 的输出 `page_url`。`configure-pages@v6` 的 `enablement` 默认 `false`，不会用 `GITHUB_TOKEN` 去开启 Pages（官方说明开启需 PAT），所以首次仍需主 agent 用 `gh api -X POST repos/LancelotRar/cdn-url/pages -f build_type=workflow` 启用；workflow 里保留该步骤只用于读取 Pages 元数据，与官方 starter workflow 一致。

**本地验证（全部在本 worktree 执行，Node v24.16.0 / npm 11.17.0）**

- `npm ci` → `added 38 packages in 910ms`。
- `npx vitest run` → `Test Files 2 passed (2)`、`Tests 11 passed (11)`。
- `npm run build` → `✓ 8 modules transformed`，`[plugin vite:singlefile] Inlining: index-D9plTURa.js` / `Inlining: style-DWT298SB.css`，`dist/index.html 8.90 kB`。
- `dist` 内容：`find . -type f` 只有 `./index.html`（8,908 字节）。
- 外部加载/网络调用 grep（在 `dist/index.html` 上）：`script[^>]*src=`、`link[^>]*href=`、`fetch(`、`XMLHttpRequest`、`new Worker(`、`importScripts(` **全部 0 命中**；`(src|href)="..."` 也 0 命中；`/src/`、`/assets/`、`<base` 0 命中；无 `from"…"`/`import` 残留。唯一的 `<script` 是 `<script type="module" crossorigin>`（内联），唯一的 `href=` 是 JS 里给「打开」按钮赋 `o.href = e.url`。HTML 中出现的 `https://…` 全部是注册表端点数据与占位提示，不是加载指令。
- YAML 语法：`npx --yes js-yaml .github/workflows/deploy.yml` 解析成功，回显的 `on`/`permissions`/`concurrency`/`jobs.build.steps`/`jobs.deploy.environment` 结构与预期一致（该检查只在本地跑，未加入 CI 依赖）。
- 单文件离线可开（静态论证）：产物无任何资源属性、无绝对路径引用、无 `import` 语句，脚本与样式都在 `<script>`/`<style>` 内联，因此 `file://` 双击不会触发任何相对/绝对路径加载。浏览器实测受限：browse 扩展拒绝 `file:` 导航（需 `OPENCODE_BROWSER_ALLOW_FILE_URLS=1`），改用本地 HTTP 静态服务（`127.0.0.1:4174` 指向 `dist`）在真实 Edge 中加载：页面标题正确，粘贴 `https://raw.githubusercontent.com/octocat/Hello-World/master/README.md` 后生成 3 行加速地址（gh-proxy.com / cdn.jsdelivr.net / cdn.jsdmirror.cn），「打开」按钮 `href` 与「复制」按钮均正常渲染。
- 运行时网络请求实测：网络捕获窗口内重新加载页面并粘贴 → 页面自身只发出 **1 个** 请求（`document` `http://127.0.0.1:4174/`，200）；其余请求全部来自浏览器扩展（`chrome-extension://…` 及其遥测 `mcs.zijieapi.com` / `abtestvm.bytedance.com`），与本页产物无关。`pageerror` 为 0。
- 产物一致性论证：`upload-pages-artifact` 把 `path: dist` 整个目录打成 artifact（默认排除点开头文件，本产物只有 `index.html`），`deploy-pages` 原样发布该 artifact，因此线上 `index.html` 与 `npm run build` 的 `dist/index.html` 逐字节相同。

**验收勾选情况**

- 第 5 项（产物无运行时网络请求）已勾选，证据见上。
- 前 4 项（线上可访问、线上完整流程、手机端、下载产物行为一致）**保持未勾选**，待主 agent 建仓推送并验证；其中「下载产物行为一致」的静态/构造性论证已在上方给出，仍以线上实测为准。

**关键文件**：`.github/workflows/deploy.yml`

**提交**

- `1c8008b` feat: 添加 GitHub Pages 发布工作流（本工单唯一功能提交；本文件的状态与记录另起 docs 提交）
- 本分支已 `git merge feat/cdn-url-spec`（结果 `Already up to date`）。未推送、未合并进集成分支、未动 `main`。

**遗留问题**

- 首次发布前必须启用 Pages（`build_type=workflow`），否则 `deploy-pages` 会报 Pages 未启用；这一步需要仓库管理权限，由主 agent 执行。
- CI 未跑 `npx vitest run`（工单只要求 `npm ci` + `npm run build`）；若希望发布前拦掉回归，可在 build job 里加一步测试。
- 若将来 Vite 输出改为多文件或引入外部资源，需同时设置 `base: '/cdn-url/'` 并放弃单文件约束，否则 Pages 子路径下会 404。

