import type { Service } from "./types";

/**
 * 加速服务注册表。扁平数据：一个服务一条记录，新增服务不改逻辑。
 * 工单 01 只登记 gh-proxy.com，其余服务在后续工单加入。
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
];

/** 按地址语法把直链拼成加速地址。 */
export function buildAcceleratedUrl(service: Service, directUrl: string): string {
  if (service.syntax === "prefix") {
    const body = service.stripScheme ? directUrl.replace(/^https?:\/\//, "") : directUrl;
    return `${service.endpoint}/${body}`;
  }

  throw new Error(`尚未实现的地址语法：${service.syntax}`);
}
