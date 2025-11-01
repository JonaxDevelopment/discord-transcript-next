import PDFDocument from "pdfkit";
import type {
  NormalizedTranscriptData,
  TranscriptComponentElement,
  TranscriptOptions
} from "../types/index.js";
import { markdownToText } from "../core/markdown.js";

export async function renderPdf(
  data: NormalizedTranscriptData,
  options: TranscriptOptions
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: "Discord Transcript",
      Author: "discord-transcript-next",
      Subject: "Chat transcript export",
      CreationDate: new Date(data.generatedAt)
    }
  });

  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer<ArrayBufferLike>) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error: any) => reject(error));

    doc.font("Helvetica-Bold").fontSize(20).text("Discord Transcript", { align: "center" });
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(`Generated: ${new Date(data.generatedAt).toISOString()}`);
    doc.moveDown();

    data.messages.forEach((message, index) => {
      if (index > 0) doc.moveDown();
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#222222")
        .text(`${message.author?.username ?? "Unknown User"}`, { continued: true })
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text(`  ${new Date(message.timestamp).toISOString()}`);

      doc.moveDown(0.25);
      const content = markdownToText(message.content) || "[Empty message]";
      doc.font("Helvetica").fontSize(11).fillColor("#111111").text(content, {
        lineGap: 2
      });

      if (options.includeEmbeds !== false && message.embeds.length) {
        doc.moveDown(0.25);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333").text("Embeds:");
        message.embeds.forEach((embed, embedIndex) => {
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#444444")
            .text(`• ${embed.title ?? `Embed ${embedIndex + 1}`}`);
          if (embed.description) {
            doc.font("Helvetica").fontSize(10).fillColor("#666666").text(`  ${markdownToText(embed.description)}`);
          }
        });
      }

      if (options.includeReactions !== false && message.reactions.length) {
        doc.moveDown(0.25);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333").text("Reactions:");
        message.reactions.forEach((reaction) => {
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#444444")
            .text(`• ${reaction.emoji?.name ?? "emoji"} × ${reaction.count}`);
        });
      }

      if (message.components.length) {
        doc.moveDown(0.25);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333").text("Components:");
        message.components.forEach((row, index) => {
          const rowComponents = row.components?.length
            ? row.components
            : [row as unknown as TranscriptComponentElement];
          const labels = rowComponents
            ?.map((component) => {
              if (component.type === "button") return component.label ?? "Button";
              if (component.type === "select") return component.placeholder ?? "Select";
              if (component.type === "textInput") return component.label ?? "Text Input";
              return component.type;
            })
            .join(", ") ?? "Row";
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#444444")
            .text(`• Row ${index + 1}: ${labels}`);
        });
      }

      if (message.attachments.length) {
        doc.moveDown(0.25);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333").text("Attachments:");
        message.attachments.forEach((attachment) => {
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#444444")
            .text(`• ${attachment.name} (${attachment.url})`);
        });
      }
    });

    doc.end();
  });
}
