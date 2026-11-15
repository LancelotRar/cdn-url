import "./styles.css";

import { renderCapabilityTags, renderMatrix } from "./capabilities";
import { copyText } from "./clipboard";
import { convert } from "./convert";
import type {
  ConversionResult,
  ConversionSummary,
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
const summaryElement = document.querySelector<HTMLElement>("#summary");
const rejectionsSection = document.querySelector<HTMLElement>("#rejections-section");
const rejectionsElement = document.querySelector<HTMLElement>("#rejections");
const groupsElement = document.querySelector<HTMLElement>("#groups");
const matrixElement = document.querySelector<HTMLElement>("#matrix");
const matrixCountElement = document.querySelector<HTMLElement>("#matrix-count");

if (
  !input ||
  !summaryElement ||
  !rejectionsSection ||
  !rejectionsElement ||
  !groupsElement ||
  !matrixElement ||
  !matrixCountElement
) {
  throw new Error(
    "页面缺少输入框、摘要、无法处理区、分组容器、支持矩阵容器或矩阵数量提示",
  );
}

const inputElement = input;
const summary = summaryElement;
const rejectionsSectionElement = rejectionsSection;
const rejectionsContainer = rejectionsElement;
const groupsContainer = groupsElement;
const matrixContainer = matrixElement;
const matrixCount = matrixCountElement;

/** 已选主机：按服务分组保存在页面内存，输入变化不重置，整页刷新才回主入口。 */
const selectedVariantByGroup = new Map<string, string>();

/** 输入变化是唯一重算来源；结果按服务重新分组，备用入口始终在组内。 */
function refresh(): void {
  render(convert(inputElement.value));
}

input.addEventListener("input", refresh);

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

  const head = document.createElement("div");
  head.className = "group-head";

  const identity = document.createElement("div");
  identity.className = "group-identity";

  const title = document.createElement("h2");
  title.className = "group-title";
  title.id = titleId;
  title.textContent = group.serviceName;
  // 标题关联到内容面板：读屏从标题即可跳到本组行列表。
  title.setAttribute("aria-controls", groupPanelId(group.serviceId));

  identity.append(title, renderCapabilityTags(group.capabilities));

  const tools = document.createElement("div");
  tools.className = "group-tools";

  const count = document.createElement("span");
  count.className = "group-count";

  const copyGroup = document.createElement("button");
  copyGroup.type = "button";
  copyGroup.className = "action action-copy";

  tools.append(count, copyGroup);
  head.append(identity, tools);
  section.append(head);

  const panel = document.createElement("div");
  panel.id = groupPanelId(group.serviceId);

  // 只有一个入口时整组没有切换态：不渲染选项卡，面板由组标题标注。
  const hasTabs = group.variants.length > 1;
  if (hasTabs) {
    panel.setAttribute("role", "tabpanel");
  } else {
    panel.setAttribute("aria-labelledby", titleId);
  }

  const list = document.createElement("ul");
  list.className = "rows";
  panel.append(list);

  let selectedIndex = selectedVariantIndex(group);
  let tabs: HTMLButtonElement[] = [];

  const currentVariant = (): ServiceVariant => group.variants[selectedIndex];
  const idleCopyLabel = (): string => groupCopyLabel(currentVariant());

  // 原地同步：只重画这一组的行、计数、复制按钮与选项卡状态，焦点留在被按的 tab 上。
  function sync(): void {
    const variant = currentVariant();
    count.textContent = `${variant.rows.length} 行`;
    copyGroup.textContent = idleCopyLabel();
    list.replaceChildren(...variant.rows.map(renderRow));

    if (!hasTabs) {
      return;
    }

    tabs.forEach((tab, index) => {
      const selected = index === selectedIndex;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tabs[selectedIndex].id);
  }

  function select(index: number, moveFocus: boolean): void {
    if (index !== selectedIndex) {
      selectedIndex = index;
      // 记住入口本身而非下标，输入变化后重渲染仍能指回同一主机。
      selectedVariantByGroup.set(group.serviceId, group.variants[index].serviceId);
      sync();
    }

    if (moveFocus) {
      tabs[index]?.focus();
    }
  }

  copyGroup.addEventListener("click", () => {
    const urls = currentVariant().rows.map((row) => row.url);
    void handleCopy(copyGroup, urls.join("\n"), idleCopyLabel);
  });

  if (hasTabs) {
    const tablist = document.createElement("div");
    tablist.className = "group-tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", `${group.serviceName} 主机入口`);

    tabs = group.variants.map((variant, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "host-tab";
      tab.id = groupHostTabId(group.serviceId, variant.serviceId);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      // 短名给眼睛与窄屏，完整域名进悬浮提示与读屏文本。
      tab.title = hostName(variant.endpoint);
      tab.textContent = hostShortName(variant.endpoint);
      tab.setAttribute("aria-label", `${hostShortName(variant.endpoint)}（${hostName(variant.endpoint)}）`);
      tab.addEventListener("click", () => select(index, false));
      return tab;
    });

    tablist.append(...tabs);
    tablist.addEventListener("keydown", (event) => handleTabKeydown(event, tabs, select));

    section.append(tablist);
  }

  section.append(panel);
  sync();

  return section;
}

/**
 * 选项卡键盘操作：左右循环、Home/End 到首末。
 * 带 Ctrl/Alt/Meta 修饰键或非方向/首末键时交回浏览器，不拦截。
 */
function handleTabKeydown(
  event: KeyboardEvent,
  tabs: readonly HTMLButtonElement[],
  select: (index: number, moveFocus: boolean) => void,
): void {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = tabs.indexOf(target);
  if (index === -1) {
    return;
  }

  let next: number;
  switch (event.key) {
    case "ArrowRight":
      next = (index + 1) % tabs.length;
      break;
    case "ArrowLeft":
      next = (index - 1 + tabs.length) % tabs.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = tabs.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  select(next, true);
}

/** 存的是入口 serviceId 而不是下标；入口暂时消失时暂用主入口且不抹掉记忆。 */
function selectedVariantIndex(group: ServiceGroup): number {
  const preferred = selectedVariantByGroup.get(group.serviceId);
  const index = group.variants.findIndex((variant) => variant.serviceId === preferred);
  return index === -1 ? 0 : index;
}

function groupPanelId(serviceId: string): string {
  return `group-${serviceId}-panel`;
}

function groupHostTabId(serviceId: string, variantServiceId: string): string {
  return `group-${serviceId}-tab-${variantServiceId}`;
}

/** 端点的主机名：放进悬浮提示与读屏文本。 */
function hostName(endpoint: string): string {
  return new URL(endpoint).hostname;
}

/** 主机短名取首段（cdn / fastly / gcore / testingcf），窄屏也放得下。 */
function hostShortName(endpoint: string): string {
  return hostName(endpoint).split(".")[0];
}

/** 组级复制按钮文案始终带当前主机短名，单入口时也能确认复制的是哪个主机。 */
function groupCopyLabel(variant: ServiceVariant): string {
  return `复制整组 · ${hostShortName(variant.endpoint)}`;
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
    void handleCopy(copyButton, row.url, () => "复制");
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
  idleLabel: () => string,
): Promise<void> {
  const copied = await copyText(text);
  button.textContent = copied ? "已复制" : "复制失败";
  window.setTimeout(() => {
    // 空闲文案用回调：组级按钮跟随当前主机，反馈结束时按当时入口重算，而不是写回旧文案。
    button.textContent = idleLabel();
  }, 1500);
}
