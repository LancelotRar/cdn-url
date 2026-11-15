# Triage 标签

各 skill 以五个规范 triage 角色表达状态。本文件把这个角色映射到本仓库 issue tracker 中实际使用的标签字符串。

| skill 中的角色 | 本仓库使用的标签 | 含义 |
| -------------- | ---------------- | ---- |
| `needs-triage`   | `needs-triage`   | 待维护者评估 |
| `needs-info`     | `needs-info`     | 等待报告者补充信息 |
| `ready-for-agent`| `ready-for-agent`| 已完整描述，可交给无人值守 agent |
| `ready-for-human`| `ready-for-human`| 需人工实现 |
| `wontfix`        | `wontfix`        | 不予处理 |

当 skill 提到某个角色（例如「打上 AFK-ready 的 triage 标签」）时，使用上表「本仓库使用的标签」列对应的字符串。

若改用其他命名（如 `bug:triage` 对应 `needs-triage`），直接修改「本仓库使用的标签」列。
