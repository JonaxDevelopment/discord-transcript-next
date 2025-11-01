import { markdownToText } from "../core/markdown.js";
import type {
  NormalizedMessage,
  NormalizedTranscriptData,
  TranscriptComponentElement,
  TranscriptOptions
} from "../types/index.js";

function formatLine(message: NormalizedMessage, options: TranscriptOptions): string {
  const timestamp = new Date(message.timestamp).toISOString();
  const author = message.author?.username ?? "Unknown User";
  const content = markdownToText(message.content);
  const lines = [`### ${author} — ${timestamp}`, "", content || "_Empty message_"];

  if (message.attachments?.length) {
    lines.push("", "**Attachments:**");
    for (const attachment of message.attachments) {
      lines.push(`- [${attachment.name}](${attachment.url})`);
    }
  }

  if (options.includeEmbeds !== false && message.embeds?.length) {
    lines.push("", "**Embeds:**");
    message.embeds.forEach((embed, index) => {
      lines.push(`- Embed ${index + 1}: ${embed.title ?? "_No title_"}`);
      if (embed.description) {
        lines.push(`  - ${markdownToText(embed.description)}`);
      }
    });
  }

  if (message.components?.length) {
    lines.push("", "**Components:**");
    message.components.forEach((row, rowIndex) => {
      const rowComponents = row.components?.length
        ? row.components
        : [row as unknown as TranscriptComponentElement];
      const labels = rowComponents
        ?.map((component) => {
          if (component.type === "button") {
            return component.label ?? component.style ?? "Button";
          }
          if (component.type === "select") {
            return component.placeholder ?? "Select";
          }
          if (component.type === "textInput") {
            return component.label ?? "Text Input";
          }
          return component.type;
        })
        .join(", ");
      lines.push(`- Row ${rowIndex + 1}: ${labels ?? "Components"}`);
    });
  }

  if (options.includeReactions !== false && message.reactions?.length) {
    lines.push("", "**Reactions:**");
    message.reactions.forEach((reaction) => {
      const emoji = reaction.emoji?.name ?? "emoji";
      lines.push(`- ${emoji} × ${reaction.count}`);
    });
  }

  return lines.join("\n");
}

export function renderMarkdown(
  data: NormalizedTranscriptData,
  options: TranscriptOptions
): string {
  const header = `# Discord Transcript

- Generated: ${new Date(data.generatedAt).toISOString()}
- Messages: ${data.messages.length}
`;

  const body = data.messages.map((message) => formatLine(message, options)).join("\n\n---\n\n");

  return `${header}\n${body}\n`;
}
