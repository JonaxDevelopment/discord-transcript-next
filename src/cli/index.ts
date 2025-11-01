#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { stdin, exit } from "node:process";
import kleur from "kleur";
import { generateTranscript } from "../index.js";
import { isBuiltInTheme } from "../config.js";
import type {
  ChannelLike,
  MessageLike,
  TranscriptFormat,
  TranscriptOptions,
  TranscriptTheme,
  TranscriptSource
} from "../types/index.js";

declare const __VERSION__: string;
const VERSION =
  typeof __VERSION__ !== "undefined" && __VERSION__ ? __VERSION__ : "0.0.0";

type ExportCommandOptions = {
  input?: string;
  stdin?: boolean;
  output?: string;
  format?: TranscriptFormat | "all";
  theme?: string;
  pagination?: string | boolean;
  search?: boolean;
  embeds?: boolean;
  reactions?: boolean;
  limit?: string;
  timezone?: string;
  locale?: string;
  adapter?: string;
  channel?: string;
  token?: string;
  components?: "native" | "skyra";
};

async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function readStdin(): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

function parsePagination(input: string | boolean | undefined): number | boolean {
  if (typeof input === "boolean") return input;
  if (!input) return false;
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : true;
}

function normalizeMessages(value: unknown): MessageLike[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as MessageLike[];
  if (typeof value === "object" && "messages" in (value as any)) {
    const maybe = (value as any).messages;
    return Array.isArray(maybe) ? (maybe as MessageLike[]) : [];
  }
  throw new Error("Input JSON must be an array of messages or an object with a messages array.");
}

type CliOptionShape = Omit<TranscriptOptions, "source">;

function normalizeTheme(input: string | undefined): TranscriptTheme | undefined {
  if (!input) return undefined;
  return isBuiltInTheme(input)
    ? input
    : {
        name: input,
        css: ""
      };
}

function collectOptions(options: ExportCommandOptions): CliOptionShape {
  const pagination = parsePagination(options.pagination);
  const format = options.format ?? "html";
  const theme = normalizeTheme(options.theme);
  const componentRenderer =
    options.components === "native" || options.components === "skyra"
      ? options.components
      : undefined;

  return {
    format,
    theme,
    pagination,
    searchUI: options.search !== false,
    includeEmbeds: options.embeds !== false,
    includeReactions: options.reactions !== false,
    limit: options.limit ? Number.parseInt(options.limit, 10) : undefined,
    timezone: options.timezone,
    locale: options.locale,
    adapter: options.adapter,
    componentRenderer,
    fetchOptions: {
      adapter: options.adapter,
      channelId: options.channel,
      token: options.token,
      limit: options.limit ? Number.parseInt(options.limit, 10) : undefined
    }
  };
}

async function handleExport(options: ExportCommandOptions): Promise<void> {
  try {
    let data: MessageLike[] | undefined;
    if (options.input) {
      data = normalizeMessages(await readJsonFile(options.input));
    } else if (options.stdin) {
      data = normalizeMessages(await readStdin());
    }

    if (!data && !options.channel) {
      console.error(
        kleur.red(
          "No input provided. Use --input <file> with a JSON payload, pipe JSON via --stdin, or provide a channel id with a supported adapter."
        )
      );
      exit(1);
    }

    const transcriptOptions = collectOptions(options);
    let source: TranscriptSource;
    if (data) {
      source = data;
    } else {
      const channelSource: ChannelLike = {
        channelId: options.channel,
        adapter: options.adapter
      } as ChannelLike;
      source = channelSource;
    }

    const result = await generateTranscript({
      ...transcriptOptions,
      source
    });

    const format = Array.isArray(result.formats) ? result.formats[0] : transcriptOptions.format;

    switch (format) {
      case "html": {
        if (!result.html) throw new Error("Failed to generate HTML transcript.");
        if (options.output) {
          await writeFile(options.output, result.html, "utf8");
          console.log(
            kleur.green(`HTML transcript written to ${options.output}`)
          );
        } else {
          console.log(result.html);
        }
        break;
      }
      case "json": {
        if (!result.json) throw new Error("Failed to generate JSON transcript.");
        const payload = JSON.stringify(result.json, null, 2);
        if (options.output) {
          await writeFile(options.output, payload, "utf8");
          console.log(kleur.green(`JSON transcript written to ${options.output}`));
        } else {
          console.log(payload);
        }
        break;
      }
      case "markdown": {
        if (!result.markdown) throw new Error("Failed to generate Markdown transcript.");
        if (options.output) {
          await writeFile(options.output, result.markdown, "utf8");
          console.log(
            kleur.green(`Markdown transcript written to ${options.output}`)
          );
        } else {
          console.log(result.markdown);
        }
        break;
      }
      case "pdf": {
        if (!result.pdf) throw new Error("Failed to generate PDF transcript.");
        const output = options.output ?? "transcript.pdf";
        await writeFile(output, result.pdf);
        console.log(kleur.green(`PDF transcript written to ${output}`));
        break;
      }
      default:
        throw new Error(`Unsupported format: ${String(format)}`);
    }
  } catch (error) {
    console.error(kleur.red((error as Error).message));
    exit(1);
  }
}

const program = new Command();

program
  .name("discord-transcript")
  .description("Universal Discord transcript generator and CLI.")
  .version(VERSION);

program
  .command("export")
  .description("Generate a transcript from a JSON file, stdin payload, or adapter.")
  .option("-i, --input <path>", "Path to a JSON file containing an array of Discord-like messages.")
  .option("--stdin", "Read Discord messages from STDIN.")
  .option("-o, --output <path>", "Where to write the transcript output.")
  .option("-f, --format <format>", "Output format: html|json|markdown|pdf", "html")
  .option("--theme <theme>", "Theme preset to use (dark|light|custom).", "dark")
  .option("--pagination [size]", "Enable pagination for HTML output. Optionally specify a page size.")
  .option("--no-search", "Disable in-page search UI.")
  .option("--no-embeds", "Exclude embeds from the export.")
  .option("--no-reactions", "Exclude reactions from the export.")
  .option("--components <mode>", "Component renderer to use: native|skyra", "skyra")
  .option("--limit <number>", "Limit the number of messages to export.")
  .option("--timezone <zone>", "Override timezone when rendering timestamps.")
  .option("--locale <locale>", "Override locale when rendering timestamps.")
  .option("--adapter <name>", "Force a specific adapter to be used when fetching.")
  .option("--channel <id>", "Discord channel id (requires adapter capable of fetching).")
  .option("--token <token>", "Discord bot token (used by some adapters).")
  .action((cmdOptions: ExportCommandOptions) => {
    void handleExport({
      ...cmdOptions,
      search: cmdOptions.search,
      embeds: cmdOptions.embeds,
      reactions: cmdOptions.reactions
    });
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(kleur.red((error as Error).message));
  exit(1);
});
