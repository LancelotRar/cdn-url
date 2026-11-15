import type { ErrorType, NormalizedTarget } from "./types";

/** 归一化结果：要么是可以构造直链的源，要么是一条拒绝原因。 */
export type Normalized = NormalizedTarget | { kind: "error"; error: ErrorType };

const RAW_HOST = "raw.githubusercontent.com";
const GITHUB_HOSTS = new Set([RAW_HOST, "github.com", "gist.github.com", "gist.githubusercontent.com"]);

function rejected(error: ErrorType): Normalized {
  return { kind: "error", error };
}

/**
 * 把一条源地址归一化成直链或拒绝原因。
 * 工单 01 只支持 raw.githubusercontent.com 的仓库单文件形态。
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

  return rejected("unrecognized");
}

/**
 * `raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}` → 四元组。
 * 带 `refs/heads/` 或 `refs/tags/` 前缀时剥掉前缀，只保留其后的 ref 名。
 */
function normalizeRawFile(url: URL): Normalized {
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 4) {
    return rejected("unrecognized");
  }

  const [owner, repo] = segments;
  let refIndex = 2;
  if (segments[2] === "refs" && (segments[3] === "heads" || segments[3] === "tags")) {
    refIndex = 4;
  }

  const ref = segments[refIndex];
  const path = segments.slice(refIndex + 1).join("/");
  if (ref === undefined || path.length === 0) {
    return rejected("unrecognized");
  }

  return {
    kind: "repo-file",
    owner,
    repo,
    ref,
    path,
    directUrl: `https://${RAW_HOST}/${owner}/${repo}/${ref}/${path}`,
  };
}
