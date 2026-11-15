import { describe, expect, it } from "vitest";

import { convert } from "../src/convert";
import { SERVICES } from "../src/services";
import type { SourceType } from "../src/types";

interface RepoFileCase {
  name: string;
  input: string;
  expectedUrls: string[];
}

const repoFileCases: RepoFileCase[] = [
  {
    name: "TypeScript 仓库 main 分支的 README",
    input: "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
    expectedUrls: [
      "https://gh-proxy.com/raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://cdn.jsdelivr.net/gh/microsoft/TypeScript@main/README.md",
      "https://cdn.jsdmirror.cn/gh/microsoft/TypeScript@main/README.md",
      "https://ghproxy.net/https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://ghfast.top/https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://ghproxy.icu/https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://fastgit.cc/https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
      "https://github.chenc.dev/raw.githubusercontent.com/microsoft/TypeScript/main/README.md",
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
      "https://ghproxy.net/https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
      "https://ghfast.top/https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
      "https://ghproxy.icu/https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
      "https://fastgit.cc/https://raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
      "https://github.chenc.dev/raw.githubusercontent.com/vernesong/OpenClash/master/core/dev/clash-linux-amd64.tar.gz",
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
      "https://ghproxy.net/https://raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
      "https://ghfast.top/https://raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
      "https://ghproxy.icu/https://raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
      "https://fastgit.cc/https://raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
      "https://github.chenc.dev/raw.githubusercontent.com/microsoft/TypeScript/main/src/compiler/core.ts",
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
      "https://ghproxy.net/https://raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://ghfast.top/https://raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://ghproxy.icu/https://raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://fastgit.cc/https://raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
      "https://github.chenc.dev/raw.githubusercontent.com/vernesong/OpenClash/v0.46.003/core/dev/clash-linux-amd64.tar.gz",
    ],
  },
];

describe("convert 仓库单文件源地址", () => {
  it.each(repoFileCases)(
    "$name 产出一张卡片，服务顺序与逐行加速地址符合预期",
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
        "ghproxy.net",
        "ghfast.top",
        "ghproxy.icu",
        "fastgit.cc",
        "github.chenc.dev",
      ]);
      expect(card.lines.map((line) => line.url)).toEqual(expectedUrls);
    },
  );
});

describe("convert gist 直链", () => {
  const gistRaw =
    "https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw";

  const expectedUrls = [
    "https://gh-proxy.com/gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw",
    "https://ghproxy.net/https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw",
    "https://ghfast.top/https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw",
    "https://ghproxy.icu/https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw",
    "https://fastgit.cc/https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw",
  ];

  it.each([
    {
      name: "gist 页面地址",
      input: "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a",
    },
    {
      name: "带文件锚点的 gist 页面地址",
      input:
        "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a#file-53489_qctld-md",
    },
  ])("$name 落成 gist 直链并产出五行加速地址", ({ input }) => {
    const result = convert(input);

    expect(result.cards).toHaveLength(1);
    const card = result.cards[0];
    expect(card.sourceType).toBe("gist");
    expect(card.error).toBeNull();
    expect(card.note).toBe("仅适用于单文件 gist");
    expect(card.lines.map((line) => line.serviceName)).toEqual([
      "gh-proxy.com",
      "ghproxy.net",
      "ghfast.top",
      "ghproxy.icu",
      "fastgit.cc",
    ]);
    expect(card.lines.map((line) => line.url)).toEqual(expectedUrls);
    expect(card.lines.map((line) => line.serviceName)).not.toContain("github.chenc.dev");
  });

  it.each([
    {
      name: "带文件名的 gist raw 直链",
      input:
        "https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw/53489_qctld.md",
    },
    {
      name: "不带文件名的 gist raw 直链",
      input: gistRaw,
    },
  ])("$name 与 gist 页面地址产出完全相同的结果", ({ input }) => {
    const page = convert(
      "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a",
    ).cards[0];
    const raw = convert(input).cards[0];

    expect(raw.sourceType).toBe("gist");
    expect(raw.note).toBe("仅适用于单文件 gist");
    expect(raw.lines).toEqual(page.lines);
    expect(raw.lines.map((line) => line.url)).toEqual(expectedUrls);
  });
});

describe("convert release 资产与归档包", () => {
  const cases = [
    {
      name: "release 资产",
      input:
        "https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
      sourceType: "release-asset",
      expectedUrls: [
        "https://gh-proxy.com/github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://ghproxy.net/https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://ghfast.top/https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://ghproxy.icu/https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://fastgit.cc/https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://github.chenc.dev/github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
      ],
    },
    {
      name: "归档包",
      input: "https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
      sourceType: "archive",
      expectedUrls: [
        "https://gh-proxy.com/github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
        "https://ghproxy.net/https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
        "https://ghfast.top/https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
        "https://ghproxy.icu/https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
        "https://fastgit.cc/https://github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
        "https://github.chenc.dev/github.com/vernesong/OpenClash/archive/refs/heads/master.zip",
      ],
    },
  ];

  it.each(cases)("$name 只产出六个前缀拼接式地址", ({ input, sourceType, expectedUrls }) => {
    const result = convert(input);

    expect(result.cards).toHaveLength(1);
    const card = result.cards[0];
    expect(card.sourceType).toBe(sourceType);
    expect(card.error).toBeNull();
    expect(card.note).toBeNull();
    expect(card.lines.map((line) => line.serviceName)).toEqual([
      "gh-proxy.com",
      "ghproxy.net",
      "ghfast.top",
      "ghproxy.icu",
      "fastgit.cc",
      "github.chenc.dev",
    ]);
    expect(card.lines.map((line) => line.url)).toEqual(expectedUrls);
  });

  it.each(cases)("$name 的地址原样透传，不被重排成 gh/ 路径", ({ input }) => {
    const card = convert(input).cards[0];

    for (const line of card.lines) {
      expect(line.url).not.toContain("/gh/");
      expect(line.serviceName).not.toBe("cdn.jsdelivr.net");
      expect(line.serviceName).not.toBe("cdn.jsdmirror.cn");
    }
  });
});

