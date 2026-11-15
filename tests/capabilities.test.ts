import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";
import type { SourceType } from "../src/types";

const REPO_FILE = "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md";
const GIST = "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a";
const RELEASE_ASSET =
  "https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz";
const ARCHIVE = "https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip";

const ALL_CAPABILITIES: SourceType[] = [
  "repo-file",
  "gist",
  "release-asset",
  "archive",
];

/** spec 的 Implementation Decisions 表格：8 个主服务及其能力集合。 */
const EXPECTED_CATALOG: { name: string; capabilities: SourceType[] }[] = [
  { name: "gh-proxy.com", capabilities: ALL_CAPABILITIES },
  { name: "cdn.jsdelivr.net", capabilities: ["repo-file"] },
  { name: "cdn.jsdmirror.cn", capabilities: ["repo-file"] },
  { name: "ghproxy.net", capabilities: ALL_CAPABILITIES },
  { name: "ghfast.top", capabilities: ALL_CAPABILITIES },
  { name: "ghproxy.icu", capabilities: ALL_CAPABILITIES },
  { name: "fastgit.cc", capabilities: ALL_CAPABILITIES },
  { name: "github.chenc.dev", capabilities: ["repo-file", "release-asset", "archive"] },
];

const FALLBACK_NAMES = ["fastly.jsdelivr.net", "gcore.jsdelivr.net", "testingcf.jsdelivr.net"];

describe("convert 返回的服务目录", () => {
  it("恰好 8 条主服务，顺序与注册表一致", () => {
    const { catalog } = convert(REPO_FILE);

    expect(catalog.services.map((entry) => entry.serviceName)).toEqual(
      EXPECTED_CATALOG.map((entry) => entry.name),
    );
  });

  it("目录里没有任何 jsDelivr 备用入口", () => {
    const { catalog } = convert(REPO_FILE);

    for (const fallback of FALLBACK_NAMES) {
      expect(catalog.services.map((entry) => entry.serviceName)).not.toContain(fallback);
    }
  });

  it("矩阵列顺序是四类源类型，与 spec 一致", () => {
    const { catalog } = convert(REPO_FILE);

    expect(catalog.sourceTypes).toEqual([
      "repo-file",
      "gist",
      "release-asset",
      "archive",
    ]);
  });

  it.each(EXPECTED_CATALOG)("$name 的能力集合与 spec 表格一致", ({ name, capabilities }) => {
    const { catalog } = convert(REPO_FILE);
    const entry = catalog.services.find((candidate) => candidate.serviceName === name);

    expect(entry).toBeDefined();
    expect(entry!.capabilities).toEqual(capabilities);
  });

  it("打开备用入口开关后目录不变：矩阵只列 8 个主服务", () => {
    const off = convert(REPO_FILE);
    const on = convert(REPO_FILE, { jsdelivrFallbacks: true });

    expect(on.catalog).toEqual(off.catalog);
  });

  it("空输入也给出完整目录：矩阵不依赖输入内容", () => {
    const { catalog } = convert("");

    expect(catalog.services).toHaveLength(8);
    expect(catalog.sourceTypes).toEqual([
      "repo-file",
      "gist",
      "release-asset",
      "archive",
    ]);
  });
});

describe("结果行的能力标签数据", () => {
  const typeCases: { name: string; input: string; sourceType: SourceType }[] = [
    { name: "仓库单文件", input: REPO_FILE, sourceType: "repo-file" },
    { name: "gist 直链", input: GIST, sourceType: "gist" },
    { name: "release 资产", input: RELEASE_ASSET, sourceType: "release-asset" },
    { name: "归档包", input: ARCHIVE, sourceType: "archive" },
  ];

  it.each(typeCases)("$name 卡片每行的能力与目录条目逐字一致", ({ input }) => {
    const result = convert(input);

    for (const line of result.cards[0].lines) {
      const entry = result.catalog.services.find(
        (candidate) => candidate.serviceId === line.serviceId,
      );
      expect(entry).toBeDefined();
      expect(line.capabilities).toEqual(entry!.capabilities);
    }
  });

  it("github.chenc.dev 的行上不含 gist 能力", () => {
    const card = convert(REPO_FILE).cards[0];
    const chenc = card.lines.find((line) => line.serviceName === "github.chenc.dev");

    expect(chenc).toBeDefined();
    expect(chenc!.capabilities).not.toContain("gist");
    expect(chenc!.capabilities).toEqual(["repo-file", "release-asset", "archive"]);
  });

  it.each(typeCases)(
    "$name 卡片只出现目录里声称支持该源类型的服务，矩阵与生成地址同源",
    ({ input, sourceType }) => {
      const result = convert(input);
      const appearing = result.cards[0].lines.map((line) => line.serviceName);
      const supporting = result.catalog.services
        .filter((entry) => entry.capabilities.includes(sourceType))
        .map((entry) => entry.serviceName);

      expect(appearing).toEqual(supporting);
    },
  );

  it.each(typeCases)("$name 卡片每行都声明自己支持当前源类型", ({ input, sourceType }) => {
    const card = convert(input).cards[0];

    expect(card.sourceType).toBe(sourceType);
    for (const line of card.lines) {
      expect(line.capabilities).toContain(sourceType);
    }
  });
});
