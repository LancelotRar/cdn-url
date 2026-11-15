import type { ErrorType, NormalizedTarget } from "./types";

/** 归一化结果：要么是可以构造加速地址的源，要么是一条拒绝原因。 */
export type Normalized = NormalizedTarget | { kind: "error"; error: ErrorType };

/**
 * 归一化目标的稳定标识，用于等价判定：标识相同即视为同一条源。
 * 仓库单文件用 `{owner, repo, ref, path}` 四元组，gist 用 `{user, gistId}`；
 * 两者都不含查询串，否则同一文件换个 token 就会被误判为不同源。
 * release 资产与归档包没有更简的标识，取其归一化后的原始地址。
 */
export function identityOf(target: NormalizedTarget): string {
  if (target.kind === "repo-file") {
    return `repo-file:${target.owner}/${target.repo}/${target.ref}/${target.path}`;
  }
  if (target.kind === "gist") {
    return `gist:${target.user}/${target.gistId}`;
  }
  return `${target.kind}:${target.directUrl}`;
}

const RAW_HOST = "raw.githubusercontent.com";
const GIST_HOST = "gist.github.com";
const GIST_RAW_HOST = "gist.githubusercontent.com";
const GITHUB_HOSTS = new Set([RAW_HOST, "github.com", GIST_HOST, GIST_RAW_HOST]);

function rejected(error: ErrorType): Normalized {
  return { kind: "error", error };
}

/** 路径段：丢掉空段，容忍尾斜杠。 */
function segmentsOf(url: URL): string[] {
  return url.pathname.split("/").filter((segment) => segment.length > 0);
}

/**
 * 取路径的前 `count` 段。段数不足时返回 null，调用方统一按 unrecognized 拒绝，
 * 这样各处只需判断一次 null，而不是逐段比较 undefined。
 */
function leadingSegments(segments: readonly string[], count: number): string[] | null {
  return segments.length < count ? null : segments.slice(0, count);
}

/**
 * 清洗查询串：丢弃 `?raw=true`，其余查询串按原样保留（含 `?`）。
 */
function cleanQuery(url: URL): string {
  const pairs = url.search.replace(/^\?/, "").split("&");
  const kept = pairs.filter((pair) => pair.length > 0 && pair.toLowerCase() !== "raw=true");
  return kept.length === 0 ? "" : `?${kept.join("&")}`;
}

/**
 * 把一条源地址归一化成直链或拒绝原因。
 * 拒绝判定顺序是硬约束：`api.github.com`、`codeload.github.com` 先于「非 GitHub 域名」。
 */
export function normalize(source: string): Normalized {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return rejected("unrecognized");
  }

  const host = url.hostname.toLowerCase();
  if (host === "api.github.com") {
    return rejected("api-host");
  }
  if (host === "codeload.github.com") {
    return rejected("codeload-host");
  }
  if (!GITHUB_HOSTS.has(host)) {
    return rejected("non-github");
  }

  if (host === RAW_HOST) {
    return normalizeRawFile(url);
  }
  if (host === GIST_RAW_HOST) {
    return normalizeGistRaw(url);
  }
  if (host === GIST_HOST) {
    return normalizeGistPage(url);
  }

  return normalizeGitHubPage(url);
}

/**
 * `raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}` → 四元组。
 * 带 `refs/heads/` 或 `refs/tags/` 前缀时剥掉前缀，只保留其后的 ref 名。
 */
function normalizeRawFile(url: URL): Normalized {
  const segments = segmentsOf(url);
  const head = leadingSegments(segments, 4);
  if (head === null) {
    return rejected("unrecognized");
  }

  const [owner, repo] = head;
  return repoFileTarget(owner, repo, segments.slice(2), url);
}

/**
 * 由 `{owner, repo}` 与其后的路径段构造仓库单文件目标。
 * 剩余的路径段里，开头可能是 ref，也可能先是 `refs/heads/` 或 `refs/tags/`。
 */
function repoFileTarget(
  owner: string,
  repo: string,
  rest: string[],
  url: URL,
): Normalized {
  let refIndex = 0;
  if (rest[0] === "refs" && (rest[1] === "heads" || rest[1] === "tags")) {
    refIndex = 2;
  }

  const ref = rest[refIndex];
  const path = rest.slice(refIndex + 1).join("/");
  if (ref === undefined || path.length === 0) {
    return rejected("unrecognized");
  }

  const query = cleanQuery(url);
  return {
    kind: "repo-file",
    owner,
    repo,
    ref,
    path,
    directUrl: `https://${RAW_HOST}/${owner}/${repo}/${ref}/${path}${query}`,
    query,
  };
}

/**
 * `github.com/...` 的浏览页地址。
 * `blob`、旧式 `/raw/` 归化成仓库单文件；release 资产与归档包透传原地址；
 * `tree` 目录页、仓库首页与无法识别的形状各给一条独立拒绝原因。
 */
function normalizeGitHubPage(url: URL): Normalized {
  const segments = segmentsOf(url);
  const head = leadingSegments(segments, 2);
  if (head === null) {
    return rejected("unrecognized");
  }

  const [owner, repo] = head;
  const kind = segments[2];

  if (segments.length === 2) {
    return rejected("repo-home");
  }

  if (kind === "tree") {
    return rejected("tree-directory");
  }

  if (kind === "blob" || kind === "raw") {
    return repoFileTarget(owner, repo, segments.slice(3), url);
  }

  if (kind === "releases" && segments[3] === "download") {
    const tag = segments[4];
    const file = segments.slice(5).join("/");
    if (tag === undefined || file.length === 0) {
      return rejected("unrecognized");
    }
    return passthroughTarget("release-asset", segments, url);
  }

  if (kind === "archive" && segments[3] === "refs") {
    const refKind = segments[4];
    const fileName = segments.slice(5).join("/");
    if ((refKind !== "heads" && refKind !== "tags") || !fileName.endsWith(".zip")) {
      return rejected("unrecognized");
    }
    return passthroughTarget("archive", segments, url);
  }

  return rejected("unrecognized");
}

/** release 资产与归档包：只清洗查询串，路径按原样透传。 */
function passthroughTarget(
  kind: "release-asset" | "archive",
  segments: string[],
  url: URL,
): Normalized {
  return {
    kind,
    directUrl: `https://github.com/${segments.join("/")}${cleanQuery(url)}`,
  };
}

/**
 * `gist.githubusercontent.com/{user}/{id}/raw[/{revision}[/{file}]]` → gist 标识。
 * 一律落成不带文件名的 `/raw`：不反推锚点、不枚举文件、不调 GitHub API。
 */
function normalizeGistRaw(url: URL): Normalized {
  const head = leadingSegments(segmentsOf(url), 3);
  if (head === null) {
    return rejected("unrecognized");
  }

  const [user, gistId, raw] = head;
  if (raw !== "raw") {
    return rejected("unrecognized");
  }

  return gistTarget(user, gistId, url);
}

/**
 * `gist.github.com/{user}/{id}` → gist 标识。fragment（文件锚点）直接丢弃。
 */
function normalizeGistPage(url: URL): Normalized {
  const segments = segmentsOf(url);
  const head = leadingSegments(segments, 2);
  if (head === null || segments.length !== 2) {
    return rejected("unrecognized");
  }

  const [user, gistId] = head;
  return gistTarget(user, gistId, url);
}

function gistTarget(user: string, gistId: string, url: URL): Normalized {
  const query = cleanQuery(url);
  return {
    kind: "gist",
    user,
    gistId,
    directUrl: `https://${GIST_RAW_HOST}/${user}/${gistId}/raw${query}`,
  };
}
