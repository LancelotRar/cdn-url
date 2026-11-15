# Domain 文档

各工程 skill 在探查本仓库代码时，应如何消费本仓库的领域文档。

## 探查之前先读这些

- 仓库根目录的 **`GLOSSARY.md`**；或
- 若存在根目录 **`GLOSSARY-MAP.md`**：它指向每个 context 各自的 `GLOSSARY.md`，读取与当前主题相关的那些。
- **`docs/adr/`**：读取与你即将改动的区域相关的 ADR。多 context 仓库还要检查 `src/<context>/docs/adr/` 中 context 级的决策。

这些文件若不存在，**静默继续**。不要提示缺失，不要主动建议提前创建。`/domain-modeling` skill（经由 `/grill-with-docs` 与 `/improve-codebase-architecture` 触达）会在术语或决策真正被确定时按需创建它们。

## 文件结构

单 context 仓库（绝大多数仓库）：

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多 context 仓库（根目录存在 `GLOSSARY-MAP.md`）：

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context 级决策
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## 使用术语表的词汇

当你的产出提到某个领域概念（issue 标题、重构提案、假设、测试名称）时，使用 `GLOSSARY.md` 中定义的术语。不要漂移到术语表明确回避的同义词。

如果你需要的概念还不在术语表中，那是一个信号：要么你在发明项目并不使用的语言（重新考虑），要么确实存在缺口（记下来交给 `/domain-modeling`）。

## 标注 ADR 冲突

若你的产出与既有 ADR 相矛盾，要显式指出，而不是悄悄覆盖：

> _与 ADR-0007（event-sourced orders）相矛盾，但值得重开讨论，因为……_
