import type {
  TranscriptOptions,
  ThemeDefinition,
  TranscriptTheme,
  BuiltInThemeName
} from "./types/index.js";

const BUILT_IN_THEMES: Record<BuiltInThemeName, ThemeDefinition> = {
  dark: {
    name: "dark",
    css: `
      :root {
        color-scheme: dark;
        --background-primary: #313338;
        --background-secondary: #2b2d31;
        --background-secondary-alt: #232428;
        --text-normal: #dcddde;
        --text-muted: #a3a6aa;
        --interactive-hover: #3c3f45;
        --interactive-active: #50545d;
        --mention-background: rgba(88, 101, 242, 0.3);
        --mention-border: rgba(88, 101, 242, 0.6);
      }
      body {
        background: var(--background-primary);
        color: var(--text-normal);
        font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial,
          sans-serif;
        margin: 0;
        padding: 0;
      }
    `
  },
  light: {
    name: "light",
    css: `
      :root {
        color-scheme: light;
        --background-primary: #f2f3f5;
        --background-secondary: #ffffff;
        --background-secondary-alt: #f8f9fd;
        --text-normal: #2e3338;
        --text-muted: #4f5660;
        --interactive-hover: #dbdee1;
        --interactive-active: #e3e5e8;
        --mention-background: rgba(88, 101, 242, 0.16);
        --mention-border: rgba(88, 101, 242, 0.35);
      }
      body {
        background: var(--background-primary);
        color: var(--text-normal);
        font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial,
          sans-serif;
        margin: 0;
        padding: 0;
      }
    `
  }
};

export const DEFAULT_OPTIONS: Required<
  Pick<
    TranscriptOptions,
    | "includeEmbeds"
    | "includeReactions"
    | "pagination"
    | "searchUI"
    | "theme"
    | "format"
    | "limit"
    | "sort"
    | "componentRenderer"
  >
> = {
  includeEmbeds: true,
  includeReactions: true,
  pagination: false,
  searchUI: true,
  theme: "dark",
  format: "html",
  limit: 1000,
  sort: "asc",
  componentRenderer: "native"
};

export function resolveTheme(theme?: TranscriptTheme): ThemeDefinition {
  if (!theme) {
    return BUILT_IN_THEMES[DEFAULT_OPTIONS.theme as BuiltInThemeName];
  }
  if (typeof theme === "string") {
    const normalized = theme.toLowerCase() as BuiltInThemeName;
    return BUILT_IN_THEMES[normalized] ?? {
      name: normalized,
      css: ""
    };
  }
  return {
    name: theme.name ?? "custom",
    css: theme.css
  };
}

export function isBuiltInTheme(theme: string): theme is BuiltInThemeName {
  return theme === "dark" || theme === "light";
}

export const themes = BUILT_IN_THEMES;
