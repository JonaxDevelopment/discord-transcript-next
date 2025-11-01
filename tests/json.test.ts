import { describe, it, expect } from "vitest";
import { generateTranscript } from "../src/index.js";
import mockMessages from "./fixtures/messages.json";

describe("JSON export", () => {
  it("returns valid JSON data", async () => {
    const res = await generateTranscript({ source: mockMessages, format: "json" });
    expect(res.json).toBeTruthy();
    expect(Array.isArray(res.json!.messages)).toBe(true);
    expect(res.json!.messages[0]).toHaveProperty("id");
    expect(res.json!.messages[2].components?.length).toBeGreaterThan(0);
  });
});
