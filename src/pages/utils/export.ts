import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";

function sanitizeFilename(name: string) {
  return name
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs: true
        },
        (downloadId) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message));
          if (!downloadId) return reject(new Error("Download failed"));
          resolve();
        }
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseLines(md: string): string[] {
  return md.replace(/\r\n/g, "\n").split("\n");
}

export async function exportResumeAsDocx(resumeMarkdown: string, title: string) {
  const lines = parseLines(resumeMarkdown);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ""),
          heading: HeadingLevel.HEADING_2
        })
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^- /, ""),
          bullet: { level: 0 }
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: trimmed })]
      })
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const blob = await Packer.toBlob(doc);
  await downloadBlob(`${sanitizeFilename(title)}.docx`, blob);
}

export async function exportResumeAsPdf(resumeMarkdown: string, title: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const lines = parseLines(resumeMarkdown);

  function ensureSpace(nextHeight: number) {
    if (y + nextHeight <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  ensureSpace(titleLines.length * 22);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 22 + 10;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 8;
      continue;
    }

    if (line.trim().startsWith("## ")) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12.5);
      const text = line.trim().replace(/^##\s+/, "");
      ensureSpace(18);
      pdf.text(text, margin, y);
      y += 18;
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.3);
      ensureSpace(10);
      pdf.line(margin, y, margin + maxWidth, y);
      y += 10;
      continue;
    }

    if (line.trim().startsWith("- ")) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10.5);
      const bulletText = "• " + line.trim().replace(/^- /, "");
      const wrapped = pdf.splitTextToSize(bulletText, maxWidth);
      ensureSpace(wrapped.length * 14 + 2);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 14 + 2;
      continue;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.8);
    const wrapped = pdf.splitTextToSize(line.trim(), maxWidth);
    ensureSpace(wrapped.length * 14 + 2);
    pdf.text(wrapped, margin, y);
    y += wrapped.length * 14 + 2;
  }

  const blob = pdf.output("blob");
  await downloadBlob(`${sanitizeFilename(title)}.pdf`, blob);
}

