import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";

const INPUT = "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md";

/** 开关关闭时仓库单文件应出现的加速服务（不含 jsDelivr 备用入口）。 */
const PRIMARY_SERVICES = ["gh-proxy.com", "cdn.jsdelivr.net", "cdn.jsdmirror.cn"];

const PRIMARY_URLS = [
  "https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
  "https://cdn.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
  "https://cdn.jsdmirror.cn/gh/microsoft/TypeScript@main/README.md",
];

/** 开关打开时追加的三个 jsDelivr 官方备用入口。 */
const FALLBACK_SERVICES = ["fastly.jsdelivr.net", "gcore.jsdelivr.net", "testingcf.jsdelivr.net"];

const FALLBACK_URLS = [
  "https://fastly.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
  "https://gcore.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
  "https://testingcf.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
];

describe("convert 的 jsDelivr 备用入口开关", () => {
  it("默认关闭：结果里只有主入口，没有任何备用入口", () => {
    const card = convert(INPUT).cards[0];

    expect(card.lines.map((line) => line.serviceName)).toEqual(PRIMARY_SERVICES);
    expect(card.lines.map((line) => line.url)).toEqual(PRIMARY_URLS);
  });

  it("显式传 false 与不传等价：备用入口不参与生成", () => {
    const card = convert(INPUT, { jsdelivrFallbacks: false }).cards[0];

    expect(card.lines.map((line) => line.serviceName)).toEqual(PRIMARY_SERVICES);
    expect(card.lines.map((line) => line.url)).toEqual(PRIMARY_URLS);
  });

  it("显式传 true：多出 3 行，服务集合与完整地址都符合预期", () => {
    const card = convert(INPUT, { jsdelivrFallbacks: true }).cards[0];

    expect(card.lines.map((line) => line.serviceName)).toEqual([
      ...PRIMARY_SERVICES,
      ...FALLBACK_SERVICES,
    ]);
    expect(card.lines.map((line) => line.url)).toEqual([...PRIMARY_URLS, ...FALLBACK_URLS]);
  });

  it("备用入口的路径与主入口完全一致，只有主机名不同", () => {
    const card = convert(INPUT, { jsdelivrFallbacks: true }).cards[0];
    const primaryPath = PRIMARY_URLS[1].slice("https://cdn.jsdelivr.net".length);

    expect(primaryPath).toBe("/gh/microsoft/TypeScript@main/README.md");

    for (const host of FALLBACK_SERVICES) {
      const line = card.lines.find((candidate) => candidate.serviceName === host);
      expect(line).toBeDefined();
      expect(line!.url).toBe(`https://${host}${primaryPath}`);
    }
  });
});
