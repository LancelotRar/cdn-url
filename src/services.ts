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
