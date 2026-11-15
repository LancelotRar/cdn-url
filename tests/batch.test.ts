import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";
import { SERVICES } from "../src/services";
import type { SourceType } from "../src/types";

const REPO_FILE = "https://github.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs";
const REPO_FILE_RAW =
  "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs";
const OTHER_REPO_FILE = "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md";
const GIST_PAGE = "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a";
const GIST_RAW =
  "https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw";
const RELEASE =
  "https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz";
const ARCHIVE = "https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip";
const TREE = "https://github.com/vernesong/OpenClash/tree/master/core";
const NON_GITHUB = "https://gitlab.com/vernesong/OpenClash/-/raw/master/README.md";

/** 五行混排：仓库单文件、gist、release 资产、归档包、另一仓库单文件。 */
const FIVE_SOURCES = [REPO_FILE, GIST_PAGE, RELEASE, ARCHIVE, OTHER_REPO_FILE];

describe("convert 批量输入", () => {
  it("五行源地址产出五张卡片，顺序与输入一致，各自显示对应源地址", () => {
    const result = convert(FIVE_SOURCES.join("\n"));

    expect(result.cards).toHaveLength(5);
    expect(result.cards.map((card) => card.source)).toEqual(FIVE_SOURCES);
    expect(result.cards.map((card) => card.error)).toEqual([null, null, null, null, null]);
    expect(result.cards.map((card) => card.sourceType)).toEqual([
      "repo-file",
      "gist",
      "release-asset",
      "archive",
      "repo-file",
    ]);
    expect(result.cards.map((card) => card.equivalentTo)).toEqual([null, null, null, null, null]);
    // 行数不由测试写死：每类源的支持服务数取自注册表（默认不含备用入口）。
    const supportingLines = (sourceType: SourceType) =>
      SERVICES.filter(
        (service) => service.fallback !== true && service.capabilities.includes(sourceType),
      ).length;
    expect(result.cards.map((card) => card.lines.length)).toEqual([
      supportingLines("repo-file"),
      supportingLines("gist"),
      supportingLines("release-asset"),
      supportingLines("archive"),
      supportingLines("repo-file"),
    ]);
  });

  it("空行与首尾空白被忽略，不产出卡片也不报错", () => {
    const text = ["", `  ${REPO_FILE}  `, "", "", GIST_PAGE, "   ", RELEASE, ""].join("\n");

    const result = convert(text);

    expect(result.cards.map((card) => card.source)).toEqual([REPO_FILE, GIST_PAGE, RELEASE]);
    expect(result.cards.map((card) => card.error)).toEqual([null, null, null]);
  });

  it.each(FIVE_SOURCES.map((line, index) => ({ line, index })))(
    "第 $index 张卡片的服务行与单独粘贴该条完全一致",
    ({ line, index }) => {
      const batch = convert(FIVE_SOURCES.join("\n"));
      const single = convert(line);

      expect(batch.cards[index].lines).toEqual(single.cards[0].lines);
    },
  );
});

describe("convert 等价标注", () => {
  it("blob 页与 raw 直链各成一张卡，第二张标注等价于第 1 条", () => {
    const result = convert([REPO_FILE, REPO_FILE_RAW].join("\n"));

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].equivalentTo).toBeNull();
    expect(result.cards[1].equivalentTo).toBe(1);
    expect(result.cards[1].lines).toEqual(result.cards[0].lines);
  });

  it.each([
    {
      name: "旧式 /raw/ 地址",
      input: "https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/ad.mrs",
    },
    {
      name: "带 refs/heads/ 前缀的 blob 页",
      input: "https://github.com/MetaCubeX/meta-rules-dat/blob/refs/heads/meta/geo/geoip/ad.mrs",
    },
    {
      name: "带 refs/heads/ 前缀的 raw 直链",
      input: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geoip/ad.mrs",
    },
    {
      name: "带查询串的同一文件",
      input: `${REPO_FILE}?token=abc`,
    },
    {
      name: "主机名大小写不同的同一文件",
      input: "https://GitHub.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs",
    },
  ])("$name 与第 1 条等价", ({ input }) => {
    const result = convert([REPO_FILE, input].join("\n"));

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].equivalentTo).toBeNull();
    expect(result.cards[1].equivalentTo).toBe(1);
  });

  it("gist 页面地址与 gist 直链等价，都落成同一条直链", () => {
    const result = convert([GIST_PAGE, GIST_RAW].join("\n"));

    expect(result.cards).toHaveLength(2);
    expect(result.cards[1].equivalentTo).toBe(1);
    expect(result.cards[1].lines).toEqual(result.cards[0].lines);
  });

  it("相同 release 资产地址重复粘贴时，第二张等价于第 1 条", () => {
    const result = convert([RELEASE, RELEASE].join("\n"));

    expect(result.cards).toHaveLength(2);
    expect(result.cards[1].equivalentTo).toBe(1);
  });

  it("不同文件的卡片互不等价", () => {
    const result = convert([REPO_FILE, OTHER_REPO_FILE].join("\n"));

    expect(result.cards.map((card) => card.equivalentTo)).toEqual([null, null]);
  });

  it("三张同标识的卡片都指向第一次出现的那张，且各自成卡", () => {
    const result = convert([REPO_FILE, REPO_FILE_RAW, `${REPO_FILE}?token=abc`].join("\n"));

    expect(result.cards).toHaveLength(3);
    expect(result.cards.map((card) => card.equivalentTo)).toEqual([null, 1, 1]);
    expect(result.cards[1].lines).toEqual(result.cards[0].lines);
    expect(result.cards[2].lines.map((line) => line.serviceId)).toEqual(
      result.cards[0].lines.map((line) => line.serviceId),
    );
  });
});

describe("convert 拒绝与成功共存", () => {
  it("被拒绝的卡片不影响其他卡片，且不参与等价判定", () => {
    const result = convert([TREE, REPO_FILE, NON_GITHUB, REPO_FILE_RAW].join("\n"));

    expect(result.cards).toHaveLength(4);
    expect(result.cards.map((card) => card.error)).toEqual([
      "tree-directory",
      null,
      "non-github",
      null,
    ]);
    expect(result.cards[0].equivalentTo).toBeNull();
    expect(result.cards[2].equivalentTo).toBeNull();
    expect(result.cards[0].lines).toEqual([]);
    expect(result.cards[2].lines).toEqual([]);
    expect(result.cards[3].equivalentTo).toBe(2);
    expect(result.cards[3].lines).toEqual(result.cards[1].lines);
  });

  it("被拒绝的相同文本各成一张卡，不互相标注等价", () => {
    const result = convert([TREE, TREE].join("\n"));

    expect(result.cards).toHaveLength(2);
    expect(result.cards.map((card) => card.error)).toEqual(["tree-directory", "tree-directory"]);
    expect(result.cards.map((card) => card.equivalentTo)).toEqual([null, null]);
  });
});
