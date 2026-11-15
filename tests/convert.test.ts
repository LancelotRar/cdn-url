import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";

interface RepoFileCase {
  name: string;
  input: string;
  expectedUrls: [string, string, string];
}

const repoFileCases: RepoFileCase[] = [
  {
    name: "TypeScript 仓库 main 分支的 README",
    input: "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
    expectedUrls: [
      "https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://cdn.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
      "https://cdn.jsdmirror.cn/gh/microsoft/TypeScript@main/README.md",
    ],
  },
  {
    name: "OpenClash 仓库多级路径的归档文件",
    input:
      "https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
    expectedUrls: [
      "https://gh-proxy.com/raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
      "https://cdn.jsdelivr.net/gh/vernesong/OpenClash@master/core/dev/clash-linux-amd64.tar.gz",
      "https://cdn.jsdmirror.cn/gh/vernesong/OpenClash@master/core/dev/clash-linux-amd64.tar.gz",
    ],
  },
  {
    name: "带 refs/heads/ 前缀的 raw 地址剥掉前缀后保留分支名",
    input:
      "https://raw.githubusercontent.com/microsoft/TypeScript/refs/heads/main/src/compiler/core.ts",
    expectedUrls: [
      "https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
      "https://cdn.jsdelivr.net/gh/microsoft/TypeScript@main/src/compiler/core.ts",
      "https://cdn.jsdmirror.cn/gh/microsoft/TypeScript@main/src/compiler/core.ts",
    ],
  },
  {
    name: "带 refs/tags/ 前缀的 raw 地址剥掉前缀后保留标签名",
    input:
      "https://raw.githubusercontent.com/vernesong/OpenClash/refs/tags/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
    expectedUrls: [
      "https://gh-proxy.com/raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://cdn.jsdelivr.net/gh/vernesong/OpenClash@v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://cdn.jsdmirror.cn/gh/vernesong/OpenClash@v0.46.003/core/dev/clash-linux-amd64.tar.gz",
    ],
  },
];

describe("convert 仓库单文件源地址", () => {
  it.each(repoFileCases)(
    "$name 产出一张卡片、三行加速地址",
    ({ input, expectedUrls }) => {
      const result = convert(input);

      expect(result.cards).toHaveLength(1);

      const card = result.cards[0];
      expect(card.source).toBe(input);
      expect(card.sourceType).toBe("repo-file");
      expect(card.error).toBeNull();
      expect(card.lines.map((line) => line.serviceName)).toEqual([
        "gh-proxy.com",
        "cdn.jsdelivr.net",
        "cdn.jsdmirror.cn",
      ]);
      expect(card.lines.map((line) => line.url)).toEqual(expectedUrls);
    },
  );
});

describe("convert 路径重排式地址", () => {
  it("显式带上 @ref，两条地址只有主机名不同", () => {
    const result = convert(
      "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
    );

    const [, jsdelivr, jsdmirror] = result.cards[0].lines;
    expect(jsdelivr.url).toBe(
      "https://cdn.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
    );
    expect(jsdmirror.url).toBe(
      "https://cdn.jsdmirror.cn/gh/microsoft/TypeScript@main/README.md",
    );
    expect(jsdelivr.url).toContain("@main");
    expect(jsdelivr.url.slice("https://cdn.jsdelivr.net".length)).toBe(
      jsdmirror.url.slice("https://cdn.jsdmirror.cn".length),
    );
  });
});

describe("convert 空输入", () => {
  it.each([
    { name: "空字符串", input: "" },
    { name: "只有空白与空行", input: "  \n\n\t\n" },
  ])("$name 不产出卡片也不报错", ({ input }) => {
    const result = convert(input);

    expect(result.cards).toHaveLength(0);
  });
});
