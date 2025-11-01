export type TranscriptFormat = "html" | "json" | "markdown" | "pdf";

export type TranscriptFormatSelection = TranscriptFormat | TranscriptFormat[] | "all";

export type BuiltInThemeName = "dark" | "light";

export interface ThemeDefinition {
  name: string;
  css: string;
}

export type TranscriptTheme = BuiltInThemeName | ThemeDefinition;

export interface TranscriptAuthor {
  id?: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  bot?: boolean;
}

export interface TranscriptAttachment {
  id?: string;
  url: string;
  proxyUrl?: string;
  name: string;
  size?: number;
  contentType?: string;
  width?: number;
  height?: number;
}

export interface TranscriptEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface TranscriptEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: { url: string; proxy_url?: string; width?: number; height?: number };
  thumbnail?: { url: string; proxy_url?: string; width?: number; height?: number };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: TranscriptEmbedField[];
}

export interface TranscriptReaction {
  emoji: {
    id?: string;
    name: string;
    animated?: boolean;
  };
  count: number;
  me?: boolean;
  users?: Array<{ id?: string; username?: string }>;
}

export interface ComponentEmoji {
  id?: string;
  name?: string;
  animated?: boolean;
}

export interface ComponentOption {
  label?: string;
  value?: string;
  description?: string;
  emoji?: ComponentEmoji;
  default?: boolean;
}

export type TranscriptComponentElement =
  | {
      type: "button";
      style?: "primary" | "secondary" | "success" | "danger" | "link" | string;
      label?: string;
      emoji?: ComponentEmoji;
      url?: string;
      customId?: string;
      disabled?: boolean;
    }
  | {
      type: "select";
      selectType?: string;
      placeholder?: string;
      options?: ComponentOption[];
      disabled?: boolean;
      minValues?: number;
      maxValues?: number;
    }
  | {
      type: "textInput";
      style?: "short" | "paragraph" | string;
      label?: string;
      placeholder?: string;
      value?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export interface TranscriptComponent {
  type: "actionRow" | string;
  components?: TranscriptComponentElement[];
  [key: string]: unknown;
}

export interface MessageReference {
  messageId?: string;
  channelId?: string;
  guildId?: string;
}

export interface MessageLike {
  id: string;
  content: string;
  author: TranscriptAuthor;
  timestamp: string | number | Date;
  editedTimestamp?: string | number | Date | null;
  attachments?: TranscriptAttachment[];
  embeds?: TranscriptEmbed[];
  reactions?: TranscriptReaction[];
  components?: Array<TranscriptComponent | Record<string, unknown>>;
  pinned?: boolean;
  type?: string;
  reference?: MessageReference | null;
  mentions?: {
    users?: TranscriptAuthor[];
    roles?: string[];
    everyone?: boolean;
  };
}

export type MessageArraySource = MessageLike[] | readonly MessageLike[];

export type MessageFetcher =
  | (() => Promise<MessageLike[] | readonly MessageLike[]>)
  | (() => AsyncIterable<MessageLike>);

export interface ChannelFetchContext {
  token?: string;
  channelId?: string;
  guildId?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export type ChannelLike = Record<string, unknown>;

export type TranscriptSource = MessageArraySource | MessageFetcher | ChannelLike;

export interface NormalizedMessage extends MessageLike {
  timestamp: string;
  editedTimestamp?: string | null;
  attachments: TranscriptAttachment[];
  embeds: TranscriptEmbed[];
  reactions: TranscriptReaction[];
  components: TranscriptComponent[];
  dayBucket: string;
}

export interface NormalizedTranscriptData {
  messages: NormalizedMessage[];
  generatedAt: string;
  adapter?: string;
}

export interface AnonymizeOptions {
  usernames?: boolean;
  avatars?: boolean;
}

export interface FetchOptions extends ChannelFetchContext {
  adapter?: string;
  batchSize?: number;
}

export interface TranscriptOptions {
  source: TranscriptSource;
  format?: TranscriptFormatSelection;
  theme?: TranscriptTheme;
  includeEmbeds?: boolean;
  includeReactions?: boolean;
  pagination?: boolean | number;
  searchUI?: boolean;
  limit?: number;
  anonymize?: boolean | AnonymizeOptions;
  fetchOptions?: FetchOptions;
  timezone?: string;
  locale?: string;
  customCss?: string;
  adapter?: string;
  sort?: "asc" | "desc";
  componentRenderer?: "native" | "skyra";
}

export interface GenerateTranscriptResult {
  html?: string;
  json?: NormalizedTranscriptData;
  markdown?: string;
  pdf?: Buffer;
  formats: TranscriptFormat[];
  theme: ThemeDefinition;
  metadata: {
    generatedAt: string;
    messageCount: number;
    adapter?: string;
  };
}

export interface AdapterDescriptor {
  name: string;
  detectors: Array<(channel: ChannelLike) => boolean>;
  fetchMessages?: (
    channel: ChannelLike,
    options?: FetchOptions
  ) => Promise<MessageLike[]>;
}
