import type { NormalizedMessage } from "../types/index.js";

export function toISOString(input: string | number | Date): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "number") return new Date(input).toISOString();
  if (!input) return new Date(0).toISOString();
  const maybeDate = new Date(input);
  if (!Number.isNaN(maybeDate.getTime())) return maybeDate.toISOString();
  throw new Error(`Invalid date input: ${input}`);
}

export function sortMessages(
  messages: NormalizedMessage[],
  direction: "asc" | "desc"
): NormalizedMessage[] {
  const sorted = [...messages].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function groupByDay(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function ensureArray<T>(value: T | T[] | readonly T[]): T[] {
  if (Array.isArray(value)) return [...value];
  return [value];
}

export function anonymizeUsername(username: string, index: number): string {
  return `User ${index + 1}`;
}

export function anonymizeAvatar(index: number): string {
  return `https://cdn.discordapp.com/embed/avatars/${index % 5}.png`;
}
