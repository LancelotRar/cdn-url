# Issue tracker：本地 Markdown

本仓库的 issue 与 spec 以 markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 一个功能一个目录：`.scratch/<feature-slug>/`
- spec 为 `.scratch/<feature-slug>/spec.md`
- 实施工单一单一文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 起编号，**不要**合并成一个总工单文件
- triage 状态记录在每个 issue 文件顶部的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论与对话历史追加到文件底部，位于 `## Comments` 标题下

## 当 skill 要求「发布到 issue tracker」

在 `.scratch/<feature-slug>/` 下新建文件（目录不存在则创建）。

## 当 skill 要求「取出相关工单」

直接读取对应的文件路径。用户通常会直接给出路径或工单编号。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个文件，每个工单对应一个 **child** 文件。

- **Map**：`.scratch/<effort>/map.md`（承载 Notes / Decisions-so-far / Fog 正文）。
- **Child ticket**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 起编号，正文写问题本身。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **阻塞关系**：顶部附近的 `Blocked by: NN, NN` 行。当它列出的每个文件都是 `resolved` 时，该工单解除阻塞。
- **Frontier**：扫描 `.scratch/<effort>/issues/`，找未关闭、未阻塞、未认领的文件；编号最小者优先。
- **认领（Claim）**：动工前先设为 `Status: claimed` 并保存。
- **解决（Resolve）**：在 `## Answer` 标题下追加答案，设为 `Status: resolved`，再把一条上下文指针（要点 + 链接）追加到 `map.md` 的 Decisions-so-far。
