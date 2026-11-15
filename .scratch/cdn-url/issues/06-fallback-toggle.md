# 06: jsDelivr 备用入口开关

**What to build:** 有一个默认关闭的开关，打开后 jsDelivr 家族多出 `fastly`、`gcore`、`testingcf` 三个官方备用入口，用的是同一套路径语法。平时结果列表不会被这三行冗余地址撑长；当主入口在我这里解析不动时，我打开开关就有替代品。

**Blocked by:** 02

**Status:** claimed

- [x] 开关默认处于关闭状态
- [x] 关闭时结果中只有主入口，不出现任何备用入口
- [x] 打开后 jsDelivr 家族额外出现 3 行，且切换立即生效、无需重新粘贴
- [x] 备用入口的路径与主入口完全一致，只有主机名不同
- [x] 关闭后这 3 行消失
- [x] 测试覆盖开关关闭与打开两种状态下的服务集合

## Answer

**做了什么**

- 服务注册表以追加数据的方式新增 `fastly.jsdelivr.net`、`gcore.jsdelivr.net`、`testingcf.jsdelivr.net` 三条记录，与 `cdn.jsdelivr.net` 同语法（`rearrange`）、同能力（仅 `repo-file`），用新增的可选字段 `fallback: true` 标记；既有条目的字段与顺序未改动。
- `convert` 增加可选第二参数 `options?: ConvertOptions`（`jsdelivrFallbacks?: boolean`），默认关闭；关闭时 `fallback` 记录不参与生成，打开时仅对仓库单文件额外产出 3 行，路径与主入口完全一致。
- `index.html` 增加默认未勾选的复选框 `#jsdelivr-fallbacks`；`main.ts` 的 `change` 与输入事件共用同一个 `refresh`，切换后立即用当前输入重算，无需重新粘贴。
- 未改矩阵、能力标签、等价判定、批量复制，也没有把备用入口写进矩阵表行数。

**验证**

- `npx vitest run`：`Test Files 2 passed (2)`、`Tests 11 passed (11)`（新增 `tests/fallback.test.ts` 覆盖默认关闭、显式 `false`、显式 `true`、路径仅主机名不同）。
- `npm run build`：`tsc --noEmit` 通过，`vite build` 完成单文件内联，产物 `dist/index.html 8.90 kB`。
- TDD 记录：先写测试得到 2 个失败（`expected undefined to be defined`、启用态服务集合不符），实现后转绿。

**关键文件**

- `src/services.ts`（追加 3 条备用入口数据）
- `src/types.ts`（`Service.fallback`、`ConvertOptions`）
- `src/convert.ts`（第二参数与过滤逻辑）
- `src/main.ts`、`index.html`、`src/styles.css`（开关与即时重算）
- `tests/fallback.test.ts`

**提交**

- `67d19c7` feat: 加入 jsDelivr 备用入口开关

**遗留**

- 集成分支当前尚未合入工单 03，仓库单文件结果此刻只有 3 个主入口；合入 03 后备用入口仍追加在注册表末尾、默认关闭，既有断言不受影响。
