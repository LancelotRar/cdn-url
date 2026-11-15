import { identityOf, normalize } from "./normalize";
import { SERVICES, buildAcceleratedUrl } from "./services";
import type { Card, ConversionResult, ConvertOptions } from "./types";

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
        serviceId: service.id,
        serviceName: service.name,
        url: buildAcceleratedUrl(service, normalized),
        capabilities: service.capabilities,
      })),
    });
  }

  return { cards };
}
