import type { NormalizedTarget, Service } from "./types";

/**
 * 加速服务注册表。扁平数据：一个服务一条记录，新增服务不改逻辑。
 * 工单 02 加入两条路径重排式服务，与 gh-proxy.com 共用同一个构造入口。
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
  // jsDelivr 官方备用入口：同一套路径重排语法，只有主机名不同；由开关统一增删。
  {
    id: "jsdelivr-fastly",
    name: "fastly.jsdelivr.net",
    endpoint: "https://fastly.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallback: true,
  },
  {
    id: "jsdelivr-gcore",
    name: "gcore.jsdelivr.net",
    endpoint: "https://gcore.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallback: true,
  },
  {
    id: "jsdelivr-testingcf",
    name: "testingcf.jsdelivr.net",
    endpoint: "https://testingcf.jsdelivr.net",
    syntax: "rearrange",
    stripScheme: false,
    capabilities: ["repo-file"],
    fallback: true,
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

  return `${service.endpoint}/gh/${target.owner}/${target.repo}@${target.ref}/${target.path}`;
}
