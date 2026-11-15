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
const inputCountElement = document.querySelector<HTMLElement>("#input-count");
const emptyStateElement = document.querySelector<HTMLElement>("#empty-state");
const clearButton = document.querySelector<HTMLButtonElement>("#clear-input");
const fillExampleButton = document.querySelector<HTMLButtonElement>("#fill-example");
const pasteButton = document.querySelector<HTMLButtonElement>("#paste-input");
const composerHint = document.querySelector<HTMLElement>("#composer-hint");
const emptyFillButton = document.querySelector<HTMLButtonElement>("#empty-fill");
const emptyFormatsButton = document.querySelector<HTMLButtonElement>("#empty-formats");

if (
  !input ||
  !summaryElement ||
  !rejectionsSection ||
  !rejectionsElement ||
  !groupsElement ||
  !matrixElement ||
  !matrixCountElement ||
  !inputCountElement ||
  !emptyStateElement ||
  !clearButton ||
  !fillExampleButton ||
  !pasteButton ||
  !composerHint ||
  !emptyFillButton ||
  !emptyFormatsButton
) {
  throw new Error(
    "页面缺少输入框、摘要、无法处理区、分组容器、支持矩阵容器、输入卡工具条或空状态",
  );
}

const inputElement = input;
const summary = summaryElement;
const rejectionsSectionElement = rejectionsSection;
const rejectionsContainer = rejectionsElement;
const groupsContainer = groupsElement;
const matrixContainer = matrixElement;
const matrixCount = matrixCountElement;
const inputCount = inputCountElement;
const emptyState = emptyStateElement;
const clearInputButton = clearButton;
const fillExample = fillExampleButton;
const pasteInputButton = pasteButton;
const hintElement = composerHint;
const emptyFill = emptyFillButton;
const emptyFormats = emptyFormatsButton;

/** 示例源地址：仓库单文件、gist 直链、release 资产各一条，覆盖三种归一化分支。 */
const EXAMPLE_SOURCES = [
  "https://github.com/LancelotRar/best-cf-ips/blob/main/best-cf-ip-scanned-top20.txt",
  "https://gist.githubusercontent.com/mn9ri4jdm5/fd2e299390c88720b4cb026b2795126a/raw/53489_qctld.md",
  "https://github.com/MetaCubeX/mihomo/releases/download/v1.19.34/mihomo-linux-amd64-v3-v1.19.34.gz",
].join("\n");

const DEFAULT_HINT = "一行一条";

/** 已出现过的服务分组：用于只给新出现的分组播一次入场动画。 */
let shownGroupIds = new Set<string>();

/** 已选主机：按服务分组保存在页面内存，输入变化不重置，整页刷新才回主入口。 */
const selectedVariantByGroup = new Map<string, string>();

/** 输入变化是唯一重算来源；结果按服务重新分组，备用入口始终在组内。 */
function refresh(): void {
  const result = convert(inputElement.value);
  render(result);
  syncComposer(result.summary);
  autoGrow();
}

/**
 * 输入卡只显示「有效条数」：源地址条数减去无法处理条数。
 * 两个数都来自 `convert` 的摘要，界面不另算一套口径。
 */
function syncComposer(counts: ConversionSummary): void {
  const accepted = counts.sourceCount - counts.rejectionCount;
  inputCount.textContent = counts.sourceCount === 0 ? "0 条" : `有效 ${accepted} 条`;
  emptyState.hidden = counts.sourceCount > 0;
}

/** 输入框随内容增高，超出 CSS 的 max-height 后转为内部滚动。 */
function autoGrow(): void {
  inputElement.style.height = "auto";
  // scrollHeight 不含边框，补 2px 才不会因为差一个像素而常驻滚动条。
  inputElement.style.height = `${inputElement.scrollHeight + 2}px`;
}

let hintTimer = 0;

/** 工具条提示复用同一个位置，3 秒后回到默认文案，不弹模态。 */
function showHint(text: string): void {
  hintElement.textContent = text;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintElement.textContent = DEFAULT_HINT;
  }, 3000);
}

