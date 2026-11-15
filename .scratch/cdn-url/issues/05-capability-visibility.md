# 05: 能力可见

**What to build:** 每条结果行尾带着这家服务的支持范围，我能一眼看出它除了当前这类源还能吃什么；页面底部有一张完整的八服务 × 四源类型矩阵，所以当某条源只出 6 家、没有 jsDelivr 时，我知道是我漏了还是它本来就不支持。

**Blocked by:** 03

**Status:** resolved

- [x] 每条结果行显示该服务的能力标签，覆盖仓库单文件、gist 直链、release 资产、归档包四类
- [x] 标签内容与该服务实际出现的场合一致：`github.chenc.dev` 的行上不出现 gist 标签
- [x] 页面底部矩阵表列出全部 8 个服务的四类能力
- [x] 被能力过滤掉的服务能在矩阵表里查到它不支持该源类型
- [x] 矩阵表内容与生成地址时使用的服务注册表一致，不存在两处各说各话
- [x] 手机宽度下矩阵表可读（不出现横向裁切导致内容不可见）

## Answer

### 做了什么

`convert` 的返回值从 `{ cards }` 扩成 `{ cards, catalog }`。`catalog` 是渲染能力标签与矩阵所需的目录数据，由同一份 `SERVICES` 注册表过滤 `fallback !== true` 得到，因此恰好 8 条主服务（`fastly/gcore/testingcf.jsdelivr.net` 不在其中），每条带显示名与四类能力；`catalog.sourceTypes` 给出矩阵的四列顺序，界面不自带源类型集合、不 import 注册表。

行上标签（`src/capabilities.ts` → `renderCapabilityTags`）用文字胶囊表达两层信息：

- 蓝色实心「本条 · 仓库单文件」点明当前源属于哪类；
- 灰色「也支持：gist 直链 / release 资产 / 归档包」列出该服务其余能力；只有一类时显示「仅支持这一类」。

只渲染该服务真正支持的能力，所以 `github.chenc.dev` 的行上是「本条 · 仓库单文件 / 也支持：release 资产、归档包」，gist 文案根本不出现；gist 卡片里也没有 chenc 这一行。

底部矩阵（`renderMatrix`）用 `<table>` + `<caption>` + `th scope`，8 行 × 4 列，支持 `✓`、不支持 `—`，每个符号后跟一个 `.visually-hidden` 的「支持 / 不支持」供读屏，不依赖颜色。表头与行首文字由目录数据生成，矩阵与过滤逻辑同源，不存在两处各说各话。

响应式采用**横向滚动容器**方案（工单允许的第二种）：`.matrix-host { overflow-x: auto }`，表格 `min-width: 360px`，窄屏左右滑动即可看全四列，页面本身不横向溢出。矩阵上方提示文案明确写出「窄屏可左右滑动表格查看全部列」，并说明备用入口不单列。

### 验证

- `npx vitest run`：`Test Files 3 passed (3)`、`Tests 60 passed (60)`（新增 `tests/capabilities.test.ts`，表驱动断言：目录恰 8 条且顺序与注册表一致、无任何 fallback 名称、每条能力集合与 spec 表格逐字一致、四类源类型顺序为 repo-file/gist/release-asset/archive、开关打开后目录不变、每行能力与目录条目一致、chenc 行能力不含 gist、每类源卡片出现的服务集合 === 目录里声称支持该类的服务集合）。
- `npm run build`：`tsc --noEmit` 通过，`vite v8.3.8` 输出 `dist/index.html │ 15.37 kB │ gzip: 5.36 kB`；`ls dist` 只有一个 `index.html`。
- 单文件产物自检：`<script>` 只有 1 个内联 module、无 `<link>` 标签、`grep -c 'fetch('` 为 0；产物里出现的 `https://...` 全是注册表里的端点字符串数据，不是被加载的外部资源。
- 窄屏实测（Edge，`npm run preview` + http://localhost:4173，viewport 320×900）：`documentElement.scrollWidth 305 === clientWidth 305`（页面无横向溢出），`.matrix-host` `clientWidth 271 / scrollWidth 360`，可滚动 89px，四列表头 `服务 / 仓库单文件 / gist 直链 / release 资产 / 归档包` 齐全，`tbody` 8 行，`github.chenc.dev` 行为 `✓ — ✓ ✓`；320px 下截图确认标签换行正常、矩阵无内容被裁掉（滚动可达）。360px 时容器只需滚动 49px，1920px 时无需滚动。
- 静态核对方式（无浏览器环境下可复现）：`src/capabilities.ts` 的矩阵行来自 `result.catalog.services`，列来自 `result.catalog.sourceTypes`；`tests/capabilities.test.ts` 用「目录声称支持某类 === 该类卡片实际出现的服务」把两处绑死。

### 关键文件

- `src/types.ts`：`CatalogEntry`、`ServiceCatalog`，`ConversionResult.catalog`
- `src/convert.ts`：`buildCatalog()`，`SOURCE_TYPES` 列顺序
- `src/capabilities.ts`：能力标签与矩阵渲染（新增）
- `src/main.ts`：`renderLine(line, card.sourceType)` 接入标签，`render()` 渲染矩阵
- `index.html`、`src/styles.css`：矩阵区块、胶囊与矩阵样式、窄屏滚动容器
- `tests/capabilities.test.ts`（新增）

### 提交

- `1528cf1` feat: 结果行能力标签与八服务支持矩阵
- 已 `git merge feat/cdn-url-spec`：`Already up to date.`（合并时集成分支 tip 仍为 `51225b3`）

### 遗留

- 工单 04 尚未进入集成分支；它若改 `main.ts` 的 `renderLine`/`render`，冲突点仅是新签名 `renderLine(line, card.sourceType)` 与 `item.append(...)` 那一行，能力标签区块与 04 的等价标注/复制按钮互不覆盖。
- 窄屏选了横向滚动而非分块堆叠，极窄屏需要左右滑动一次才能看到「归档包」列（已在页面提示中说明）。
