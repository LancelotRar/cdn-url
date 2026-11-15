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
  /** 备用入口：只有对应开关打开时才参与生成，默认不列出。 */
  fallback?: boolean;
  /** 备用入口归属的主服务 id；主服务本身没有这个字段。 */
  fallbackOf?: string;
}

/** `convert` 的可选开关，全部默认关闭。 */
export interface ConvertOptions {
  /** 是否让 jsDelivr 家族额外产出 fastly、gcore、testingcf 三个官方备用入口。 */
  jsdelivrFallbacks?: boolean;
}

/** 一条源地址在某个加速服务下的那一行。 */
export interface ResultRow {
  /** 非空输入行的序号（1 起算）；空行不占号。 */
  line: number;
  /** 源地址原文（已去掉首尾空白）。 */
  source: string;
  /**
   * 行首短标识：仓库单文件 `owner/repo@ref/path`、gist `gist @user/id`、
   * release 资产 `tag/file`、归档包 `repo@ref.zip`。
   */
  label: string;
  /** 加速地址。 */
  url: string;
  /** 结果附注，例如 gist 只取第一个文件的提示。 */
  note: string | null;
  /** 与第几条输入行等价（1 起算）；首次出现时为 null。 */
  equivalentTo: number | null;
}

/**
 * 服务分组下的一个主机入口：主入口或备用入口。
 * 同组各入口只有主机名不同，因此行的地址语法一致。
 */
export interface ServiceVariant {
  serviceId: string;
  serviceName: string;
  endpoint: string;
  isFallback: boolean;
  rows: ResultRow[];
}

/**
 * 服务分组：以加速服务为主轴的一块，组内所有加速地址属于同一地址语法。
 * 主入口排在 `variants` 第一位，备用入口开关关闭时只剩主入口。
 */
export interface ServiceGroup {
  serviceId: string;
  serviceName: string;
  capabilities: readonly SourceType[];
  variants: ServiceVariant[];
}

/** 无法处理的源地址：只出现在「无法处理」区，不参与任何分组。 */
export interface Rejection {
  /** 非空输入行的序号（1 起算）。 */
  line: number;
  source: string;
  error: ErrorType;
}

/** 结果摘要的三个计数。 */
export interface ConversionSummary {
  /** 非空输入行数（含被拒绝的源）。 */
  sourceCount: number;
  /** 主服务分组数：备用入口不增加计数。 */
  groupCount: number;
  rejectionCount: number;
}

/** `convert` 的输出：界面渲染所需的全部内容。 */
export interface ConversionResult {
  summary: ConversionSummary;
  rejections: Rejection[];
  groups: ServiceGroup[];
  /** 服务目录：组头能力标签与底部矩阵共用，界面不直接读注册表。 */
  catalog: ServiceCatalog;
}

/** 服务目录里的一条记录：渲染能力标签与支持矩阵所需的全部信息。 */
export interface CatalogEntry {
  serviceId: string;
  serviceName: string;
  capabilities: readonly SourceType[];
}

/**
 * 渲染支持矩阵所需的服务目录。
 * 只含主服务（不含 jsDelivr 备用入口），行数由注册表决定，列数即源类型数。
 */
export interface ServiceCatalog {
  /** 矩阵列顺序：四类源类型。 */
  sourceTypes: readonly SourceType[];
  services: readonly CatalogEntry[];
}
