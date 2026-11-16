import "./styles.css";

import { renderCapabilityTags, renderMatrix } from "./capabilities";
import { copyText } from "./clipboard";
import { convert } from "./convert";
import { hostName } from "./services";
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
const rejectionsCountElement = document.querySelector<HTMLElement>("#rejections-count");
const toastElement = document.querySelector<HTMLElement>("#toast");
const groupsElement = document.querySelector<HTMLElement>("#groups");
const matrixElement = document.querySelector<HTMLElement>("#matrix");
const inputCountElement = document.querySelector<HTMLElement>("#input-count");
const emptyStateElement = document.querySelector<HTMLElement>("#empty-state");
const clearButton = document.querySelector<HTMLButtonElement>("#clear-input");
const pasteButton = document.querySelector<HTMLButtonElement>("#paste-input");
const composerHint = document.querySelector<HTMLElement>("#composer-hint");
const emptyFormatsButton = document.querySelector<HTMLButtonElement>("#empty-formats");
const themeToggleElement = document.querySelector<HTMLButtonElement>("#theme-toggle");
const railTabsElement = document.querySelector<HTMLElement>(".rail-tabs");
const railGliderElement = document.querySelector<HTMLElement>(".rail-glider");
const railTabElements = Array.from(document.querySelectorAll<HTMLButtonElement>(".rail-tab"));
const railPanelElements = Array.from(document.querySelectorAll<HTMLDetailsElement>(".rail-panel"));

if (
  !input ||
  !summaryElement ||
  !rejectionsSection ||
  !rejectionsElement ||
  !rejectionsCountElement ||
  !toastElement ||
  !groupsElement ||
  !matrixElement ||
  !inputCountElement ||
  !emptyStateElement ||
  !clearButton ||
  !pasteButton ||
  !composerHint ||
  !emptyFormatsButton ||
  !themeToggleElement ||
  !railTabsElement ||
  !railGliderElement ||
  railTabElements.length !== 2 ||
  railPanelElements.length !== 2
) {
  throw new Error(
    "页面缺少输入框、摘要、无法处理区、分组容器、支持矩阵容器、输入卡工具条、空状态或参考区",
  );
}

const inputElement = input;
const summary = summaryElement;
const rejectionsSectionElement = rejectionsSection;
const rejectionsContainer = rejectionsElement;
const rejectionsCount = rejectionsCountElement;
const toast = toastElement;
const groupsContainer = groupsElement;
const matrixContainer = matrixElement;
const inputCount = inputCountElement;
const emptyState = emptyStateElement;
const clearInputButton = clearButton;
const pasteInputButton = pasteButton;
const hintElement = composerHint;
const emptyFormats = emptyFormatsButton;
const themeToggle = themeToggleElement;
const railTabsBar = railTabsElement;
const railGlider = railGliderElement;
const railTabs = railTabElements;
const railPanels = railPanelElements;

/** 1080px 是参考区从分段控件切回可折叠块的断点，与样式表保持一致。 */
const railMedia = window.matchMedia("(min-width: 1080px)");
let railIndex = 0;

function positionRailGlider(): void {
  const tab = railTabs[railIndex];
  if (!tab || !tab.isConnected) {
    return;
  }
  railGlider.style.width = `${tab.offsetWidth}px`;
  railGlider.style.height = `${tab.offsetHeight}px`;
  railGlider.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
}

/** 宽屏：分段控件 + 单面板；窄屏：两块可折叠、标题可见。 */
function syncRailMode(): void {
  const isWide = railMedia.matches;
  railTabsBar.hidden = !isWide;

  railPanels.forEach((panel, index) => {
    const body = panel.querySelector<HTMLElement>(".rail-content");
    if (isWide) {
      panel.open = true;
      panel.hidden = index !== railIndex;
      body?.setAttribute("role", "tabpanel");
      body?.setAttribute("aria-labelledby", railTabs[index].id);
    } else {
      panel.hidden = false;
      body?.removeAttribute("role");
      body?.removeAttribute("aria-labelledby");
    }
  });

  if (isWide) {
    positionRailGlider();
    return;
  }

  // 窄屏把两块默认收起：参考信息在结果下方，不该一上来就占满屏幕。
  for (const panel of railPanels) {
    panel.open = false;
  }
}

function selectRail(index: number, moveFocus: boolean): void {
  railIndex = index;

  railTabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });

  if (railMedia.matches) {
    railPanels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });
    positionRailGlider();
  }

  if (moveFocus) {
    railTabs[index]?.focus();
  }
}

const THEME_KEY = "cdn-url:theme";

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** 按钮的按下态与提示文案跟着当前主题走，读屏与视觉保持一致。 */
function syncThemeToggle(): void {
  const dark = currentTheme() === "dark";
  themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
  themeToggle.title = dark ? "切换到浅色模式" : "切换到深色模式";
}

function setTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // file:// 或隐私模式下写不进去，主题在本次会话内仍然生效。
  }
  syncThemeToggle();
}

/**
 * 组级复制按钮的固定文案。
 * 不拼主机短名：主机名长短不一，会让同一排按钮宽度参差；当前主机由选项卡表达。
 */
const GROUP_COPY_LABEL = "复制整组";

/** 已出现过的服务分组：用于只给新出现的分组播一次入场动画。 */
let shownGroupIds = new Set<string>();

