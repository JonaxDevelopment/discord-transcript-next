import { fetchMessagesViaAdapter } from "../adapters/index.js";
import { DEFAULT_OPTIONS } from "../config.js";
import type {
  FetchOptions,
  MessageLike,
  NormalizedMessage,
  NormalizedTranscriptData,
  TranscriptComponent,
  TranscriptComponentElement,
  TranscriptOptions,
  TranscriptSource
} from "../types/index.js";
import { groupByDay, sortMessages, toISOString } from "./utils.js";

function isMessageArraySource(source: TranscriptSource): source is MessageLike[] {
  return Array.isArray(source);
}

function isMessageFetcher(source: TranscriptSource): source is () => Promise<MessageLike[]> {
  return typeof source === "function";
}

function normalizeComponentType(type: unknown): string {
  if (typeof type === "string") return type;
  switch (type) {
    case 1:
      return "actionRow";
    case 2:
      return "button";
    case 3:
      return "select";
    case 4:
      return "textInput";
    case 10:
      return "text";
    case 11:
      return "paragraph";
    case 12:
      return "mediaGallery";
    case 13:
      return "file";
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return "select";
    default:
      return String(type ?? "unknown");
  }
}

function mapSelectType(type: unknown): string | undefined {
  if (typeof type === "string") return type;
  switch (type) {
    case 3:
      return "stringSelect";
    case 5:
      return "userSelect";
    case 6:
      return "roleSelect";
    case 7:
      return "mentionableSelect";
    case 8:
      return "channelSelect";
    case 9:
      return "attachmentSelect";
    default:
      return undefined;
  }
}

function normalizeButtonStyle(style: unknown): string | undefined {
  if (typeof style === "string") return style;
  switch (style) {
    case 1:
      return "primary";
    case 2:
      return "secondary";
    case 3:
      return "success";
    case 4:
      return "danger";
    case 5:
      return "link";
    default:
      return undefined;
  }
}

function normalizeComponentElement(component: any): TranscriptComponentElement {
  const type = normalizeComponentType(component?.type);
  if (type === "button") {
    return {
      type: "button",
      style: normalizeButtonStyle(component?.style),
      label: component?.label ?? undefined,
      emoji: component?.emoji ?? component?.partialEmoji,
      url: component?.url ?? undefined,
      customId: component?.custom_id ?? component?.customId ?? undefined,
      disabled: Boolean(component?.disabled)
    };
  }
  if (type === "select") {
    return {
      type: "select",
      selectType:
        mapSelectType(component?.type) ?? component?.componentType ?? type,
      placeholder: component?.placeholder ?? undefined,
      options: Array.isArray(component?.options)
        ? component.options.map((option: any) => ({
            label: option?.label ?? undefined,
            value: option?.value ?? undefined,
            description: option?.description ?? undefined,
            emoji: option?.emoji ?? undefined,
            default: option?.default ?? undefined
          }))
        : undefined,
      disabled: Boolean(component?.disabled),
      minValues: component?.min_values ?? component?.minValues ?? undefined,
      maxValues: component?.max_values ?? component?.maxValues ?? undefined
    };
  }
  if (type === "textInput") {
    return {
      type: "textInput",
      style:
        component?.style === 1
          ? "short"
          : component?.style === 2
          ? "paragraph"
          : component?.style,
      label: component?.label ?? undefined,
      placeholder: component?.placeholder ?? undefined,
      value: component?.value ?? undefined,
      required: component?.required ?? undefined,
      minLength: component?.min_length ?? component?.minLength ?? undefined,
      maxLength: component?.max_length ?? component?.maxLength ?? undefined
    };
  }
  const copy = { ...(component ?? {}) } as Record<string, unknown>;
  delete (copy as any).type;
  return {
    ...copy,
    type
  } as TranscriptComponentElement;
}

function normalizeComponents(raw: unknown): TranscriptComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((component) => {
    const type = normalizeComponentType((component as any)?.type);
    if (type === "actionRow") {
      const { type: _ignoredType, components: rawChildren, ...rest } =
        (component as any) ?? {};
      const children = Array.isArray(rawChildren)
        ? rawChildren.map((child: unknown) => normalizeComponentElement(child))
        : [];
      return {
        type,
        components: children,
        ...rest
      };
    }
    const element = normalizeComponentElement(component);
    return {
      ...element
    } as TranscriptComponent;
  });
}

function normalizeMessage(message: MessageLike): NormalizedMessage {
  const timestamp = toISOString(message.timestamp);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const embeds = Array.isArray(message.embeds) ? message.embeds : [];
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const components = normalizeComponents(message.components);
  return {
    ...message,
    timestamp,
    editedTimestamp: message.editedTimestamp
      ? toISOString(message.editedTimestamp)
      : null,
    attachments,
    embeds,
    reactions,
    components,
    dayBucket: groupByDay(timestamp)
  };
}

async function fromAsyncIterable(
  iterable: AsyncIterable<MessageLike>
): Promise<MessageLike[]> {
  const items: MessageLike[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

async function resolveSource(
  source: TranscriptSource,
  fetchOptions?: FetchOptions
): Promise<{ messages: MessageLike[]; adapter?: string }> {
  if (isMessageArraySource(source)) {
    return { messages: [...source], adapter: fetchOptions?.adapter };
  }

  if (isMessageFetcher(source)) {
    const result = await source();
    if (Symbol.asyncIterator in Object(result)) {
      const messages = await fromAsyncIterable(result as AsyncIterable<MessageLike>);
      return { messages, adapter: fetchOptions?.adapter };
    }
    return {
      messages: Array.isArray(result) ? [...result] : [],
      adapter: fetchOptions?.adapter
    };
  }

  if (source && typeof source === "object") {
    return fetchMessagesViaAdapter(source, fetchOptions);
  }

  throw new Error("Unsupported transcript source.");
}

export async function collectNormalizedMessages(
  options: TranscriptOptions
): Promise<NormalizedTranscriptData> {
  const { source, fetchOptions, limit, sort = DEFAULT_OPTIONS.sort } = options;
  const { messages, adapter } = await resolveSource(source, {
    ...fetchOptions,
    limit: limit ?? fetchOptions?.limit ?? DEFAULT_OPTIONS.limit
  });

  const normalized = messages.map((message) => normalizeMessage(message));
  const trimmed =
    typeof limit === "number" ? normalized.slice(0, limit) : normalized;
  const ordered = sortMessages(trimmed, sort);

  return {
    messages: ordered,
    generatedAt: new Date().toISOString(),
    adapter
  };
}
