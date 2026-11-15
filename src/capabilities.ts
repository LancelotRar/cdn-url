import type { ServiceCatalog, SourceType } from "./types";

/** 四类源类型的界面文案。只影响显示，能力判断全部来自 `convert` 返回的目录。 */
const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  "repo-file": "仓库单文件",
  gist: "gist 直链",
  "release-asset": "release 资产",
  archive: "归档包",
};

/**
 * 组头的能力标签：先给一句「可加速」引导，再列出该服务支持的源类型。
 * 标签集合沿用 `convert` 输出目录的口径，与页面底部支持矩阵同源。
 */
export function renderCapabilityTags(capabilities: readonly SourceType[]): HTMLElement {
  const container = document.createElement("span");
  container.className = "group-caps";

  const lead = document.createElement("span");
  lead.className = "caps-lead";
  lead.textContent = "可加速";
  container.append(lead);

  for (const capability of capabilities) {
    container.append(chip(SOURCE_TYPE_LABELS[capability], "cap"));
  }

  return container;
}

function chip(text: string, className: string): HTMLElement {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * 页面底部的支持矩阵：目录里的每个主服务一行，四类源类型一列。
 * 支持与不支持同时用符号和读屏文字表达，不依赖颜色区分。
 */
export function renderMatrix(catalog: ServiceCatalog): HTMLElement {
  const host = document.createElement("div");
  host.className = "matrix-host";

  const table = document.createElement("table");
  table.className = "matrix";
  // 视觉上不再显示标题，改用无障碍名称，读屏仍能知道这是什么表。
  table.setAttribute("aria-label", "服务支持矩阵");

  const headRow = document.createElement("tr");
  headRow.append(headerCell("服务"));
  for (const sourceType of catalog.sourceTypes) {
    headRow.append(headerCell(SOURCE_TYPE_LABELS[sourceType]));
  }

  const thead = document.createElement("thead");
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const entry of catalog.services) {
    const row = document.createElement("tr");

    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = entry.serviceName;
    row.append(name);

    for (const sourceType of catalog.sourceTypes) {
      row.append(matrixCell(entry.capabilities.includes(sourceType)));
    }

    tbody.append(row);
  }

  table.append(thead, tbody);
  host.append(table);

  return host;
}

function headerCell(text: string): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.textContent = text;
  return cell;
}

function matrixCell(supported: boolean): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = supported ? "matrix-cell matrix-yes" : "matrix-cell matrix-no";

  const mark = document.createElement("span");
  mark.className = "matrix-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = supported ? "✓" : "—";

  // 符号对读屏无意义，附一段隐藏文字把「支持 / 不支持」读出来。
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = supported ? "支持" : "不支持";

  cell.append(mark, spoken);
  return cell;
}