/** 当前这批分组里的选项卡滑块；每次渲染重建，不跨渲染持有已移除的节点。 */
interface TabLayout {
  glider: HTMLElement;
  tabs: readonly HTMLButtonElement[];
  selectedIndex: () => number;
}

const tabLayouts: TabLayout[] = [];

/** 把滑块量到当前选中的选项卡上：切换、缩放、字体变化都走这里。 */
function positionTabGliders(): void {
  for (const layout of tabLayouts) {
    const tab = layout.tabs[layout.selectedIndex()];
    if (!tab || !tab.isConnected) {
      continue;
    }
    layout.glider.style.width = `${tab.offsetWidth}px`;
    layout.glider.style.height = `${tab.offsetHeight}px`;
    layout.glider.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  }
}

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

/** 工具条提示平时不占位，只在出现一次性消息时短暂显示，3 秒后收起。 */
function showHint(text: string): void {
  hintElement.textContent = text;
  hintElement.hidden = false;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintElement.hidden = true;
    hintElement.textContent = "";
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
window.addEventListener("resize", positionTabGliders);

clearInputButton.addEventListener("click", () => {
  inputElement.value = "";
  refresh();
  inputElement.focus();
});

pasteInputButton.addEventListener("click", () => {
  void pasteFromClipboard();
});

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

/**
 * 空状态里的「查看支持的格式」：宽屏切到「支持的格式」面板，
 * 窄屏直接展开第一块，然后把参考区滚进视野。
 */
emptyFormats.addEventListener("click", () => {
  if (railMedia.matches) {
    selectRail(0, false);
  } else {
    railPanels[0].open = true;
  }
  railPanels[0].scrollIntoView({ behavior: "smooth", block: "center" });
});

railTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectRail(index, false));
});
railTabsBar.addEventListener("keydown", (event) =>
  handleTabKeydown(event, railTabs, selectRail),
);
railMedia.addEventListener("change", syncRailMode);
window.addEventListener("resize", positionRailGlider);

// 轨道宽度会随滚动条、断点与字体变化，Observe 一次就能一直在正确位置。
new ResizeObserver(() => {
  positionRailGlider();
}).observe(railTabsBar);

syncRailMode();
requestAnimationFrame(positionRailGlider);
syncThemeToggle();

refresh();

function render(result: ConversionResult): void {
  renderSummary(result.summary);

  rejectionsSectionElement.hidden = result.rejections.length === 0;
  rejectionsCount.textContent =
    result.rejections.length === 0 ? "" : `${result.rejections.length} 条`;
  rejectionsContainer.replaceChildren(...result.rejections.map(renderRejection));

  // 选项卡滑块只服务当前这批分组：每次渲染重建登记表，避免记住已移除的节点。
  tabLayouts.length = 0;

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

  // 刚插入的节点还没有布局，等一帧再量滑块位置。
  requestAnimationFrame(positionTabGliders);

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

  const copyGroup = document.createElement("button");
  copyGroup.type = "button";
  copyGroup.className = "action action-copy";

  tools.append(copyGroup);
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
  const idleCopyLabel = (): string => GROUP_COPY_LABEL;

  // 原地同步：只重画这一组的行、复制按钮与选项卡状态，焦点留在被按的 tab 上。
  function sync(): void {
    const variant = currentVariant();
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
    positionTabGliders();
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
    void copyWithFeedback(urls.join("\n"), "整组复制成功");
  });

  if (hasTabs) {
    const tabsRow = document.createElement("div");
    tabsRow.className = "group-tabs";

    const track = document.createElement("div");
    track.className = "tab-track";
    track.setAttribute("role", "tablist");
    track.setAttribute("aria-label", `${group.serviceName} 主机入口`);

    // 滑块是纯装饰：位置由测量决定，可访问性语义仍由选项卡自身的 aria 表达。
    const glider = document.createElement("span");
    glider.className = "tab-glider";
    glider.setAttribute("aria-hidden", "true");

    tabs = group.variants.map((variant, index) => {
      const endpointHost = hostName(variant.endpoint);
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "host-tab";
      tab.id = groupHostTabId(group.serviceId, variant.serviceId);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      // 短名给眼睛与窄屏，完整域名进悬浮提示与读屏文本；短名由结果模型给出。
      tab.title = endpointHost;
      tab.textContent = variant.label;
      tab.setAttribute("aria-label", `${variant.label}（${endpointHost}）`);
      tab.addEventListener("click", () => select(index, false));
      return tab;
    });

    track.append(glider, ...tabs);
    track.addEventListener("keydown", (event) => handleTabKeydown(event, tabs, select));
    tabsRow.append(track);
    section.append(tabsRow);

    tabLayouts.push({ glider, tabs, selectedIndex: () => selectedIndex });
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
    void copyWithFeedback(row.url, "单条复制成功");
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

let toastTimer = 0;

/** 失败提示只有一处，出现在左下角并自动消失，不与按钮内的失败态叠加。 */
type ToastTone = "success" | "error";

/** 页面顶部的横幅提示：成功是绿色，失败是红色，同一位置、同一形状。 */
function showToast(message: string, tone: ToastTone = "success"): void {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

/** 复制并在页面顶部给一条横幅：成功绿、失败红；按钮本身不换文案也不换样式。 */
async function copyWithFeedback(text: string, successMessage: string): Promise<void> {
  const copied = await copyText(text);

  if (copied) {
    showToast(successMessage, "success");
    return;
  }

  showToast("复制失败：浏览器拒绝了剪贴板写入，请手动选中地址复制。", "error");
}
