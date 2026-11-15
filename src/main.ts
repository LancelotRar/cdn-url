import "./styles.css";

import { renderCapabilityTags, renderMatrix } from "./capabilities";
import { copyText } from "./clipboard";
import { convert } from "./convert";
import type {
  ConversionResult,
  ConversionSummary,
  ConvertOptions,
  ErrorType,
  Rejection,
  ResultRow,
  ServiceGroup,
  ServiceVariant,
} from "./types";

const ERROR_TEXT: Record<ErrorType, string> = {
  "tree-directory": "这是 tree 目录页，不支持。",
  "api-host": "api.github.com 地址不支持。",
  "codeload-host": "codeload.github.com 地址不支持。",
  "repo-home": "这是仓库首页，不是单个文件。",
  "non-github": "不是 GitHub 地址。",
  unrecognized: "无法识别的地址形状。",
};

const input = document.querySelector<HTMLTextAreaElement>("#source-input");
const fallbackToggle = document.querySelector<HTMLInputElement>("#jsdelivr-fallbacks");
const summaryElement = document.querySelector<HTMLElement>("#summary");
const rejectionsSection = document.querySelector<HTMLElement>("#rejections-section");
const rejectionsElement = document.querySelector<HTMLElement>("#rejections");
const groupsElement = document.querySelector<HTMLElement>("#groups");
const matrixElement = document.querySelector<HTMLElement>("#matrix");
const matrixCountElement = document.querySelector<HTMLElement>("#matrix-count");

if (
  !input ||
  !fallbackToggle ||
  !summaryElement ||
  !rejectionsSection ||
  !rejectionsElement ||
  !groupsElement ||
  !matrixElement ||
  !matrixCountElement
) {
  throw new Error(
    "页面缺少输入框、备用入口开关、摘要、无法处理区、分组容器、支持矩阵容器或矩阵数量提示",
  );
}

const inputElement = input;
const toggle = fallbackToggle;
const summary = summaryElement;
const rejectionsSectionElement = rejectionsSection;
const rejectionsContainer = rejectionsElement;
const groupsContainer = groupsElement;
const matrixContainer = matrixElement;
const matrixCount = matrixCountElement;

/** 开关状态是唯一变化来源；切换后立即用当前输入重算，不需要重新粘贴。 */
function refresh(): void {
  const options: ConvertOptions = { jsdelivrFallbacks: toggle.checked };
  render(convert(inputElement.value, options));
}

input.addEventListener("input", refresh);
toggle.addEventListener("change", refresh);

refresh();

function render(result: ConversionResult): void {
  renderSummary(result.summary);

  rejectionsSectionElement.hidden = result.rejections.length === 0;
  rejectionsContainer.replaceChildren(...result.rejections.map(renderRejection));

  groupsContainer.replaceChildren(...result.groups.map(renderGroup));

  matrixCount.textContent = `${result.catalog.services.length} 个主服务 × ${result.catalog.sourceTypes.length} 类源类型。`;
  matrixContainer.replaceChildren(renderMatrix(result.catalog));
}

/** 摘要只读 `summary` 的三个计数；没有非空输入时整块不出现。 */
function renderSummary(counts: ConversionSummary): void {
  if (counts.sourceCount === 0) {
    summary.hidden = true;
    summary.textContent = "";
    return;
  }

  const accepted = `${counts.sourceCount} 条源地址 → ${counts.groupCount} 个服务分组`;
  summary.textContent =
    counts.rejectionCount === 0
      ? accepted
      : `${accepted}，${counts.rejectionCount} 条无法处理`;
  summary.hidden = false;
}

function renderRejection(rejection: Rejection): HTMLElement {
  const item = document.createElement("li");
  item.className = "rejection";

  const line = document.createElement("span");
  line.className = "rejection-line";
  line.textContent = `第 ${rejection.line} 行`;

  const source = document.createElement("span");
  source.className = "rejection-source";
  source.textContent = rejection.source;

  const error = document.createElement("span");
  error.className = "rejection-error";
  error.textContent = ERROR_TEXT[rejection.error];

  item.append(line, source, error);
  return item;
}

