import "./styles.css";

import { copyText } from "./clipboard";
import { convert } from "./convert";
import type { Card, ConversionResult, ConvertOptions, ErrorType, ServiceLine } from "./types";

const ERROR_TEXT: Record<ErrorType, string> = {
  "tree-directory": "这是 tree 目录页，不支持。",
  "api-host": "api.github.com 地址不支持。",
  "codeload-host": "codeload.github.com 地址不支持。",
  "repo-home": "这是仓库首页，不是单个文件。",
  "non-github": "不是 GitHub 地址。",
  unrecognized: "无法识别的地址形状。",
};

const input = document.querySelector<HTMLTextAreaElement>("#source-input");
const cardsElement = document.querySelector<HTMLElement>("#cards");
const fallbackToggle = document.querySelector<HTMLInputElement>("#jsdelivr-fallbacks");
const copyAllButton = document.querySelector<HTMLButtonElement>("#copy-all");

if (!input || !cardsElement || !fallbackToggle || !copyAllButton) {
  throw new Error("页面缺少输入框、卡片容器、备用入口开关或复制全部按钮");
}

const cardsContainer = cardsElement;
const inputElement = input;
const toggle = fallbackToggle;
const copyAll = copyAllButton;

/** 当前渲染结果；页面级复制按钮只读取它，不重新计算。 */
let currentResult: ConversionResult = { cards: [] };

/** 开关状态是唯一变化来源；切换后立即用当前输入重算，不需要重新粘贴。 */
function refresh(): void {
  const options: ConvertOptions = { jsdelivrFallbacks: toggle.checked };
  render(convert(inputElement.value, options));
}

input.addEventListener("input", refresh);
toggle.addEventListener("change", refresh);
copyAll.addEventListener("click", () => {
  const urls = allUrls(currentResult);
  if (urls.length === 0) {
    return;
  }
  void handleCopy(copyAll, urls.join("\n"), "复制全部");
});

refresh();

function render(result: ConversionResult): void {
  currentResult = result;
  cardsContainer.replaceChildren(...result.cards.map(renderCard));
  copyAll.disabled = allUrls(result).length === 0;
}

/** 按卡片顺序、卡片内的界面顺序摊平所有加速地址。 */
function allUrls(result: ConversionResult): string[] {
  return result.cards.flatMap((card) => card.lines.map((line) => line.url));
}

function renderCard(card: Card): HTMLElement {
  const article = document.createElement("article");
  article.className = "card";

  const head = document.createElement("div");
  head.className = "card-head";

  const source = document.createElement("p");
  source.className = "card-source";
  source.textContent = card.source;
  head.append(source);

  const urls = card.lines.map((line) => line.url);
  if (urls.length > 0) {
    const copyGroup = document.createElement("button");
    copyGroup.type = "button";
    copyGroup.className = "action action-copy";
    copyGroup.textContent = "复制本组";
    copyGroup.addEventListener("click", () => {
      void handleCopy(copyGroup, urls.join("\n"), "复制本组");
    });
    head.append(copyGroup);
  }

  article.append(head);

  if (card.error !== null) {
    const error = document.createElement("p");
    error.className = "card-error";
    error.textContent = ERROR_TEXT[card.error];
    article.append(error);
    return article;
  }

  if (card.equivalentTo !== null) {
    const equivalent = document.createElement("p");
    equivalent.className = "card-equivalent";
    equivalent.textContent = `与第 ${card.equivalentTo} 条等价`;
    article.append(equivalent);
  }

  if (card.note !== null) {
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = card.note;
    article.append(note);
  }

  const list = document.createElement("ul");
  list.className = "lines";
  for (const line of card.lines) {
    list.append(renderLine(line));
  }
  article.append(list);

  return article;
}

function renderLine(line: ServiceLine): HTMLElement {
  const item = document.createElement("li");
  item.className = "line";

  const service = document.createElement("span");
  service.className = "line-service";
  service.textContent = line.serviceName;

  const url = document.createElement("span");
  url.className = "line-url";
  url.textContent = line.url;

  const actions = document.createElement("span");
  actions.className = "line-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "action action-copy";
  copyButton.textContent = "复制";
  copyButton.addEventListener("click", () => {
    void handleCopy(copyButton, line.url);
  });

  const openLink = document.createElement("a");
  openLink.className = "action action-open";
  openLink.href = line.url;
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.textContent = "打开";

  actions.append(copyButton, openLink);
  item.append(service, url, actions);

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
