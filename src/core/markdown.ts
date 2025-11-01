const ESCAPE_LOOKUP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[&<>"']/g, (char) => ESCAPE_LOOKUP[char] ?? char);
}

function replaceInlineMarkdown(raw: string): string {
  let input = escapeHtml(raw);
  input = input
    // Spoilers handled first to avoid conflicting with italics
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>')
    // Inline code
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Underline
    .replace(/__(.+?)__/g, "<u>$1</u>")
    // Strikethrough
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    // Italic (surrounded by spaces to avoid conflict with bold)
    .replace(/(^|[\s(])\*(.[^*]*?)\*(?=[\s).]|$)/g, "$1<em>$2</em>");
  return input;
}

function replaceMentions(input: string): string {
  return input
    .replace(
      /<@!?(\d+)>/g,
      (_, id) => `<span class="mention user" data-user-id="${id}">@User</span>`
    )
    .replace(
      /<#(\d+)>/g,
      (_, id) => `<span class="mention channel" data-channel-id="${id}">#channel</span>`
    )
    .replace(
      /<@&(\d+)>/g,
      (_, id) => `<span class="mention role" data-role-id="${id}">@role</span>`
    )
    .replace(
      /@everyone/g,
      '<span class="mention everyone" data-mention="everyone">@everyone</span>'
    )
    .replace(
      /@here/g,
      '<span class="mention here" data-mention="here">@here</span>'
    );
}

export function markdownToHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  const value = typeof input === "string" ? input : String(input);
  if (!value) return "";
  const lines = value.split(/\r?\n/);
  const rendered: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      rendered.push(`<pre><code>${escapeHtml(trimmed.replace(/```/g, ""))}</code></pre>`);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      rendered.push(
        `<blockquote>${replaceInlineMarkdown(trimmed.slice(1).trim())}</blockquote>`
      );
      continue;
    }

    rendered.push(
      `<p>${replaceMentions(replaceInlineMarkdown(line))}</p>`
    );
  }

  return rendered.join("");
}

export function markdownToText(input: string): string {
  return input
    .replace(/\|\|/g, "")
    .replace(/```[\s\S]+?```/g, (block) =>
      block.replace(/```/g, "").split("\n").join("\n")
    )
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/@everyone/g, "everyone")
    .replace(/@here/g, "here");
}
