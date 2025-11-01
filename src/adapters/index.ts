import type {
  AdapterDescriptor,
  ChannelLike,
  FetchOptions,
  MessageLike
} from "../types/index.js";

type MethodCall = (channel: ChannelLike, options?: FetchOptions) => Promise<MessageLike[]>;

const noopFetch: MethodCall = async () => {
  throw new Error(
    "This adapter does not provide a fetch implementation. Supply messages manually or pass a custom fetcher."
  );
};

function hasProperty(channel: ChannelLike, path: string): boolean {
  const segments = path.split(".");
  let current: any = channel;
  for (const segment of segments) {
    if (current && segment in current) {
      current = current[segment];
    } else {
      return false;
    }
  }
  return typeof current === "function";
}

async function callMethod(
  channel: ChannelLike,
  path: string,
  args: unknown[]
): Promise<unknown> {
  const segments = path.split(".");
  const methodName = segments.pop()!;
  let current: any = channel;
  for (const segment of segments) {
    current = current?.[segment];
  }
  const method = current?.[methodName];
  if (typeof method !== "function") {
    throw new Error(`Channel is missing method ${path}`);
  }
  return method.apply(current, args);
}

async function fetchViaMethod(
  channel: ChannelLike,
  methodPath: string,
  options?: FetchOptions
): Promise<MessageLike[]> {
  const limit = options?.limit ?? 100;
  const payload = options?.before || options?.after || options?.batchSize ? {
    limit,
    before: options?.before,
    after: options?.after
  } : limit;

  const result = await callMethod(channel, methodPath, [payload]);

  if (!result) return [];
  if (Array.isArray(result)) return result as MessageLike[];

  // discord.js Collection like
  if (result instanceof Map) {
    return Array.from(result.values()) as MessageLike[];
  }
  if (Symbol.iterator in Object(result)) {
    try {
      return Array.from(result as Iterable<MessageLike>);
    } catch {
      // fall through
    }
  }
  if (typeof result === "object") {
    return Object.values(result as Record<string, MessageLike>);
  }

  return [];
}

function createMethodAdapter(
  name: string,
  methodPath: string,
  detectorPaths: string[],
  extraDetectors: Array<(channel: ChannelLike) => boolean> = []
): AdapterDescriptor {
  return {
    name,
    detectors: [
      (channel: ChannelLike) =>
        detectorPaths.every((path) => hasProperty(channel, path)) &&
        extraDetectors.every((detector) => {
          try {
            return detector(channel);
          } catch {
            return false;
          }
        })
    ],
    fetchMessages: (channel, options) => fetchViaMethod(channel, methodPath, options)
  };
}

export const ADAPTERS: AdapterDescriptor[] = [
  createMethodAdapter("discord.js", "messages.fetch", ["messages.fetch"]),
  createMethodAdapter("Detritus", "fetchMessages", ["fetchMessages"]),
  createMethodAdapter("dfx", "getMessages", ["getMessages"], [
    (channel: ChannelLike) =>
      Boolean((channel as any)?.rest) ||
      Boolean((channel as any)?.client && (channel as any)?.client?.rest)
  ]),
  createMethodAdapter("Discordeno", "client.helpers.getMessages", [
    "client.helpers.getMessages"
  ]),
  createMethodAdapter("droff", "rest.get", ["rest.get"]),
  createMethodAdapter("Dysnomia", "getMessages", ["getMessages"], [
    (channel: ChannelLike) => Boolean((channel as any)?.client)
  ]),
  createMethodAdapter("Eris", "getMessages", ["getMessages"], [
    (channel: ChannelLike) => Boolean((channel as any)?._client)
  ]),
  createMethodAdapter("Harmony", "fetchMessages", ["fetchMessages"]),
  createMethodAdapter("Oceanic", "client.rest.channels.getMessages", [
    "client.rest.channels.getMessages"
  ]),
  createMethodAdapter("Seyfert", "messages.fetch", ["messages.fetch"]),
  createMethodAdapter("SnowTransfer", "client.channel.getChannelMessages", [
    "client.channel.getChannelMessages"
  ]),
  createMethodAdapter("Tiscord", "client.rest.getMessages", ["client.rest.getMessages"]),
  createMethodAdapter("Discall", "client.api.get", ["client.api.get"]),
  createMethodAdapter("disgroove", "fetchMessages", ["fetchMessages"]),
  {
    name: "Raw REST",
    detectors: [
      (channel: ChannelLike) =>
        typeof (channel as any)?.url === "string" || typeof (channel as any)?.endpoint === "string"
    ],
    fetchMessages: noopFetch
  }
];

export function detectAdapter(channel: ChannelLike): string | undefined {
  for (const adapter of ADAPTERS) {
    if (adapter.detectors.some((detector) => {
      try {
        return detector(channel);
      } catch {
        return false;
      }
    })) {
      return adapter.name;
    }
  }
  return undefined;
}

export async function fetchMessagesViaAdapter(
  channel: ChannelLike,
  options?: FetchOptions
): Promise<{ adapter?: string; messages: MessageLike[] }> {
  const explicitAdapterName = options?.adapter ?? detectAdapter(channel);
  if (!explicitAdapterName) {
    throw new Error(
      "Unable to detect adapter. Please specify adapter explicitly or provide messages manually."
    );
  }

  const adapter = ADAPTERS.find((item) => item.name === explicitAdapterName);
  if (!adapter) {
    throw new Error(`Unknown adapter: ${explicitAdapterName}`);
  }

  if (!adapter.fetchMessages) {
    throw new Error(
      `Adapter "${adapter.name}" does not support automatic fetching. Supply messages manually.`
    );
  }

  const messages = await adapter.fetchMessages(channel, options);
  return { adapter: adapter.name, messages };
}
