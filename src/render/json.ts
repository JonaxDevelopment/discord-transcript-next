import type {
  NormalizedMessage,
  NormalizedTranscriptData,
  TranscriptOptions
} from "../types/index.js";

function cloneMessage(message: NormalizedMessage): NormalizedMessage {
  return {
    ...message,
    author: message.author ? { ...message.author } : message.author,
    attachments: message.attachments.map((attachment) => ({ ...attachment })),
    embeds: message.embeds.map((embed) => ({
      ...embed,
      fields: embed.fields?.map((field) => ({ ...field }))
    })),
    reactions: message.reactions.map((reaction) => ({
      ...reaction,
      emoji: reaction.emoji ? { ...reaction.emoji } : reaction.emoji,
      users: reaction.users?.map((user) => ({ ...user }))
    })),
    components: message.components?.map((component) => ({
      ...component,
      components: component.components?.map((child) => ({ ...child }))
    })) ?? []
  };
}

export function renderJson(
  data: NormalizedTranscriptData,
  options: TranscriptOptions
): NormalizedTranscriptData {
  const messages = data.messages.map((message) => {
    const cloned = cloneMessage(message);
    if (options.includeEmbeds === false) cloned.embeds = [];
    if (options.includeReactions === false) cloned.reactions = [];
    return cloned;
  });

  return {
    ...data,
    messages
  };
}
