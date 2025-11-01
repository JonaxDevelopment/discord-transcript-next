import { escapeHtml, markdownToHtml } from "../core/markdown.js";
import { DEFAULT_OPTIONS } from "../config.js";
import type {
  NormalizedMessage,
  NormalizedTranscriptData,
  TranscriptComponentElement,
  TranscriptOptions,
  ThemeDefinition
} from "../types/index.js";
import { $ } from "kleur/colors";

interface HtmlRenderOptions extends TranscriptOptions {
  theme: ThemeDefinition;
}

function formatTimestamp(
  timestamp: string,
  locale?: string,
  timezone?: string
): string {
  try {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const formatter = new Intl.DateTimeFormat(locale ?? "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone
      });
      return formatter.format(new Date(timestamp));
    }
  } catch {
    // fall through to ISO format
  }
  return new Date(timestamp).toISOString();
}

function renderReactions(message: NormalizedMessage): string {
  if (!message.reactions?.length) return "";
  const items = message.reactions
    .map((reaction) => {
      const emoji = reaction.emoji?.id
        ? `<img data-emoji-id="${reaction.emoji.id}" alt="${escapeHtml(
            reaction.emoji.name ?? "emoji"
          )}" />`
        : escapeHtml(reaction.emoji?.name ?? "");
      return `<div class="reaction">${emoji}<span class="reaction-count">${reaction.count}</span></div>`;
    })
    .join("");
  return `<div class="message-reactions">${items}</div>`;
}

function renderAttachments(message: NormalizedMessage): string {
  if (!message.attachments?.length) return "";
  const html = message.attachments
    .map((attachment) => {
      const isImage = attachment.contentType?.startsWith("image/");
      if (isImage) {
        return `<figure class="attachment attachment-image">
  <img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(
          attachment.name
        )}" loading="lazy" />
</figure>`;
      }
      return `<a class="attachment attachment-file" href="${escapeHtml(
        attachment.url
      )}" target="_blank" rel="noreferrer">${escapeHtml(attachment.name)}</a>`;
    })
    .join("");
  return `<div class="attachments">${html}</div>`;
}

function renderEmbeds(message: NormalizedMessage): string {
  if (!message.embeds?.length) return "";
  const html = message.embeds
    .map((embed) => {
      const colorStyle = embed.color
        ? `style="border-color: #${embed.color.toString(16).padStart(6, "0")}"`
        : "";
      const fields =
        embed.fields
          ?.map(
            (field) => `<div class="embed-field${field.inline ? " inline" : ""}">
    <div class="embed-field-name">${escapeHtml(field.name)}</div>
    <div class="embed-field-value">${markdownToHtml(field.value)}</div>
  </div>`
          )
          .join("") ?? "";
      return `<div class="embed" ${colorStyle}>
  ${
    embed.author
      ? `<div class="embed-author">${escapeHtml(embed.author.name)}</div>`
      : ""
  }
  ${embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : ""}
  ${
    embed.description
      ? `<div class="embed-description">${markdownToHtml(embed.description)}</div>`
      : ""
  }
  ${fields}
</div>`;
    })
    .join("");
  return `<div class="embeds">${html}</div>`;
}

function mapButtonClass(style?: string): string {
  switch (style) {
    case "primary":
      return " component-button--primary";
    case "secondary":
      return " component-button--secondary";
    case "success":
      return " component-button--success";
    case "danger":
      return " component-button--danger";
    case "link":
      return " component-button--link";
    default:
      return "";
  }
}

function renderComponentBuilder(message: NormalizedMessage): string {
  if (!message.components?.length) return "";
  const content = message.components
    .map((component) => renderComponentNode(component))
    .filter(Boolean)
    .join("");
  if (!content) return "";
  return `<div class="component-builder">${content}</div>`;
}

function renderSkyraComponentRows(message: NormalizedMessage): string {
  if (!message.components?.length) return "";
  return message.components
    .map((component) => renderSkyraNode(component))
    .filter(Boolean)
    .join("");
}

function renderSkyraNode(component: any): string {
  if (!component) return "";
  if (component.type === "actionRow") {
    const children = Array.isArray(component.components)
      ? component.components
          .map((child: any) => renderSkyraElement(child as TranscriptComponentElement))
          .filter(Boolean)
          .join("")
      : "";
    if (!children) return "";
    return `<discord-action-row>${children}</discord-action-row>`;
  }
  // Allow nested action rows through recursion if present
  if (Array.isArray((component as any)?.components)) {
    return renderSkyraNode({ type: "actionRow", components: (component as any).components });
  }
  return "";
}