function renderGroup(group: ServiceGroup): HTMLElement {
  const section = document.createElement("section");
  section.className = "group";

  const titleId = `group-${group.serviceId}-title`;
  section.setAttribute("aria-labelledby", titleId);

  // 这一单只渲染主入口；03 会在组头与行列表之间插入主机选项卡，
  // 并把组级复制按钮的文案换成当前主机短名。
  const variant = group.variants[0];
  const copyLabel = groupCopyLabel(variant, group.variants.length);
  const urls = variant.rows.map((row) => row.url);

  const head = document.createElement("div");
  head.className = "group-head";

  const identity = document.createElement("div");
  identity.className = "group-identity";

  const title = document.createElement("h2");
  title.className = "group-title";
  title.id = titleId;
  title.textContent = group.serviceName;

  identity.append(title, renderCapabilityTags(group.capabilities));

  const tools = document.createElement("div");
  tools.className = "group-tools";

  const count = document.createElement("span");
  count.className = "group-count";
  count.textContent = `${variant.rows.length} 行`;

  const copyGroup = document.createElement("button");
  copyGroup.type = "button";
  copyGroup.className = "action action-copy";
  copyGroup.textContent = copyLabel;
  copyGroup.addEventListener("click", () => {
    void handleCopy(copyGroup, urls.join("\n"), copyLabel);
  });

  tools.append(count, copyGroup);
  head.append(identity, tools);
  section.append(head);

  const list = document.createElement("ul");
  list.className = "rows";
  for (const row of variant.rows) {
    list.append(renderRow(row));
  }
  section.append(list);

  return section;
}

/** 组级复制按钮文案：多入口时带当前主机短名，避免复制到看不见的那个入口。 */
function groupCopyLabel(variant: ServiceVariant, variantCount: number): string {
  if (variantCount <= 1) {
    return "复制整组";
  }

  const host = new URL(variant.endpoint).hostname.split(".")[0];
  return `复制整组 · ${host}`;
}

function renderRow(row: ResultRow): HTMLElement {
  const item = document.createElement("li");
  item.className = "row";

  // 行首只放短标识，完整源地址进悬浮提示；标识可重复，源地址本身仍能区分。
  const label = document.createElement("span");
  label.className = "row-label";
  label.textContent = row.label;
  label.title = row.source;

  const url = document.createElement("span");
  url.className = "row-url";
  url.textContent = row.url;

  const meta = document.createElement("span");
  meta.className = "row-meta";

  if (row.equivalentTo !== null) {
    const equivalent = document.createElement("span");
    equivalent.className = "row-equivalent";
    equivalent.textContent = `与第 ${row.equivalentTo} 条等价`;
    meta.append(equivalent);
  }

  if (row.note !== null) {
    const note = document.createElement("span");
    note.className = "row-note";
    note.textContent = row.note;
    meta.append(note);
  }

  const actions = document.createElement("span");
  actions.className = "row-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "action action-copy";
  copyButton.textContent = "复制";
  copyButton.addEventListener("click", () => {
    void handleCopy(copyButton, row.url);
  });

  const openLink = document.createElement("a");
  openLink.className = "action action-open";
  openLink.href = row.url;
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.textContent = "打开";

  actions.append(copyButton, openLink);
  item.append(label, url);
  if (meta.childElementCount > 0) {
    item.append(meta);
  }
  item.append(actions);

  return item;
}

async function handleCopy(
  button: HTMLButtonElement,
  text: string,
  idleLabel = "复制",
): Promise<void> {
  const copied = await copyText(text);
  button.textContent = copied ? "已复制" : "复制失败";
  window.setTimeout(() => {
    button.textContent = idleLabel;
  }, 1500);
}
