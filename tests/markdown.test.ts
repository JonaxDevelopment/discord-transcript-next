import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../src/core/markdown.js";

describe("Markdown parsing", () => {
  it("handles bold, italics, code, and spoilers", () => {
    const html = markdownToHtml("**bold** *italics* `code` ||spoiler||");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italics</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("class=\"spoiler\"");
  });
});