function mapSkyraButtonType(style?: string): string | undefined {
  switch (style) {
    case "primary":
      return "primary";
    case "secondary":
      return "secondary";
    case "success":
      return "success";
    case "danger":
      return "destructive";
    case "link":
      return "link";
    default:
      return undefined;
  }
}

function renderSkyraElement(component: TranscriptComponentElement): string {
  if (component.type === "button") {
    const attrs: string[] = [];
    const type = mapSkyraButtonType(component.style);
    if (type) {
      attrs.push(`type="${type}"`);
    }
    if (component.disabled) {
      attrs.push("disabled");
    }
    if (component.style === "link" && component.url) {
      attrs.push(`url="${escapeHtml(component.url)}"`);
    }
    const attrString = attrs.length ? ` ${attrs.join(" ")}` : "";
    const emojiLabel =
      component.emoji?.name ??
      (component.emoji?.id ? `:${component.emoji.id}:` : undefined);
    const label = component.label ?? emojiLabel ?? "Button";
    return `<discord-button${attrString}>${escapeHtml(label)}</discord-button>`;
  }

  if (component.type === "select") {
    const attrs: string[] = [];
    if (component.placeholder) {
      attrs.push(`placeholder="${escapeHtml(component.placeholder)}"`);
    }
    if (typeof component.minValues === "number") {
      attrs.push(`min-values="${component.minValues}"`);
    }
    if (typeof component.maxValues === "number") {
      attrs.push(`max-values="${component.maxValues}"`);
    }
    if (component.disabled) {
      attrs.push("disabled");
    }
    const options = component.options
      ?.map((option) => {
        const optionAttrs: string[] = [];
        if (option.label) optionAttrs.push(`label="${escapeHtml(option.label)}"`);
        const value = option.value ?? option.label ?? "option";
        optionAttrs.push(`value="${escapeHtml(value)}"`);
        if (option.description) optionAttrs.push(`description="${escapeHtml(option.description)}"`);
        const emoji = option.emoji?.name ?? (option.emoji?.id ? `:${option.emoji.id}:` : undefined);
        if (emoji) optionAttrs.push(`emoji="${escapeHtml(emoji)}"`);
        if (option.default) optionAttrs.push("default");
        const optionAttrString = optionAttrs.length ? ` ${optionAttrs.join(" ")}` : "";
        return `<discord-select-menu-option${optionAttrString}></discord-select-menu-option>`;
      })
      .filter(Boolean)
      .join("") ?? "";
    const attrString = attrs.length ? ` ${attrs.join(" ")}` : "";
    return `<discord-select-menu${attrString}>${options}</discord-select-menu>`;
  }

  return "";
}

function renderSkyraMessage(
  message: NormalizedMessage,
  options: HtmlRenderOptions
): string {
  const attrs: string[] = [];
  attrs.push(`author="${escapeHtml(message.author?.username ?? "Unknown User")}"`);
  if (message.author?.avatar) {
    attrs.push(`avatar="${escapeHtml(message.author.avatar)}"`);
  }
  if (message.author?.bot) {
    attrs.push("bot");
  }
  const timestamp = message.timestamp ? escapeHtml(message.timestamp) : undefined;
  if (timestamp) {
    attrs.push(`timestamp="${timestamp}"`);
  }
  const attrString = attrs.length ? ` ${attrs.join(" ")}` : "";

  const segments: string[] = [];
  if (message.content) {
    segments.push(`<discord-markdown>${escapeHtml(message.content)}</discord-markdown>`);
  }
  if (options.includeEmbeds !== false && message.embeds?.length) {
    segments.push(`<discord-embed slot="embeds">Embeds are available in fallback export.</discord-embed>`);
  }
  const componentRows = renderSkyraComponentRows(message);
  if (componentRows) {
    segments.push(componentRows);
  }
  return `<discord-message${attrString}>${segments.join("")}</discord-message>`;
}

function renderSkyraDivider(day: string): string {
  return `<discord-divider>${escapeHtml(day)}</discord-divider>`;
}

