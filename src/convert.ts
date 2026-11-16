import { identityOf, labelOf, normalize } from "./normalize";
import { SERVICES, buildAcceleratedUrl, hostShortName } from "./services";
import type {
  CatalogEntry,
  CatalogFallback,
  ConversionResult,
  ConversionSummary,
  NormalizedTarget,
  Rejection,
  ResultRow,
  Service,
  ServiceCatalog,
  ServiceGroup,
  ServiceVariant,
  SourceType,
} from "./types";

/** 四类源类型，按 spec 支持矩阵的列顺序。 */
const SOURCE_TYPES: readonly SourceType[] = [
  "repo-file",
  "gist",
  "release-asset",
  "archive",
];

/** 一条被接受的源地址：分组构造的中间形态，聚合了行所需的全部来源信息。 */
interface AcceptedSource {
  line: number;
  source: string;
  target: NormalizedTarget;
  equivalentTo: number | null;
  note: string | null;
}

/**
 * 唯一接缝：把输入框的原始文本转成按加速服务分组的渲染数据。
 * 界面层只渲染这里返回的结果，不含任何判断逻辑。
 * 分组顺序沿用注册表顺序，只输出至少有一行的分组；组内行序等于输入顺序。
 * 备用入口不单独成组，而是始终投影为其主服务的 `variants`，由界面选项卡切换。
 * 等价判定按归一化标识：同标识的源都保留，后出现的行指向首次出现的输入行号（1 起算）。
 */
export function convert(text: string): ConversionResult {
  const accepted: AcceptedSource[] = [];
  const rejections: Rejection[] = [];
  const firstLineByIdentity = new Map<string, number>();

  // 行号按非空输入行计：空行与纯空白行既不占号，也不进摘要。
  let lineNumber = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const source = rawLine.trim();
    if (source.length === 0) {
      continue;
    }

    lineNumber += 1;
    const normalized = normalize(source);
    if (normalized.kind === "error") {
      // 被拒绝的源不参与分组与等价判定，只保留行号与原因。
      rejections.push({ line: lineNumber, source, error: normalized.error });
      continue;
    }

    const identity = identityOf(normalized);
    const firstLine = firstLineByIdentity.get(identity);
    if (firstLine === undefined) {
      firstLineByIdentity.set(identity, lineNumber);
    }

    accepted.push({
      line: lineNumber,
      source,
      target: normalized,
      equivalentTo: firstLine ?? null,
      note: normalized.kind === "gist" ? "仅适用于单文件 gist" : null,
    });
  }

  const groups = buildGroups(accepted);
  const summary: ConversionSummary = {
    sourceCount: lineNumber,
    groupCount: groups.length,
    rejectionCount: rejections.length,
  };

  return { summary, rejections, groups, catalog: buildCatalog() };
}

/**
 * 服务目录与组头标签共用同一份注册表。
 * 矩阵按主服务成行，备用入口挂在所属主服务的 `fallbacks` 下作为子行。
 */
function buildCatalog(): ServiceCatalog {
  return {
    sourceTypes: SOURCE_TYPES,
    services: SERVICES.filter((service) => service.fallbackOf === undefined).map(
      (service): CatalogEntry => ({
        serviceId: service.id,
        serviceName: service.name,
        capabilities: service.capabilities,
        fallbacks: SERVICES.filter((candidate) => candidate.fallbackOf === service.id).map(
          (fallback): CatalogFallback => ({
            serviceId: fallback.id,
            serviceName: fallback.name,
            capabilities: fallback.capabilities,
            shortName: hostShortName(fallback.endpoint),
          }),
        ),
      }),
    ),
  };
}

/**
 * 按注册表顺序构造分组；主服务无行时整组不输出，备用入口不增加分组。
 * 分组存续只看主入口行：备用入口有行而主入口没有，也不会凭空撑起一组。
 */
function buildGroups(accepted: readonly AcceptedSource[]): ServiceGroup[] {
  const groups: ServiceGroup[] = [];

  for (const service of SERVICES) {
    if (service.fallbackOf !== undefined) {
      continue;
    }

    const mainRows = buildRows(service, accepted);
    if (mainRows.length === 0) {
      continue;
    }

    groups.push({
      serviceId: service.id,
      serviceName: service.name,
      capabilities: service.capabilities,
      variants: buildVariants(service, accepted, mainRows),
    });
  }

  return groups;
}

/**
 * 主入口排第一位，其后始终追加备用入口，并保持注册表顺序。
 * 主入口的行由调用方算好并复用，避免重复过滤。
 */
function buildVariants(
  main: Service,
  accepted: readonly AcceptedSource[],
  mainRows: readonly ResultRow[],
): ServiceVariant[] {
  const variants: ServiceVariant[] = [variantOf(main, mainRows, false)];

  for (const service of SERVICES) {
    if (service.fallbackOf !== main.id) {
      continue;
    }

    variants.push(variantOf(service, buildRows(service, accepted), true));
  }

  return variants;
}

function variantOf(
  service: Service,
  rows: readonly ResultRow[],
  isFallback: boolean,
): ServiceVariant {
  return {
    serviceId: service.id,
    serviceName: service.name,
    endpoint: service.endpoint,
    isFallback,
    rows: [...rows],
  };
}

/** 组内行序等于输入顺序；能力不支持的源不出现，因此组内地址必然是同一语法。 */
function buildRows(service: Service, accepted: readonly AcceptedSource[]): ResultRow[] {
  return accepted
    .filter((entry) => service.capabilities.includes(entry.target.kind))
    .map((entry) => ({
      line: entry.line,
      source: entry.source,
      label: labelOf(entry.target),
      url: buildAcceleratedUrl(service, entry.target),
      note: entry.note,
      equivalentTo: entry.equivalentTo,
    }));
}
