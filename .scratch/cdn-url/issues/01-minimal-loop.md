# 01: 骨架 + 从粘贴到复制的最小闭环

**What to build:** 我在一个不需要服务器的页面里粘一条 `raw.githubusercontent.com` 仓库单文件地址，页面上出现一行 `gh-proxy.com` 的加速地址；我点「复制」把它拿到剪贴板，点「打开」能自己验证它通不通。这一条同时把工程骨架立起来——构建、单文件产物、测试运行器，否则后面所有切片都没有落点。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 产物是单个自包含 HTML 文件，双击能在浏览器里打开并渲染，不依赖本地服务器
- [ ] 粘贴一条 `raw.githubusercontent.com` 仓库单文件地址后，出现且仅出现一行加速地址，文本为 `https://gh-proxy.com/raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}`
- [ ] 点该行「复制」后，剪贴板内容与该行地址完全一致
- [ ] 点该行「打开」在新标签页打开该地址
- [ ] 测试运行器可执行，且至少有一条表驱动用例，输入真实地址、断言加速地址的完整字符串
- [ ] 输入为空时页面不渲染任何卡片，也不报错
