import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";
import { SERVICES } from "../src/services";
import type { SourceType } from "../src/types";

const REPO_FILE = "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md";
const GIST = "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a";
const RELEASE_ASSET =
  "https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz";
const ARCHIVE = "https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip";

/** 矩阵列顺序是 spec 固定的四类源类型，不随注册表增长变化。 */
const SOURCE_TYPES: SourceType[] = ["repo-file", "gist", "release-asset", "archive"];

/** 主服务就是注册表里非备用入口的条目：目录应恰好是这一份，不另立名单。 */
const PRIMARY_SERVICES = SERVICES.filter((service) => service.fallback !== true);
const FALLBACK_SERVICES = SERVICES.filter((service) => service.fallback === true);

/** 路径重排式服务的标识，用来验证「只能承载仓库单文件」这条语法约束。 */
const REARRANGE_SERVICE_IDS = PRIMARY_SERVICES.filter(
  (service) => service.syntax === "rearrange",
).map((service) => service.id);

describe("convert 返回的服务目录", () => {
  it("恰好是注册表里的主服务，顺序与注册表一致", () => {
    const { catalog } = convert(REPO_FILE);

    expect(catalog.services.map((entry) => entry.serviceId)).toEqual(
      PRIMARY_SERVICES.map((service) => service.id),
    );
    expect(catalog.services.map((entry) => entry.serviceName)).toEqual(
      PRIMARY_SERVICES.map((service) => service.name),
    );
  });

  it("目录里没有任何 jsDelivr 备用入口", () => {
    const { catalog } = convert(REPO_FILE);
    const serviceIds = catalog.services.map((entry) => entry.serviceId);

    for (const fallback of FALLBACK_SERVICES) {
      expect(serviceIds).not.toContain(fallback.id);
      expect(catalog.services.map((entry) => entry.serviceName)).not.toContain(fallback.name);
    }
  });

  it("矩阵列顺序是四类源类型", () => {
    const { catalog } = convert(REPO_FILE);

    expect(catalog.sourceTypes).toEqual(SOURCE_TYPES);
  });

  it("路径重排式服务（jsDelivr 家族）只支持仓库单文件", () => {
    const { catalog } = convert(REPO_FILE);
    const rearrangeEntries = catalog.services.filter((entry) =>
      REARRANGE_SERVICE_IDS.includes(entry.serviceId),
    );

    expect(rearrangeEntries.map((entry) => entry.serviceId)).toEqual(REARRANGE_SERVICE_IDS);
    for (const entry of rearrangeEntries) {
      expect(entry.capabilities).toEqual(["repo-file"]);
    }
  });

  it("github.chenc.dev 的能力不含 gist，但仍支持其余三类", () => {
    const { catalog } = convert(REPO_FILE);
    const entry = catalog.services.find(
      (candidate) => candidate.serviceName === "github.chenc.dev",
    );

    expect(entry).toBeDefined();
    expect(entry!.capabilities).not.toContain("gist");
    expect(entry!.capabilities).toEqual(["repo-file", "release-asset", "archive"]);
  });

  it("打开备用入口开关后目录不变：矩阵只列主服务", () => {
    const off = convert(REPO_FILE);
    const on = convert(REPO_FILE, { jsdelivrFallbacks: true });

    expect(on.catalog).toEqual(off.catalog);
  });

  it("空输入也给出完整目录：矩阵不依赖输入内容", () => {
    const { catalog } = convert("");

    expect(catalog.services.map((entry) => entry.serviceId)).toEqual(
      PRIMARY_SERVICES.map((service) => service.id),
    );
    expect(catalog.sourceTypes).toEqual(SOURCE_TYPES);
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
    "$name 卡片出现的 serviceId 集合 === 目录中声称支持该类的 serviceId 集合",
    ({ input, sourceType }) => {
      const result = convert(input);
      const appearing = result.cards[0].lines.map((line) => line.serviceId);
      const supporting = result.catalog.services
        .filter((entry) => entry.capabilities.includes(sourceType))
        .map((entry) => entry.serviceId);

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
