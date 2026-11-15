import { identityOf, normalize } from "./normalize";
import { SERVICES, buildAcceleratedUrl } from "./services";
import type {
  Card,
  CatalogEntry,
  ConversionResult,
  ConvertOptions,
  Service,
  ServiceCatalog,
  SourceType,
} from "./types";

/** 四类源类型，按 spec 支持矩阵的列顺序。 */
const SOURCE_TYPES: readonly SourceType[] = [
  "repo-file",
  "gist",
  "release-asset",
  "archive",
];

/**
 * 唯一接缝：把输入框的原始文本转成渲染所需的全部内容。
 * 界面层只渲染这里返回的结果，不含任何判断逻辑。
 * 开关项默认关闭：备用入口只有在被显式打开时才参与生成。
 * 等价判定按归一化标识：同标识的卡片都保留，后出现的卡片指向第一次出现的卡片序号（1 起算）。
 */
export function convert(text: string, options: ConvertOptions = {}): ConversionResult {
  const includeFallbacks = options.jsdelivrFallbacks === true;
  const cards: Card[] = [];
  const firstCardByIdentity = new Map<string, number>();

  for (const rawLine of text.split(/\r?\n/)) {
    const source = rawLine.trim();
    if (source.length === 0) {
      continue;
    }

    const normalized = normalize(source);
    if (normalized.kind === "error") {
      cards.push({
        source,
        sourceType: null,
        error: normalized.error,
        equivalentTo: null,
        note: null,
        lines: [],
      });
      continue;
    }

    const cardNumber = cards.length + 1;
    const identity = identityOf(normalized);
    const firstCardNumber = firstCardByIdentity.get(identity);
    if (firstCardNumber === undefined) {
      firstCardByIdentity.set(identity, cardNumber);
    }

    cards.push({
      source,
      sourceType: normalized.kind,
      error: null,
      equivalentTo: firstCardNumber ?? null,
      note: normalized.kind === "gist" ? "仅适用于单文件 gist" : null,
      lines: SERVICES.filter(
        (service) =>
          service.capabilities.includes(normalized.kind) &&
          (includeFallbacks || service.fallback !== true),
      ).map((service) => ({
        ...projectService(service),
        url: buildAcceleratedUrl(service, normalized),
      })),
    });
  }

  return { cards, catalog: buildCatalog() };
}

/**
 * 注册表记录到界面数据的共享投影：结果行与目录条目都从这里取值，
 * 同一次映射只写一遍，避免两处字段各说各话。
 */
function projectService(service: Service): CatalogEntry {
  return {
    serviceId: service.id,
    serviceName: service.name,
    capabilities: service.capabilities,
  };
}

/**
 * 服务目录与生成地址共用同一份注册表，只过滤掉备用入口：
 * 矩阵只列主服务，所以某条源少了几家时能查到是能力不支持。
 */
function buildCatalog(): ServiceCatalog {
  return {
    sourceTypes: SOURCE_TYPES,
    services: SERVICES.filter((service) => service.fallback !== true).map(projectService),
  };
}
