import "./styles.css";

import { copyText } from "./clipboard";
import { convert } from "./convert";
import type { Card, ConversionResult, ErrorType, ServiceLine } from "./types";

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

if (!input || !cardsElement) {
  throw new Error("页面缺少输入框或卡片容器");
}

const cardsContainer = cardsElement;

input.addEventListener("input", () => {
  render(convert(input.value));
});

render(convert(input.value));

function render(result: ConversionResult): void {
  cardsContainer.replaceChildren(...result.cards.map(renderCard));
}

function renderCard(card: Card): HTMLElement {
  const article = document.createElement("article");
  article.className = "card";

  const source = document.createElement("p");
  source.className = "card-source";
  source.textContent = card.source;
  article.append(source);

  if (card.error !== null) {
    const error = document.createElement("p");
    error.className = "card-error";
    error.textContent = ERROR_TEXT[card.error];
    article.append(error);
    return article;
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

async function handleCopy(button: HTMLButtonElement, text: string): Promise<void> {
  const copied = await copyText(text);
  button.textContent = copied ? "已复制" : "复制失败";
  window.setTimeout(() => {
    button.textContent = "复制";
  }, 1500);
}
