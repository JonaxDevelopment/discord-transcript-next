import { describe, it, expect } from "vitest";
import { generateTranscript } from "../src/index.js";
import mockMessages from "./fixtures/messages.json";

describe("HTML rendering", () => {
  it("renders HTML with correct structure", async () => {
    const result = await generateTranscript({ source: mockMessages });
    expect(result.html).toBeTruthy();
    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("class=\"message\"");
    expect(result.html).toContain("component-button");
    expect(result.html).toContain("component-select-card");
    expect(result.html!.length).toBeGreaterThan(500);
  });
});
