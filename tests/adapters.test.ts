import { describe, it, expect } from "vitest";
import {
  detectAdapter,
  fetchMessagesViaAdapter,
  ADAPTERS
} from "../src/adapters/index.js";

const baseMessage = {
  id: "1",
  content: "Ping",
  author: { username: "tester" },
  timestamp: "2025-10-10T10:00:00.000Z"
};

type ChannelFactory = () => Record<string, any>;

const createChannelMap: Record<string, ChannelFactory> = {
  "discord.js": () => ({
    messages: {
      fetch: async () => [baseMessage]
    }
  }),
  Detritus: () => ({
    fetchMessages: async () => [baseMessage]
  }),
  dfx: () => ({
    getMessages: async () => [baseMessage],
    rest: {}
  }),
  Discordeno: () => ({
    client: {
      helpers: {
        getMessages: async () => [baseMessage]
      }
    }
  }),
  droff: () => ({
    rest: {
      get: async () => [baseMessage]
    }
  }),
  Dysnomia: () => ({
    getMessages: async () => [baseMessage],
    client: {}
  }),
  Eris: () => ({
    getMessages: async () => [baseMessage],
    _client: {}
  }),
  Harmony: () => ({
    fetchMessages: async () => [baseMessage],
    client: { name: "Harmony" }
  }),
  Oceanic: () => ({
    client: {
      rest: {
        channels: {
          getMessages: async () => [baseMessage]
        }
      }
    }
  }),
  Seyfert: () => ({
    messages: {
      fetch: async () => [baseMessage]
    },
    adapter: "Seyfert"
  }),
  SnowTransfer: () => ({
    client: {
      channel: {
        getChannelMessages: async () => [baseMessage]
      }
    }
  }),
  Tiscord: () => ({
    client: {
      rest: {
        getMessages: async () => [baseMessage]
      }
    }
  }),
  Discall: () => ({
    client: {
      api: {
        get: async () => [baseMessage]
      }
    }
  }),
  disgroove: () => ({
    fetchMessages: async () => [baseMessage],
    framework: "disgroove"
  }),
  "Raw REST": () => ({
    url: "https://discord.com/api/channels/0/messages"
  })
};

const DETECTION_CASES: Array<{
  adapter: string;
  expected: string;
  factory: ChannelFactory;
}> = [
  { adapter: "discord.js", expected: "discord.js", factory: createChannelMap["discord.js"] },
  { adapter: "Detritus", expected: "Detritus", factory: createChannelMap.Detritus },
  { adapter: "dfx", expected: "dfx", factory: createChannelMap.dfx },
  { adapter: "Discordeno", expected: "Discordeno", factory: createChannelMap.Discordeno },
  { adapter: "droff", expected: "droff", factory: createChannelMap.droff },
  { adapter: "Dysnomia", expected: "Dysnomia", factory: createChannelMap.Dysnomia },
  { adapter: "Eris", expected: "Eris", factory: createChannelMap.Eris },
  { adapter: "Harmony", expected: "Detritus", factory: createChannelMap.Harmony },
  { adapter: "Oceanic", expected: "Oceanic", factory: createChannelMap.Oceanic },
  { adapter: "Seyfert", expected: "discord.js", factory: createChannelMap.Seyfert },
  { adapter: "SnowTransfer", expected: "SnowTransfer", factory: createChannelMap.SnowTransfer },
  { adapter: "Tiscord", expected: "Tiscord", factory: createChannelMap.Tiscord },
  { adapter: "Discall", expected: "Discall", factory: createChannelMap.Discall },
  { adapter: "disgroove", expected: "Detritus", factory: createChannelMap.disgroove },
  { adapter: "Raw REST", expected: "Raw REST", factory: createChannelMap["Raw REST"] }
];

describe("Adapter detection", () => {
  it.each(DETECTION_CASES)("detects %s", ({ adapter, expected, factory }) => {
    expect(detectAdapter(factory())).toBe(expected);
  });
});

describe("Adapter fetch pipeline", () => {
  for (const adapter of ADAPTERS) {
    const factory = createChannelMap[adapter.name];
    if (!factory) {
      continue;
    }
    if (adapter.name === "Raw REST") {
      it(`throws for ${adapter.name} fetch without implementation`, async () => {
        await expect(
          fetchMessagesViaAdapter(factory(), { adapter: adapter.name })
        ).rejects.toThrow();
      });
      continue;
    }

    it(`fetches messages via ${adapter.name}`, async () => {
      const result = await fetchMessagesViaAdapter(factory(), {
        adapter: adapter.name
      });
      expect(Array.isArray(result.messages)).toBe(true);
    });
  }
});
