# discord-transcript-next

[![npm version](https://img.shields.io/npm/v/discord-transcript-next.svg)](https://www.npmjs.com/package/discord-transcript-next)
[![CI](https://github.com/your-org/discord-transcript-next/actions/workflows/test.yml/badge.svg)](https://github.com/your-org/discord-transcript-next/actions/workflows/test.yml)

Universal, framework-agnostic Discord transcript generator and CLI that delivers 1:1 HTML replicas, JSON/Markdown/PDF exports, search, pagination, themes, and anonymisation — all without touching the live Discord API during testing.

## Installation

```bash
npm install discord-transcript-next
# or
yarn add discord-transcript-next
# or
pnpm add discord-transcript-next
```

## Quick Start

### Node.js

```ts
import { generateTranscript } from "discord-transcript-next";

const transcript = await generateTranscript({
  source: messagesArray,
  theme: "dark",
  format: "html",
  pagination: true,
  searchUI: true
});

await fs.promises.writeFile("transcript.html", transcript.html!);
```

### CLI

```bash
npx discord-transcript export \
  --input ./messages.json \
  --format html \
  --theme dark \
  --pagination 25 \
  --output transcript.html
```

### Rich demo

```bash
npm run demo:html
# outputs examples/transcript-demo.html showcasing embeds, buttons, selects, reactions, and pagination
```

## Supported Libraries

| Library      | Fetch Method                                  | Status |
| ------------ | --------------------------------------------- | ------ |
| Detritus     | `channel.fetchMessages()`                     | ✅      |
| dfx          | `channel.getMessages()`                       | ✅      |
| discord.js   | `channel.messages.fetch()`                    | ✅      |
| Discordeno   | `client.helpers.getMessages(channelId)`       | ✅      |
| droff        | `client.rest.get('/channels/:id/messages')`   | ✅      |
| Dysnomia     | `channel.getMessages()`                       | ✅      |
| Eris         | `channel.getMessages()`                       | ✅      |
| Harmony      | `channel.fetchMessages()`                     | ✅      |
| Oceanic      | `client.rest.channels.getMessages(channelId)` | ✅      |
| Seyfert      | `channel.messages.fetch()`                    | ✅      |
| SnowTransfer | `client.channel.getChannelMessages()`         | ✅      |
| Tiscord      | `client.rest.getMessages(channelId)`          | ✅      |
| Discall      | `client.api.get('/channels/:id/messages')`    | ✅      |
| disgroove    | `channel.fetchMessages()`                     | ✅      |
| Raw REST     | Custom fetcher                                | ✅      |

## Options

| Option              | Type                                  | Default | Description |
| ------------------- | ------------------------------------- | ------- | ----------- |
| `source`            | Array \| Channel \| Fetcher           | —       | Input messages, channel object, or async fetcher. |
| `format`            | `"html" \| "json" \| "markdown" \| "pdf" \| "all"` | `"html"` | Output format(s). |
| `theme`             | `"dark" \| "light" \| { css }`        | `"dark"` | Built-in or custom theme CSS. |
| `includeEmbeds`     | `boolean`                             | `true`  | Include embed rendering. |
| `includeReactions`  | `boolean`                             | `true`  | Include reaction rendering. |
| `pagination`        | `boolean \| number`                   | `false` | Enables HTML pagination (optional page size). |
| `searchUI`          | `boolean`                             | `true`  | Adds instant in-browser search. |
| `limit`             | `number`                              | `1000`  | Maximum messages to collect. |
| `anonymize`         | `boolean \| { usernames, avatars }`   | `false` | Masks user metadata. |
| `timezone`          | `string`                              | system  | Override timestamp timezone for rendering. |
| `locale`            | `string`                              | `"en-US"` | Locale for timestamp formatting. |
| `customCss`         | `string`                              | `""`    | Append custom CSS to HTML export. |
| `componentRenderer` | `"native" \| "skyra"`              | `"native"` | Controls how interactive components are rendered (Skyra web components or fallback builder). |
| `adapter`           | `string`                              | auto    | Force a specific library adapter. |
| `fetchOptions`      | `{ token, channelId, before, after }` | —       | Extra hints when auto-fetching from channels. |

## Input Examples

### 1. Array of messages

```ts
await generateTranscript({ source: mockMessages });
```

### 2. Channel object (auto-detected adapter)

```ts
await generateTranscript({
  source: discordChannel,
  fetchOptions: { limit: 500 }
});
```

### 3. Custom fetcher

```ts
await generateTranscript({
  source: async () => myRestClient.getChannelMessages(channelId),
  format: "json"
});
```

## Output Formats

- **HTML** — pixel-perfect Discord UI replica, with themes, search, and pagination.
- **JSON** — normalised message payload for downstream processing.
- **Markdown** — readable, human-friendly transcript.
- **PDF** — printable transcript powered by PDFKit.

## Components & Interactions

Interactive message components are rendered automatically:

- Button styles (primary, secondary, success, danger, link) appear with matching colours.
- Select menus display placeholder text and available options.
- Text inputs and unknown components fall back to read-only previews so reviewers can inspect layouts.
- When `componentRenderer` is left on `"skyra"`, the HTML bootstraps [`@skyra/discord-components`](https://github.com/skyra-project/discord-components) from jsDelivr so the action rows, buttons, and menus behave and look like native Discord UI. The classic builder markup is still embedded as a fallback when the web components are unavailable.
  - The transcript wraps messages in `<discord-messages>` containers and uses `<discord-action-row>`, `<discord-button>`, and `<discord-select-menu>` tags provided by the Skyra project.

Disabled states and link buttons are represented to mirror Discord’s UI.

## Search & Pagination

The HTML export ships with instant, client-side search and optional pagination:

- `searchUI: true` adds a debounced filter field.
- `pagination: true` enables 25 messages per page by default.
- `pagination: 50` sets a custom page size.

All functionality is bundled into the generated HTML — no hosting or servers required.

## Privacy & Anonymisation

Enable anonymisation to replace usernames and avatars in exports:

```ts
await generateTranscript({
  source: messages,
  anonymize: { usernames: true, avatars: true }
});
```

Pair with `includeEmbeds: false` to remove embed metadata entirely.

## Testing

Fast, local tests powered by Vitest. All fixtures are static; no live Discord API calls occur.

```bash
npm test
# or
npx vitest run --coverage
```

Expected output:

```
✓ html.test.ts (1)
✓ markdown.test.ts (1)
✓ adapters.test.ts (2)
✓ json.test.ts (1)
✓ cli.test.ts (1)
Test Files  5 passed (5)
```

## Contributing

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for watch-mode builds.
4. Add/update tests alongside your changes.
5. Open a pull request and describe your changes and test plan.

## License

Licensed under the [MIT License](./LICENSE).
