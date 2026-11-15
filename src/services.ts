import type { NormalizedTarget, Service } from "./types";

/**
 * 加速服务注册表。扁平数据：一个服务一条记录，新增服务不改逻辑。
 * 能力集合来自 spec 的实测矩阵；github.chenc.dev 不支持 gist 直链。
 */
export const SERVICES: readonly Service[] = [
  {
    id: "gh-proxy",
    name: "gh-proxy.com",
    endpoint: "https://gh-proxy.com",
    syntax: "prefix",
    stripScheme: true,
    capabilities: ["repo-file", "gist", "release-asset", "archive"],
  },
  {
    id: "jsdelivr",
    name: "cdn.jsdelivr.net",
    endpoint: "https://cdn.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
  },
  {
    id: "jsdmirror",
    name: "cdn.jsdmirror.cn",
    endpoint: "https://cdn.jsdmirror.cn",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
  },
  {
    id: "ghproxy-net",
    name: "ghproxy.net",
    endpoint: "https://ghproxy.net",
    syntax: "prefix",
    stripScheme: false,
    capabilities: ["repo-file", "gist", "release-asset", "archive"],
  },
  {
    id: "ghfast",
    name: "ghfast.top",
    endpoint: "https://ghfast.top",
    syntax: "prefix",
    stripScheme: false,
    capabilities: ["repo-file", "gist", "release-asset", "archive"],
  },
  {
    id: "ghproxy-icu",
    name: "ghproxy.icu",
    endpoint: "https://ghproxy.icu",
    syntax: "prefix",
    stripScheme: false,
    capabilities: ["repo-file", "gist", "release-asset", "archive"],
  },
  {
    id: "fastgit",
    name: "fastgit.cc",
    endpoint: "https://fastgit.cc",
    syntax: "prefix",
    stripScheme: false,
    capabilities: ["repo-file", "gist", "release-asset", "archive"],
  },
  {
    id: "chenc",
    name: "github.chenc.dev",
    endpoint: "https://github.chenc.dev",
    syntax: "prefix",
    stripScheme: true,
    capabilities: ["repo-file", "release-asset", "archive"],
  },
  // jsDelivr 官方备用入口：同一套路径重排语法，只有主机名不同；始终作为所属分组的变体。
  // `fallbackOf` 指向所属的主服务分组，因此它们不单独成组，只作为该组的变体。
  {
    id: "jsdelivr-fastly",
    name: "fastly.jsdelivr.net",
    endpoint: "https://fastly.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallbackOf: "jsdelivr",
  },
  {
    id: "jsdelivr-gcore",
    name: "gcore.jsdelivr.net",
    endpoint: "https://gcore.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallbackOf: "jsdelivr",
  },
  {
    id: "jsdelivr-testingcf",
    name: "testingcf.jsdelivr.net",
    endpoint: "https://testingcf.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallbackOf: "jsdelivr",
  },
];

/** 按地址语法把归一化目标构造成加速地址。 */
export function buildAcceleratedUrl(service: Service, target: NormalizedTarget): string {
  if (service.syntax === "prefix") {
    const body = service.stripScheme
      ? target.directUrl.replace(/^https?:\/\//, "")
      : target.directUrl;
    return `${service.endpoint}/${body}`;
  }

  if (target.kind !== "repo-file") {
    throw new Error(`${service.name} 只支持仓库单文件，能力过滤应拦住其他源类型`);
  }

  return `${service.endpoint}/gh/${target.owner}/${target.repo}@${target.ref}/${target.path}${target.query}`;
}
