import { generateTranscriptInternal } from "./core/transcript.js";
export { detectAdapter, ADAPTERS } from "./adapters/index.js";
export { markdownToHtml, markdownToText } from "./core/markdown.js";
export type {
  TranscriptOptions,
  TranscriptFormat,
  GenerateTranscriptResult,
  TranscriptTheme,
  ThemeDefinition,
  NormalizedMessage,
  NormalizedTranscriptData,
  TranscriptComponent,
  TranscriptComponentElement,
  ComponentEmoji,
  ComponentOption
} from "./types/index.js";

export const generateTranscript = generateTranscriptInternal;