function renderComponentNode(component: any): string {
  if (!component) return "";
  if (component.type === "actionRow") {
    const heading = deriveRowHeading(component);
    const childrenMarkup = Array.isArray(component.components)
      ? component.components
          .map((child) => renderComponentElement(child as TranscriptComponentElement))
          .filter(Boolean)
          .join("")
      : "";
    if (!childrenMarkup) return "";
    const hasSelect = Array.isArray(component.components)
      ? component.components.some((child: any) => child?.type === "select")
      : false;
    const rowClass = hasSelect
      ? "component-builder__row component-builder__row--select"
      : "component-builder__row";
    return `<div class="${rowClass}">
      <div class="component-builder__row-header">
        <span class="component-builder__grip" aria-hidden="true">⋮⋮</span>
        <span class="component-builder__row-title">${heading}</span>
        <span class="component-builder__row-actions" aria-hidden="true">✖</span>
      </div>
      <div class="component-builder__row-body">${childrenMarkup}</div>
    </div>`;
  }
  return renderComponentElement(component as TranscriptComponentElement);
}

function deriveRowHeading(component: any): string {
  if (!Array.isArray(component?.components) || component.components.length === 0) {
    return "Action row";
  }
  const primary = component.components.find(
    (child: any) => child?.type === "select" || child?.type === "button"
  );
  switch (primary?.type) {
    case "select":
      return "Select menu row";
    case "button":
      return "Action row";
    default:
      return "Action row";
  }
}

function renderComponentElement(component: TranscriptComponentElement): string {
  if (component.type === "button") {
    const style = typeof component.style === "string" ? component.style : undefined;
    const classes = `component-button${mapButtonClass(style)}`;
    const label = escapeHtml(component.label ?? "Button");
    const emojiLabel =
      component.emoji?.name ??
      (component.emoji?.id ? `:${component.emoji.id}:` : undefined);
    const emoji = emojiLabel
      ? `<span class="component-emoji">${escapeHtml(emojiLabel)}</span>`
      : "";
    const disabledAttr = component.disabled ? " disabled aria-disabled=\"true\"" : "";
    const ariaDisabled = component.disabled ? " aria-disabled=\"true\"" : "";
    if (component.style === "link" && component.url) {
      return `<a class="${classes}" href="${escapeHtml(
        component.url
      )}" target="_blank" rel="noreferrer"${ariaDisabled}>${emoji}${label}</a>`;
    }
    return `<button type="button" class="${classes}"${disabledAttr}>${emoji}${label}</button>`;
  }

  if (component.type === "select") {
    const placeholderRaw = component.placeholder?.trim();
    const placeholder = placeholderRaw && placeholderRaw.length > 0 ? placeholderRaw : "Select menu";
    const metaRange =
      component.minValues || component.maxValues
        ? `${component.minValues ?? 1}-${component.maxValues ?? (component.options?.length ?? 1)}`
        : undefined;
    const options = component.options
      ?.map((option) => {
        const optionText = option.label ?? option.value ?? "Option";
        const optionEmoji =
          option.emoji?.name ??
          (option.emoji?.id ? `:${option.emoji.id}:` : undefined);
        const label = escapeHtml(
          optionEmoji ? `${optionEmoji} ${optionText}` : optionText
        );
        const description = option.description
          ? `<div class="component-select-option__description">${escapeHtml(option.description)}</div>`
          : "";
        const stateClass = option.default ? " is-selected" : "";
        return `<div class="component-select-option${stateClass}">
    <div class="component-select-option__content">
      <span class="component-select-option__label">${label}</span>
      ${description}
    </div>
  </div>`;
      })
      .join("") ?? "";
    return `<div class="component-select-card">
  <div class="component-select-card__header">
    <span class="component-select-card__title">${escapeHtml(placeholder)}</span>
    ${
      metaRange
        ? `<span class="component-select-card__meta">${escapeHtml(metaRange)}</span>`
        : ""
    }
  </div>
  <div class="component-select-card__slot">
    <span class="component-select-card__slot-icon">⚙️</span>
    <span class="component-select-card__slot-text">Global settings</span>
  </div>
  <div class="component-select-card__options">${options}</div>
  <div class="component-select-card__footer">
    <span class="component-select-card__footer-icon">➕</span>
    <span class="component-select-card__footer-text">New option</span>
  </div>
</div>`;
  }

  if (component.type === "textInput") {
    const label = escapeHtml(component.label ?? "Input");
    const placeholder = escapeHtml(component.placeholder ?? "Text input");
    return `<label class="component-text-input">
  <span class="component-text-input__label">${label}</span>
  <input type="text" placeholder="${placeholder}" disabled />
</label>`;
  }

  if (component.type === "text" || component.type === "paragraph") {
    const rawContent =
      typeof (component as any)?.content === "string" ? (component as any).content : "";
    const content = markdownToHtml(rawContent);
    const isError = rawContent.trim().toLowerCase().startsWith("error");
    return `<div class="component-builder__text${isError ? " component-builder__text--error" : ""}">${content}</div>`;
  }

  if (component.type === "file") {
    const file = (component as any)?.file;
    const rawUrl = typeof file?.url === "string" ? file.url : undefined;
    const url = rawUrl ? escapeHtml(rawUrl) : "#";
    const label = rawUrl ? escapeHtml(rawUrl.split("/").pop() ?? rawUrl) : "Download file";
    return `<div class="component-file-card">
  <span class="component-file-card__icon">📎</span>
  <a href="${url}" target="_blank" rel="noreferrer" class="component-file-card__link">${label}</a>
</div>`;
  }

  if (component.type === "mediaGallery") {
    const items: unknown[] = Array.isArray((component as any)?.items)
      ? (component as any).items
      : [];
    const gallery = items
      .map((item: any) => {
        const mediaUrl = item?.media?.url;
        if (typeof mediaUrl !== "string") return "";
        return `<figure class="component-media"><img src="${escapeHtml(
          mediaUrl
        )}" alt="Media item" loading="lazy" /></figure>`;
      })
      .filter(Boolean)
      .join("");
    const actions = `<div class="component-media-actions">
      <button type="button" class="component-media-action">Add content</button>
      <button type="button" class="component-media-action component-media-action--ghost">🔗</button>
      <button type="button" class="component-media-action component-media-action--ghost">👁️</button>
    </div>`;
    return gallery
      ? `<div class="component-media-panel">
          <div class="component-media-gallery">${gallery}</div>
          ${actions}
        </div>`
      : "";
  }

  if ((component as any)?.components) {
    return renderSkyraNode(component as any);
  }

  return `<div class="component-unknown">${escapeHtml(component.type)}</div>`;
}