/** 整块替换输入内容并重算；示例按钮与粘贴成功都走这一条路径。 */
function setInputText(value: string): void {
  inputElement.value = value;
  refresh();
  inputElement.focus();
}

/**
 * 读剪贴板失败很常见（权限、非安全上下文、`file://`），
 * 因此失败时聚焦输入框并提示手动粘贴，而不是静默失败或弹窗。
 */
async function pasteFromClipboard(): Promise<void> {
  if (!navigator.clipboard?.readText) {
    inputElement.focus();
    showHint("按 Ctrl+V 粘贴");
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text.trim() === "") {
      inputElement.focus();
      showHint("剪贴板里没有内容");
      return;
    }
    setInputText(text);
  } catch {
    inputElement.focus();
    showHint("按 Ctrl+V 粘贴");
  }
}

input.addEventListener("input", refresh);
window.addEventListener("resize", autoGrow);

clearInputButton.addEventListener("click", () => {
  inputElement.value = "";
  refresh();
  inputElement.focus();
});

fillExample.addEventListener("click", () => setInputText(EXAMPLE_SOURCES));
emptyFill.addEventListener("click", () => setInputText(EXAMPLE_SOURCES));
pasteInputButton.addEventListener("click", () => {
  void pasteFromClipboard();
});

/** 空状态里的「支持的 6 类地址」把参考区滚进视野，不切换页面状态。 */
emptyFormats.addEventListener("click", () => {
  document.querySelector(".help-row")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

refresh();

function render(result: ConversionResult): void {
  renderSummary(result.summary);

  rejectionsSectionElement.hidden = result.rejections.length === 0;
  rejectionsContainer.replaceChildren(...result.rejections.map(renderRejection));

  // 只为本次新出现的分组安排入场延迟：输入变化导致的重渲染不会让整页反复闪。
  const nextGroupIds = new Set(result.groups.map((group) => group.serviceId));
  const enteringIds = result.groups
    .map((group) => group.serviceId)
    .filter((id) => !shownGroupIds.has(id));
  const step = enteringIds.length > 1 ? Math.min(60, 80 / (enteringIds.length - 1)) : 0;

  groupsContainer.replaceChildren(
    ...result.groups.map((group) => {
      const order = enteringIds.indexOf(group.serviceId);
      return renderGroup(group, order === -1 ? null : order * step);
    }),
  );
  shownGroupIds = nextGroupIds;

  matrixCount.textContent = `${result.catalog.services.length} 个主服务 × ${result.catalog.sourceTypes.length} 类源类型。`;
  matrixContainer.replaceChildren(renderMatrix(result.catalog));
}

/** 摘要只读 `summary` 的三个计数；没有非空输入时整块不出现。 */
function renderSummary(counts: ConversionSummary): void {
  if (counts.sourceCount === 0) {
    summary.hidden = true;
    summary.replaceChildren();
    return;
  }

  const nodes: HTMLElement[] = [
    summaryItem(counts.sourceCount, "条源地址"),
    summaryArrow(),
    summaryItem(counts.groupCount, "个服务分组"),
  ];
  if (counts.rejectionCount > 0) {
    nodes.push(summaryItem(counts.rejectionCount, "条无法处理", true));
  }

  summary.replaceChildren(...nodes);
  summary.hidden = false;
}

function summaryItem(count: number, unit: string, danger = false): HTMLElement {
  const item = document.createElement("span");
  item.className = danger ? "summary-item summary-item-danger" : "summary-item";

  const value = document.createElement("b");
  value.textContent = String(count);

  item.append(value, document.createTextNode(` ${unit}`));
  return item;
}

function summaryArrow(): HTMLElement {
  const arrow = document.createElement("span");
  arrow.className = "summary-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  return arrow;
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

function renderGroup(group: ServiceGroup, enterDelayMs: number | null): HTMLElement {
  const section = document.createElement("section");
  section.className = "group";

  if (enterDelayMs !== null) {
    section.classList.add("is-entering");
    section.style.setProperty("--enter-delay", `${Math.round(enterDelayMs)}ms`);
  }

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
