# cdn-url

把一个 GitHub 源地址转换成多个加速服务的下载地址。这个上下文只处理**地址形态**：不下载、不缓存、不校验任何文件内容。

## Language

**源地址**：
用户粘贴进来的地址，形如 `github.com/...`、`raw.githubusercontent.com/...`、`gist.github.com/...`。
_Avoid_: 原始链接、输入 URL、长链接

**直链**：
指向单个文件内容的地址，只有 `raw.githubusercontent.com` 与 `gist.githubusercontent.com` 两种宿主。源地址本身可能就是直链，也可能只是无法直接下载的浏览页。
_Avoid_: raw 链接、真实地址、原文件地址

**归一化**：
把源地址解析成 `{owner, repo, ref, path}` 四元组或 `{user, gistId}` 标识，并在需要时重建为直链。它是唯一的数据入口，加速服务只消费归一化的结果。
_Avoid_: 解析、转换（「转换」指整个工具的行为，不指这一步）

**加速服务**：
一个可把直链变成另一个可下载地址的公开端点。
_Avoid_: 代理、镜像站、节点、加速器

**加速地址**：
某个加速服务为某条直链生成的可下载 URL，是本工具的唯一输出。
_Avoid_: 镜像地址、CDN 地址、转换后链接

**地址语法**：
一个加速服务构造加速地址的方式，只有两种：`路径重排`（把 `owner/repo@ref/path` 重排进路径，jsDelivr 家族）与 `前缀拼接`（把直链拼在端点之后，直链的协议前缀是否保留由各服务自行决定）。
_Avoid_: 格式、模式、类型

## 源类型

**仓库单文件**：
GitHub 仓库里某个具体文件，归一化后一律变成 `raw.githubusercontent.com` 直链。
_Avoid_: 普通链接、代码文件

**gist 直链**：
某个 gist 的单个文件内容，宿主为 `gist.githubusercontent.com`。gist 页面地址不含内容，必须先落成这种形态。
_Avoid_: 代码片段、gist 链接

**release 资产**：
某个 release 的附件，形状为 `.../releases/download/{tag}/{file}`。它不存在直链形态，无法被路径重排式服务承载。
_Avoid_: 附件、下载文件

**归档包**：
整个仓库在某个 ref 上的 zip 快照，形状为 `.../archive/refs/{heads|tags}/{ref}.zip`。同样不存在直链形态。
_Avoid_: 源码包、压缩包、archive
