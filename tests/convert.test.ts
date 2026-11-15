import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";

interface RepoFileCase {
  name: string;
  input: string;
  expectedUrl: string;
}

const repoFileCases: RepoFileCase[] = [
  {
    name: "TypeScript 仓库 main 分支的 README",
    input: "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
    expectedUrl:
      "https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
  },
  {
    name: "OpenClash 仓库多级路径的归档文件",
    input:
      "https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
    expectedUrl:
      "https://gh-proxy.com/raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
  },
];

describe("convert 仓库单文件源地址", () => {
  it.each(repoFileCases)("$name 产出一张卡片、一行加速地址", ({ input, expectedUrl }) => {
    const result = convert(input);

    expect(result.cards).toHaveLength(1);

    const card = result.cards[0];
    expect(card.source).toBe(input);
    expect(card.sourceType).toBe("repo-file");
    expect(card.error).toBeNull();
    expect(card.lines).toHaveLength(1);
    expect(card.lines[0].serviceName).toBe("gh-proxy.com");
    expect(card.lines[0].url).toBe(expectedUrl);
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
