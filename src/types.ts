/** 源类型：归一化后源地址所属的类别。 */
export type SourceType = "repo-file" | "gist" | "release-asset" | "archive";

/** 拒绝类型：源地址无法被处理时给出的独立原因。 */
export type ErrorType =
  | "tree-directory"
  | "api-host"
  | "codeload-host"
  | "repo-home"
  | "non-github"
  | "unrecognized";

/** 地址语法：加速服务构造加速地址的方式。 */
export type UrlSyntax = "rearrange" | "prefix";

/** 仓库单文件的归一化目标：四元组与由它重建的直链。 */
export interface RepoFileTarget {
  kind: "repo-file";
  owner: string;
  repo: string;
  ref: string;
  path: string;
  /** 归一化后重建的 raw.githubusercontent.com 直链。 */
  directUrl: string;
  /** 保留的查询串（含 `?`；没有则为空串）。路径重排与直链共用同一查询串。 */
  query: string;
}

/** gist 的归一化目标：只有页面地址或 raw 直链，落成不带文件名的 raw 直链。 */
export interface GistTarget {
  kind: "gist";
  user: string;
  gistId: string;
  /** 归一化后重建的 gist.githubusercontent.com 直链。 */
  directUrl: string;
}

/** release 资产与归档包没有直链形态，以清洗后的原地址透传。 */
export interface PassthroughTarget {
  kind: "release-asset" | "archive";
  directUrl: string;
}

/** 归一化目标：两种地址语法共用的入参。 */
export type NormalizedTarget = RepoFileTarget | GistTarget | PassthroughTarget;

/** 服务注册表里的一条记录。新增服务只加数据。 */
export interface Service {
  id: string;
  name: string;
  endpoint: string;
  syntax: UrlSyntax;
  /** 前缀拼接时是否去掉直链的协议前缀。 */
  stripScheme: boolean;
  capabilities: readonly SourceType[];
}

/** 一张卡片里的一行加速地址。 */
export interface ServiceLine {
  serviceId: string;
  serviceName: string;
  url: string;
  capabilities: readonly SourceType[];
}

/** 一条源地址对应的卡片。 */
export interface Card {
  /** 归一化后的源地址行（已去掉首尾空白）。 */
  source: string;
  sourceType: SourceType | null;
  error: ErrorType | null;
  /** 与第几条卡片等价（1 起算）；没有等价源时为 null。 */
  equivalentTo: number | null;
  /** 结果附注，例如 gist 只取第一个文件的提示。 */
  note: string | null;
  lines: ServiceLine[];
}

/** `convert` 的输出：界面渲染所需的全部内容。 */
export interface ConversionResult {
  cards: Card[];
}
