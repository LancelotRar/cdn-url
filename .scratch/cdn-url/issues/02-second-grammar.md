# 02: 第二种语法与 jsDelivr 家族

**What to build:** 同一条仓库单文件地址现在同时产出 3 个加速地址，我能直接看出两种地址语法的差别：`gh-proxy.com` 那类是把原地址拼在端点后面，`cdn.jsdelivr.net` 那类是把 `owner/repo@ref/path` 重排进自己的路径。`refs/heads/` 这类前缀被剥掉，`@ref` 在结果里明确可见，我不需要猜它用了哪个版本。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] 一条仓库单文件地址产出 3 行：`gh-proxy.com`、`cdn.jsdelivr.net`、`cdn.jsdmirror.cn`
- [ ] 两个路径重排式服务的地址形如 `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}`，ref 显式出现
- [ ] 输入带 `refs/heads/` 时，产出的 ref 等同于剥掉前缀后的分支名
- [ ] 输入带 `refs/tags/` 时行为同理
- [ ] 两个路径重排式服务对同一条源产出相同路径、仅主机名不同
- [ ] 测试覆盖：`refs/heads/` 剥离、`@ref` 显式、两个路径重排式加速地址的完整字符串
- [ ] 加速地址以完整文本展示，不被截断
