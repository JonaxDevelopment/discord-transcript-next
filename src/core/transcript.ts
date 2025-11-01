import { collectNormalizedMessages } from "./collect.js";
import { anonymizeMessages } from "./anonymize.js";
import { DEFAULT_OPTIONS, resolveTheme } from "../config.js";
import type {
  GenerateTranscriptResult,
  NormalizedTranscriptData,
  TranscriptFormat,
  TranscriptFormatSelection,
  TranscriptOptions
} from "../types/index.js";
import { renderHtml } from "../render/html.js";
import { renderJson } from "../render/json.js";
import { renderMarkdown } from "../render/markdown.js";
import { renderPdf } from "../render/pdf.js";

const ORDERED_FORMATS: TranscriptFormat[] = ["html", "json", "markdown", "pdf"];

function normalizeFormatSelection(
  selection: TranscriptFormatSelection | undefined
): TranscriptFormat[] {
  if (!selection) return [DEFAULT_OPTIONS.format as TranscriptFormat];
  if (selection === "all") return [...ORDERED_FORMATS];
  if (Array.isArray(selection)) {
    const unique = new Set<TranscriptFormat>();
    for (const format of selection) {
      if (ORDERED_FORMATS.includes(format)) {
        unique.add(format);
      }
    }
    return unique.size ? Array.from(unique) : [DEFAULT_OPTIONS.format as TranscriptFormat];
  }
  if (ORDERED_FORMATS.includes(selection)) return [selection];
  return [DEFAULT_OPTIONS.format as TranscriptFormat];
}

function applyAnonymization(
  data: NormalizedTranscriptData,
  options: TranscriptOptions
): NormalizedTranscriptData {
  if (!options.anonymize) return data;
  const { messages } = anonymizeMessages(data.messages, options.anonymize);
  return {
    ...data,
    messages
  };
}

export async function generateTranscriptInternal(
  options: TranscriptOptions
): Promise<GenerateTranscriptResult> {
  const formats = normalizeFormatSelection(options.format);
  const theme = resolveTheme(options.theme ?? DEFAULT_OPTIONS.theme);
  const collected = await collectNormalizedMessages(options);
  const data = applyAnonymization(collected, options);

  const result: GenerateTranscriptResult = {
    formats,
    theme,
    metadata: {
      generatedAt: data.generatedAt,
      messageCount: data.messages.length,
      adapter: data.adapter
    }
  };

  for (const format of formats) {
    switch (format) {
      case "html":
        result.html = renderHtml(data, { ...options, theme });
        break;
      case "json":
        result.json = renderJson(data, options);
        break;
      case "markdown":
        result.markdown = renderMarkdown(data, options);
        break;
      case "pdf":
        result.pdf = await renderPdf(data, options);
        break;
      default:
        break;
    }
  }

  return result;
}
