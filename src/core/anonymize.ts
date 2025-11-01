import type {
  AnonymizeOptions,
  NormalizedMessage,
  TranscriptAuthor
} from "../types/index.js";
import { anonymizeAvatar, anonymizeUsername } from "./utils.js";

interface AnonymizeResult {
  messages: NormalizedMessage[];
  mapping: Map<string, TranscriptAuthor>;
}

export function anonymizeMessages(
  messages: NormalizedMessage[],
  options: boolean | AnonymizeOptions = true
): AnonymizeResult {
  if (!options) {
    return { messages, mapping: new Map() };
  }

  const config: AnonymizeOptions =
    typeof options === "boolean" ? { usernames: options, avatars: options } : options;

  const map = new Map<string, TranscriptAuthor>();
  const anonymized = messages.map((message, index) => {
    if (!message.author) return message;
    const key = message.author.id ?? message.author.username ?? `anonymous-${index}`;

    if (!map.has(key)) {
      map.set(key, {
        ...message.author,
        username: config.usernames
          ? anonymizeUsername(key, map.size)
          : message.author.username,
        avatar: config.avatars
          ? anonymizeAvatar(map.size)
          : message.author.avatar ?? null
      });
    }

    const override = map.get(key)!;
    return {
      ...message,
      author: { ...message.author, ...override }
    };
  });

  return { messages: anonymized, mapping: map };
}