describe("convert 拒绝的输入", () => {
  const cases: { name: string; input: string; error: string }[] = [
    {
      name: "tree 目录页",
      input: "https://github.com/vernesong/OpenClash/tree/master/core",
      error: "tree-directory",
    },
    {
      name: "api.github.com",
      input: "https://api.github.com/repos/vernesong/OpenClash/contents/core",
      error: "api-host",
    },
    {
      name: "codeload.github.com",
      input: "https://codeload.github.com/vernesong/OpenClash/zip/refs/heads/master",
      error: "codeload-host",
    },
    {
      name: "仓库首页",
      input: "https://github.com/vernesong/OpenClash",
      error: "repo-home",
    },
    {
      name: "带尾斜杠的仓库首页",
      input: "https://github.com/vernesong/OpenClash/",
      error: "repo-home",
    },
    {
      name: "非 GitHub 域名",
      input: "https://gitlab.com/vernesong/OpenClash/-/raw/master/README.md",
      error: "non-github",
    },
    {
      name: "无法识别的路径形状",
      input: "https://github.com/vernesong/OpenClash/issues/1",
      error: "unrecognized",
    },
  ];

  it.each(cases)("$name 被拒绝，原因是 $error", ({ input, error }) => {
    const result = convert(input);

    expect(result.cards).toHaveLength(1);
    const card = result.cards[0];
    expect(card.error).toBe(error);
    expect(card.sourceType).toBeNull();
    expect(card.lines).toEqual([]);
  });
});

describe("convert 仓库单文件的等价写法", () => {
  const expectedUrls = [
    "https://gh-proxy.com/raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/ad.mrs",
    "https://cdn.jsdmirror.cn/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/ad.mrs",
    "https://ghproxy.net/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    "https://ghfast.top/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    "https://ghproxy.icu/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    "https://fastgit.cc/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    "https://github.chenc.dev/raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
  ];

  it.each([
    {
      name: "blob 浏览页",
      input: "https://github.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs",
    },
    {
      name: "旧式 /raw/ 地址",
      input: "https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/ad.mrs",
    },
    {
      name: "带 refs/heads/ 前缀的 blob 页",
      input:
        "https://github.com/MetaCubeX/meta-rules-dat/blob/refs/heads/meta/geo/geoip/ad.mrs",
    },
  ])("$name 与 raw 直链产出相同结果", ({ input }) => {
    const card = convert(input).cards[0];

    expect(card.sourceType).toBe("repo-file");
    expect(card.error).toBeNull();
    expect(card.lines.map((line) => line.url)).toEqual(expectedUrls);
  });
});

describe("convert 清洗规则", () => {
  const base = "https://github.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs";

  it("丢弃 ?raw=true", () => {
    const card = convert(`${base}?raw=true`).cards[0];

    expect(card.lines[0].url).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    );
    expect(card.lines[1].url).toBe(
      "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/ad.mrs",
    );
    for (const line of card.lines) {
      expect(line.url).not.toContain("raw=true");
    }
  });

  it("其余查询串原样保留在直链与路径重排地址上", () => {
    const card = convert(`${base}?token=abc&x=1`).cards[0];

    expect(card.lines[0].url).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs?token=abc&x=1",
    );
    expect(card.lines[1].url).toBe(
      "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/ad.mrs?token=abc&x=1",
    );
  });

  it("丢弃 fragment", () => {
    const card = convert(`${base}#L10`).cards[0];

    expect(card.lines[0].url).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ad.mrs",
    );
    for (const line of card.lines) {
      expect(line.url).not.toContain("#");
    }
  });

  it("主机名大小写不敏感", () => {
    const upper = convert(
      "https://GitHub.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs",
    ).cards[0];
    const lower = convert(
      "https://github.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs",
    ).cards[0];

    expect(upper.sourceType).toBe("repo-file");
    expect(upper.error).toBeNull();
    expect(upper.lines).toEqual(lower.lines);
  });
});

describe("convert 同一文本混排多类源", () => {
  it("空行被忽略，拒绝的卡片不影响其他卡片", () => {
    const result = convert(
      [
        "https://github.com/MetaCubeX/meta-rules-dat/blob/meta/geo/geoip/ad.mrs",
        "",
        "https://gist.github.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a",
        "https://github.com/vernesong/OpenClash/releases/download/v0.46.003/clash-linux-amd64.tar.gz",
        "https://github.com/vernesong/OpenClash/archive/refs/tags/v0.46.003.zip",
        "https://github.com/vernesong/OpenClash/tree/master/core",
        "https://gitlab.com/vernesong/OpenClash/-/raw/master/README.md",
      ].join("\n"),
    );

    expect(result.cards.map((card) => card.sourceType)).toEqual([
      "repo-file",
      "gist",
      "release-asset",
      "archive",
      null,
      null,
    ]);
    expect(result.cards.map((card) => card.error)).toEqual([
      null,
      null,
      null,
      null,
      "tree-directory",
      "non-github",
    ]);
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
      0,
      0,
    ]);
  });
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