function renderFallbackMessage(
  message: NormalizedMessage,
  options: HtmlRenderOptions
): string {
  const fallbackIndex = message.author?.id
    ? Math.abs(
        Array.from(message.author.id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % 5
    : 0;
  return `<article class="message" data-message-id="${message.id}">
  <div class="avatar">
    <img src="${escapeHtml(
      message.author?.avatar ??
        `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`
    )}" alt="${escapeHtml(message.author?.username ?? "User avatar")}" loading="lazy" />
  </div>
  <div class="message-body">
    <header class="message-header">
      <span class="author-name">${escapeHtml(message.author?.username ?? "Unknown User")}</span>
      ${message.author?.bot ? '<span class="author-badge">BOT</span>' : ""}
      <time class="timestamp" datetime="${message.timestamp}">
        ${escapeHtml(formatTimestamp(message.timestamp, options.locale, options.timezone))}
      </time>
    </header>
    <div class="message-content">${markdownToHtml(message.content)}</div>
    ${options.includeEmbeds !== false ? renderEmbeds(message) : ""}
    ${options.includeReactions !== false ? renderReactions(message) : ""}
    ${renderComponentBuilder(message)}
    ${renderAttachments(message)}
  </div>
</article>`;
}

function renderDayDivider(day: string): string {
  return `<div class="day-divider"><span>${escapeHtml(day)}</span></div>`;
}

function renderMessages(
  data: NormalizedTranscriptData,
  options: HtmlRenderOptions
): { fallback: string; skyra?: string } {
  let previousDay: string | null = null;
  const fallbackParts: string[] = [];
  const skyraParts: string[] = [];
  const useSkyra = options.componentRenderer !== "native";

  for (const message of data.messages) {
    if (message.dayBucket !== previousDay) {
      previousDay = message.dayBucket;
      fallbackParts.push(renderDayDivider(message.dayBucket));
      if (useSkyra) {
        skyraParts.push(renderSkyraDivider(message.dayBucket));
      }
    }
    fallbackParts.push(renderFallbackMessage(message, options));
    if (useSkyra) {
      const skyraMessage = renderSkyraMessage(message, options);
      if (skyraMessage) {
        skyraParts.push(skyraMessage);
      }
    }
  }

  return {
    fallback: fallbackParts.join(""),
    skyra: useSkyra && skyraParts.length > 0
      ? `<discord-messages>${skyraParts.join("")}</discord-messages>`
      : undefined
  };
}

const BASE_STYLES = `
body {
  background-color: var(--background-secondary);
}
.transcript {
  max-width: 820px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}
.header {
  margin-bottom: 1.5rem;
}
.controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.controls input[type="search"] {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--interactive-hover);
  background: var(--background-secondary-alt);
  color: inherit;
}
.message {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
.messages-fallback {
  display: block;
}
.messages-fallback--hidden {
  display: block;
}
body.skyra-components-ready .messages-fallback--hidden {
  display: none;
}
.message:hover {
  background: var(--background-secondary-alt);
}
.avatar img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}
.author-name {
  font-weight: 600;
}
.author-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 0.4rem;
  margin-left: 0.4rem;
  border-radius: 4px;
  background: #5865f2;
  color: white;
  font-size: 0.65rem;
  text-transform: uppercase;
}
.timestamp {
  margin-left: 0.5rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}
.message-content p {
  margin: 0.2rem 0;
  line-height: 1.45;
}
.message-content code {
  background: rgba(79, 84, 92, 0.24);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}
.message-reactions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.4rem;
}
.reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--background-secondary-alt);
  border-radius: 16px;
}
.attachments {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.4rem;
}
.attachment-image img {
  max-width: 480px;
  border-radius: 8px;
}
.embed {
  border-left: 4px solid #5865f2;
  background: rgba(46, 48, 54, 0.4);
  padding: 0.6rem;
  border-radius: 4px;
  margin-top: 0.4rem;
}
.embed-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.embed-field {
  margin-top: 0.25rem;
}
.embed-field.inline {
  display: inline-block;
  min-width: 160px;
  margin-right: 1rem;
}
.day-divider {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  gap: 0.5rem;
  margin: 1.5rem 0;
}
.day-divider::before,
.day-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--interactive-hover);
}
.spoiler {
  background: var(--background-secondary-alt);
  color: transparent;
  border-radius: 4px;
  padding: 0 0.4rem;
  transition: color 0.2s ease;
}
.spoiler:hover {
  color: inherit;
}
.mention {
  padding: 0.1rem 0.3rem;
  background: var(--mention-background);
  border-radius: 3px;
  border: 1px solid var(--mention-border);
  color: #ebeef9;
}
.component-builder {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--interactive-hover);
  background: var(--background-secondary-alt);
}
body.skyra-components-ready .component-builder[data-hidden="true"] {
  display: none;
}
.component-builder__row {
  border-radius: 6px;
  border: 1px solid var(--interactive-hover);
  background: var(--background-secondary);
  overflow: hidden;
}
.component-builder__row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(78, 80, 88, 0.45);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.component-builder__grip {
  cursor: grab;
  opacity: 0.5;
  font-size: 0.85rem;
}
.component-builder__row-title {
  flex: 1;
  font-weight: 600;
}
.component-builder__row-actions {
  opacity: 0.5;
  cursor: pointer;
}
.component-builder__row-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.6rem;
}
.component-builder__row--select .component-builder__row-body {
  flex-direction: column;
  align-items: stretch;
}
.component-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  background: #4f545c;
  color: #fff;
  text-decoration: none;
  transition: filter 0.15s ease;
}
.component-button:hover {
  filter: brightness(1.1);
}
.component-button--primary {
  background: #5865f2;
}
.component-button--secondary {
  background: #4f545c;
}
.component-button--success {
  background: #3ba55c;
}
.component-button--danger {
  background: #ed4245;
}
.component-button--link {
  background: transparent;
  color: #00aff4;
  text-decoration: underline;
}
.component-button[aria-disabled="true"],
.component-button--link[aria-disabled="true"] {
  opacity: 0.6;
  cursor: not-allowed;
}
.component-emoji {
  font-size: 1rem;
}
.component-text-input {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  background: var(--background-secondary-alt);
  border: 1px solid var(--interactive-hover);
}
.component-text-input input {
  padding: 0.45rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--interactive-hover);
  background: var(--background-secondary);
  color: inherit;
}
.component-builder__text {
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  background: var(--background-secondary);
  border: 1px solid var(--interactive-hover);
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
}
.component-builder__text--error {
  color: #f23f43;
  border-color: rgba(242, 63, 67, 0.6);
  background: rgba(242, 63, 67, 0.1);
}
.component-select-card {
  border: 1px solid var(--interactive-hover);
  border-radius: 6px;
  background: var(--background-secondary);
  display: grid;
  gap: 0.45rem;
  padding: 0.5rem 0.6rem;
}
.component-select-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.component-select-card__title {
  font-weight: 600;
}
.component-select-card__meta {
  background: var(--background-secondary-alt);
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
}
.component-select-card__slot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.5rem;
  border-radius: 6px;
  background: rgba(78, 80, 88, 0.35);
  color: var(--text-muted);
  font-size: 0.75rem;
}
.component-select-card__slot-icon {
  font-size: 0.85rem;
}
.component-select-card__slot-text {
  font-weight: 600;
}
.component-select-card__options {
  display: grid;
  gap: 0.35rem;
}
.component-select-option {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  background: var(--background-secondary-alt);
  transition: background 0.15s ease, border 0.15s ease;
}
.component-select-option.is-selected {
  border-color: #5865f2;
  background: rgba(88, 101, 242, 0.2);
}
.component-select-option__content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.component-select-option__label {
  font-weight: 600;
  font-size: 0.85rem;
}
.component-select-option__description {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.component-select-card__footer {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.45rem;
  border-radius: 6px;
  border: 1px dashed var(--interactive-hover);
  font-size: 0.8rem;
  color: var(--text-muted);
}
.component-select-card__footer-icon {
  font-size: 0.85rem;
}
.component-select-card__footer-text {
  font-weight: 600;
}
.component-file-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem;
  border-radius: 6px;
  background: var(--background-secondary);
  border: 1px solid var(--interactive-hover);
}
.component-file-card__icon {
  font-size: 1.1rem;
}
.component-file-card__link {
  color: #00aff4;
  text-decoration: underline;
  word-break: break-all;
}
.component-media-panel {
  display: grid;
  gap: 0.5rem;
}
.component-media-gallery {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.component-media {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--interactive-hover);
  background: var(--background-secondary);
}
.component-media img {
  display: block;
  max-width: 150px;
  height: auto;
}
.component-media-actions {
  display: flex;
  gap: 0.4rem;
}
.component-media-action {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--interactive-hover);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
}
.component-media-action--ghost {
  width: 32px;
  text-align: center;
}
.component-unknown {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  background: var(--background-secondary-alt);
  color: var(--text-muted);
  font-size: 0.75rem;
}
`;

const SCRIPT = `
(() => {
  const searchInput = document.querySelector('[data-search]');
  const messages = Array.from(document.querySelectorAll('.message'));
  const counter = document.querySelector('[data-results-count]');
  const paginationSize = Number(document.body.dataset.paginationSize || 0);
  const paginator = document.querySelector('[data-paginator]');
  const pageInfo = document.querySelector('[data-page-info]');
  let currentPage = 0;

  function applySearch() {
    const term = (searchInput && searchInput.value ? searchInput.value : "")
      .toLowerCase()
      .trim();
    messages.forEach((msg) => {
      const textContent = msg.textContent ? msg.textContent.toLowerCase() : "";
      const matches = term ? textContent.includes(term) : true;
      msg.dataset.match = matches ? "1" : "0";
    });
    updatePagination();
  }

  function updatePagination() {
    const activeMessages = messages.filter((msg) => msg.dataset.match !== "0");
    if (!paginationSize || activeMessages.length <= paginationSize) {
      activeMessages.forEach((msg) => {
        msg.style.display = "";
      });
      messages
        .filter((msg) => msg.dataset.match === "0")
        .forEach((msg) => {
          msg.style.display = "none";
        });
      if (paginator) paginator.style.display = "none";
      if (counter) counter.textContent = String(activeMessages.length);
      return;
    }
    if (paginator) paginator.style.display = "";
    const pages = Math.ceil(activeMessages.length / paginationSize);
    if (currentPage >= pages) currentPage = pages - 1;
    if (currentPage < 0) currentPage = 0;
    activeMessages.forEach((msg, index) => {
      const pageIndex = Math.floor(index / paginationSize);
      msg.style.display = pageIndex === currentPage ? "" : "none";
    });
    if (counter) counter.textContent = String(activeMessages.length);
    if (pageInfo) pageInfo.textContent = "Page " + (currentPage + 1) + " / " + pages;
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target || !(target instanceof HTMLElement)) return;
    if (target.matches('[data-action="prev"]')) {
      currentPage -= 1;
      updatePagination();
    } else if (target.matches('[data-action="next"]')) {
      currentPage += 1;
      updatePagination();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 0;
      applySearch();
    });
  }

  applySearch();
})();
`;

export function renderHtml(
  data: NormalizedTranscriptData,
  options: HtmlRenderOptions
): string {
  const componentRenderer =
    options.componentRenderer ?? DEFAULT_OPTIONS.componentRenderer;
  const resolvedOptions: HtmlRenderOptions = {
    ...options,
    componentRenderer
  };
  const paginationSize =
    options.pagination === true
      ? 25
      : typeof options.pagination === "number"
      ? options.pagination
      : 0;

  const renderedMessages = renderMessages(data, resolvedOptions);
  const fallbackMessages = renderedMessages.fallback;
  const skyraMessages = renderedMessages.skyra ?? "";
  const fallbackWrapperClass = renderedMessages.skyra
    ? "messages-fallback messages-fallback--hidden"
    : "messages-fallback";
  const customCss = options.customCss ? `<style>${options.customCss}</style>` : "";
  const shouldLoadSkyra =
    componentRenderer !== "native" &&
    data.messages.some((message) => message.components?.length);

  const skyraAssets = shouldLoadSkyra
    ? ((): string[] => {
        const entries = [,
          "https://unpkg.com/@skyra/discord-components-core@4?module"
        ];

        const componentFiles = [
          "discord-action-row/DiscordActionRow.js",
          "discord-attachments/DiscordAttachments.js",
          "discord-audio-attachment/DiscordAudioAttachment.js",
          "discord-author-info/DiscordAuthorInfo.js",
          "discord-bold/DiscordBold.js",
          "discord-button/DiscordButton.js",
          "discord-code/DiscordCode.js",
          "discord-command/DiscordCommand.js",
          "discord-custom-emoji/DiscordCustomEmoji.js",
          "discord-embed/DiscordEmbed.js",
          "discord-embed-description/DiscordEmbedDescription.js",
          "discord-embed-field/DiscordEmbedField.js",
          "discord-embed-fields/DiscordEmbedFields.js",
          "discord-embed-footer/DiscordEmbedFooter.js",
          "discord-file-attachment/DiscordFileAttachment.js",
          "discord-header/DiscordHeader.js",
          "discord-image-attachment/DiscordImageAttachment.js",
          "discord-input-text/DiscordInputText.js",
          "discord-invite/DiscordInvite.js",
          "discord-italic/DiscordItalic.js",
          "discord-link/DiscordLink.js",
          "discord-list-item/DiscordListItem.js",
          "discord-mention/DiscordMention.js",
          "discord-message/DiscordMessage.js",
          "discord-messages/DiscordMessages.js",
          "discord-modal/DiscordModal.js",
          "discord-ordered-list/DiscordOrderedList.js",
          "discord-poll/DiscordPoll.js",
          "discord-poll-answer/DiscordPollAnswer.js",
          "discord-pre/DiscordPre.js",
          "discord-quote/DiscordQuote.js",
          "discord-reaction/DiscordReaction.js",
          "discord-reactions/DiscordReactions.js",
          "discord-reply/DiscordReply.js",
          "discord-spoiler/DiscordSpoiler.js",
          "discord-string-select-menu/DiscordStringSelectMenu.js",
          "discord-string-select-menu-option/DiscordStringSelectMenuOption.js",
          "discord-subscript/DiscordSubscript.js",
          "discord-system-message/DiscordSystemMessage.js",
          "discord-tenor-video/DiscordTenorVideo.js",
          "discord-thread/DiscordThread.js",
          "discord-thread-message/DiscordThreadMessage.js",
          "discord-time/DiscordTime.js",
          "discord-underlined/DiscordUnderlined.js",
          "discord-unordered-list/DiscordUnorderedList.js",
          "discord-verified-author-tag/DiscordVerifiedAuthorTag.js",
          "discord-video-attachment/DiscordVideoAttachment.js"
        ];

        const hosts = [
          "https://unpkg.com/@skyra/discord-components-core@4?module"
        ];

        const loaderLines: string[] = [];

        loaderLines.push("(async () => {");
        loaderLines.push("  try {");
        loaderLines.push("    let loaded = false;");
        loaderLines.push(
          "    const entries = " + JSON.stringify(entries, null, 2) + ";"
        );
        loaderLines.push(
          "    for (const url of entries) { try { await import(url); loaded = true; break; } catch (e) { console.warn('entry import failed', url, e); } }"
        );
        loaderLines.push("    if (!loaded) {");
        loaderLines.push(
          "      const hosts = " + JSON.stringify(hosts, null, 2) + ";"
        );
        loaderLines.push(
          "      const componentFiles = " + JSON.stringify(componentFiles, null, 2) + ";"
        );
        loaderLines.push("      for (const host of hosts) {");
        loaderLines.push("        try {");
        loaderLines.push("          const base = (host.split('?')[0] || host).replace(/\\/$/, '');");
        loaderLines.push("          await Promise.all(componentFiles.map(async (p) => {");
        loaderLines.push("            const candidates = [");
        loaderLines.push("              base + '/components/' + p,");

        loaderLines.push("              base + '/dist/components/' + p,");

        loaderLines.push("              base + '/' + p,");

        loaderLines.push("              base + '/dist/' + p");

        loaderLines.push("            ];");
        loaderLines.push("            let ok = false;");
        loaderLines.push("            for (const url of candidates) {");
        loaderLines.push("              try { await import(url); ok = true; break; } catch {}");
        loaderLines.push("            }");
        loaderLines.push("            if (!ok) throw new Error('Component not found: ' + p);");
        loaderLines.push("          }));");
        loaderLines.push("          loaded = true;");
        loaderLines.push("          break;");
        loaderLines.push("        } catch (err) { console.warn('component batch failed', host, err); }");
        loaderLines.push("      }");
        loaderLines.push("    }");
        loaderLines.push("    document.addEventListener('DOMContentLoaded', () => {");
        loaderLines.push("      if (customElements.get('discord-message')) document.body.classList.add('skyra-components-ready');");
        loaderLines.push("      else document.body.classList.remove('skyra-components-ready');");
        loaderLines.push("    });");
        loaderLines.push("    if (!loaded) console.warn('Skyra load attempts failed');");
        loaderLines.push("  } catch (e) { console.error(e); }");
        loaderLines.push("})();");

        return ["<script type=\"module\">", loaderLines.join("\n"), "</script>"];
      })()
    : [];


  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(options.locale ?? "en")}">`,
    "<head>",
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>Discord Transcript</title>`,
    `<style>${options.theme.css}${BASE_STYLES}</style>`,
    ...skyraAssets,
    customCss,
    "</head>",
    `<body data-pagination-size="${paginationSize}">`,
    `<main class="transcript">`,
    `<section class="header">`,
    `<h1>discord-transcript-next</h1>`,
    `<p class="meta">Messages: ${data.messages.length} • Generated: ${escapeHtml(
      formatTimestamp(data.generatedAt, options.locale, options.timezone)
    )}</p>`,
    options.searchUI === false
      ? ""
      : `<div class="controls">
    <input type="search" placeholder="Search messages" data-search aria-label="Search messages" />
    ${
      paginationSize
        ? `<div class="pagination-controls" data-paginator>
        <button type="button" data-action="prev">Previous</button>
        <span data-page-info></span>
        <button type="button" data-action="next">Next</button>
      </div>`
        : ""
    }
    <span class="results-meta">Results: <strong data-results-count>0</strong></span>
  </div>`,
    "</section>",
    `<section class="messages">`,
   // skyraMessages,
    `<div class="${fallbackWrapperClass}">${fallbackMessages}</div>`,
    `</section>`,
    "</main>",
    `<script>${SCRIPT}</script>`,
    "</body>",
    "</html>"
  ]
    .filter(Boolean)
    .join("");
}
