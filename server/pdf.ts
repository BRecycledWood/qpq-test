import PDFDocument from "pdfkit";
import type { PackDefinition, Answers, Outcome, Question } from "@shared/pack";

export type PdfWorkspace = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export type PdfPack = {
  name: string;
  slug: string;
};

export type PdfVersion = {
  version: number;
  createdAt: Date | string;
};

export type PdfEvaluation = {
  score: number;
  reasons: string[];
  outcome: Outcome | null;
  disqualified: boolean;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

function normalizeColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

function formatTimestamp(date: Date) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function renderAnswer(question: Question, answer: Answers[string]): string {
  if (answer === null || answer === undefined) return "";

  const type = question.type;
  const options = question.options ?? [];

  const findLabel = (value: string) => {
    const option = options.find(
      (item) => (item.value ?? item.id) === value || item.id === value,
    );
    return option?.label ?? value;
  };

  if (type === "boolean" || type === "yesno") {
    return answer === true ? "Yes" : "No";
  }

  if (type === "number") {
    return typeof answer === "number" ? String(answer) : String(answer);
  }

  if (type === "single" || type === "select") {
    return typeof answer === "string" ? findLabel(answer) : String(answer);
  }

  if (Array.isArray(answer)) {
    return answer
      .map((item) => (typeof item === "string" ? findLabel(item) : String(item)))
      .join(", ");
  }

  return typeof answer === "string" ? answer : String(answer);
}

async function fetchLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    return null;
  }
}

/** Draw a rounded rectangle (used for score badge and cards) */
function roundedRect(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
}

export async function renderAssessmentPdf(
  doc: PdfDoc,
  data: {
    workspace: PdfWorkspace;
    pack: PdfPack;
    version: PdfVersion;
    definition: PackDefinition;
    answers: Answers;
    evaluation: PdfEvaluation;
    timestamp: Date;
  },
): Promise<void> {
  const primary = normalizeColor(data.workspace.primaryColor, "#0f172a");
  const secondary = normalizeColor(data.workspace.secondaryColor, "#64748b");
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - margin * 2;

  // -- HEADER BAND (gradient-like with two-tone) --
  const headerHeight = 140;
  doc.rect(0, 0, pageWidth, headerHeight).fill(primary);
  // Subtle lighter band at bottom of header
  doc.rect(0, headerHeight - 4, pageWidth, 4).fill("#ffffff");

  const logoBuffer = data.workspace.logoUrl
    ? await fetchLogoBuffer(data.workspace.logoUrl)
    : null;

  doc.fillColor("#ffffff");
  const headerY = 28;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, margin, headerY, { width: 48, height: 48 });
      doc.fontSize(24).font("Helvetica-Bold").text(
        data.workspace.name,
        margin + 60,
        headerY + 6,
        { width: contentWidth - 60 },
      );
    } catch {
      doc.fontSize(24).font("Helvetica-Bold").text(data.workspace.name, margin, headerY + 6);
    }
  } else {
    doc.fontSize(24).font("Helvetica-Bold").text(data.workspace.name, margin, headerY + 6);
  }

  // Pack name + version line
  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("rgba(255,255,255,0.85)")
    .text(
      `${data.pack.name}  |  v${data.version.version}`,
      margin,
      headerY + 42,
    );

  // Date + jurisdiction-style line
  doc
    .fontSize(11)
    .text(
      `Date: ${formatTimestamp(data.timestamp)}`,
      margin,
      headerY + 62,
    );

  // -- SCORE BADGE (centered, overlapping header) --
  const badgeSize = 100;
  const badgeX = (pageWidth - badgeSize) / 2;
  const badgeY = headerHeight - badgeSize / 2;

  // White circle background
  doc.save();
  doc
    .circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2 + 4)
    .fill("#ffffff");

  // Score circle
  const outcome = data.evaluation.outcome;
  const statusObj = getStatusInfo(outcome, data.evaluation.disqualified);
  doc
    .circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2)
    .fill(statusObj.bgColor);

  // Score number
  doc
    .fontSize(36)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text(
      String(data.evaluation.score),
      badgeX,
      badgeY + 24,
      { width: badgeSize, align: "center" },
    );

  // "points" label
  doc
    .fontSize(9)
    .font("Helvetica")
    .text("points", badgeX, badgeY + 62, { width: badgeSize, align: "center" });
  doc.restore();

  // -- STATUS LINE --
  const statusY = badgeY + badgeSize + 16;
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor(statusObj.textColor)
    .text(
      `Overall Status: ${statusObj.label}`,
      margin,
      statusY,
      { width: contentWidth, align: "center" },
    );

  // -- OUTCOME TITLE + DESCRIPTION --
  const outcomeY = statusY + 28;
  const outcomeTitle = outcome?.title ?? "Assessment Complete";
  const outcomeDesc = outcome?.description ?? "";

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor(primary)
    .text(outcomeTitle, margin, outcomeY, { width: contentWidth, align: "center" });

  if (outcomeDesc) {
    doc
      .fontSize(10.5)
      .font("Helvetica")
      .fillColor(secondary)
      .text(outcomeDesc, margin + 20, doc.y + 8, {
        width: contentWidth - 40,
        align: "center",
        lineGap: 3,
      });
  }

  // -- DIVIDER --
  const divY = doc.y + 20;
  doc
    .moveTo(margin, divY)
    .lineTo(pageWidth - margin, divY)
    .lineWidth(1)
    .strokeColor("#e2e8f0")
    .stroke();

  // -- KEY FINDINGS / REASONS --
  if (data.evaluation.reasons.length > 0) {
    doc.y = divY + 14;
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(primary)
      .text("Key Findings", margin, doc.y);
    doc.moveDown(0.4);

    data.evaluation.reasons.forEach((reason) => {
      const bulletY = doc.y;
      // Green check circle
      doc
        .circle(margin + 6, bulletY + 6, 6)
        .fill("#10b981");
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(String.fromCharCode(10003), margin + 2, bulletY + 2, {
          width: 12,
          align: "center",
        });
      doc
        .fontSize(10.5)
        .font("Helvetica")
        .fillColor("#334155")
        .text(reason, margin + 20, bulletY + 1, { width: contentWidth - 20 });
      doc.moveDown(0.3);
    });
  }

  // -- ACTIONS / NEXT STEPS --
  const actions: Array<{ label: string; url?: string }> = [];
  if (outcome?.ctaLabel) {
    actions.push({ label: outcome.ctaLabel, url: outcome.ctaUrl });
  }
  const metaActions = (outcome?.metadata as Record<string, unknown> | undefined)?.actions;
  if (Array.isArray(metaActions)) {
    metaActions.forEach((action) => {
      if (action && typeof action === "object") {
        const label = "label" in action ? String(action.label ?? "") : "";
        const url = "url" in action ? String(action.url ?? "") : undefined;
        if (label) actions.push({ label, url });
      }
    });
  }

  if (actions.length > 0) {
    doc.moveDown(0.5);
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(primary)
      .text("Recommended Next Steps", margin, doc.y);
    doc.moveDown(0.4);

    actions.forEach((action, idx) => {
      const stepY = doc.y;
      // Number circle
      doc
        .circle(margin + 6, stepY + 6, 8)
        .fill(primary);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(String(idx + 1), margin - 1, stepY + 2, {
          width: 16,
          align: "center",
        });
      const labelText = action.url
        ? `${action.label}`
        : action.label;
      doc
        .fontSize(10.5)
        .font("Helvetica-Bold")
        .fillColor("#334155")
        .text(labelText, margin + 22, stepY + 1, { width: contentWidth - 22 });
      if (action.url) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(primary)
          .text(action.url, margin + 22, doc.y + 1, {
            width: contentWidth - 22,
            link: action.url,
            underline: true,
          });
      }
      doc.moveDown(0.5);
    });
  }

  // -- PAGE BREAK for responses --
  doc.addPage();

  // -- RESPONSES HEADER --
  // Thin colored band
  doc.rect(0, 0, pageWidth, 50).fill(primary);
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("Assessment Responses", margin, 16);

  doc.y = 68;

  // -- RESPONSE TABLE --
  const answeredQuestions = data.definition.questions.filter((question) => {
    const value = data.answers[question.id];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });

  answeredQuestions.forEach((question, idx) => {
    const answer = renderAnswer(question, data.answers[question.id]);
    const rowY = doc.y;

    // Check if we need a new page (leave room for question + answer)
    if (rowY > doc.page.height - 100) {
      doc.addPage();
      doc.y = margin;
    }

    // Alternating row background
    if (idx % 2 === 0) {
      doc.rect(margin - 8, doc.y - 4, contentWidth + 16, 44).fill("#f8fafc");
    }

    // Question prompt
    doc
      .fontSize(10.5)
      .font("Helvetica-Bold")
      .fillColor(primary)
      .text(question.prompt, margin, doc.y, { width: contentWidth });

    // Answer
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#475569")
      .text(answer || "-", margin, doc.y + 2, { width: contentWidth });

    doc.moveDown(0.8);
  });

  // -- FOOTER --
  const footerY = doc.page.height - 50;
  doc
    .moveTo(margin, footerY)
    .lineTo(pageWidth - margin, footerY)
    .lineWidth(0.5)
    .strokeColor("#e2e8f0")
    .stroke();

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#94a3b8")
    .text(
      `Generated by ${data.workspace.name} | Powered by Quiz Pro Quo | ${formatTimestamp(data.timestamp)}`,
      margin,
      footerY + 8,
      { width: contentWidth, align: "center" },
    );
}

function getStatusInfo(
  outcome: Outcome | null,
  disqualified: boolean,
): { label: string; bgColor: string; textColor: string } {
  const status = outcome?.status;
  if (status === "pass") {
    return { label: "Strong Position", bgColor: "#10b981", textColor: "#10b981" };
  }
  if (status === "caution") {
    return { label: "Needs Attention", bgColor: "#f59e0b", textColor: "#d97706" };
  }
  if (status === "fail" || disqualified) {
    return { label: "Action Required", bgColor: "#ef4444", textColor: "#dc2626" };
  }

  // Infer from title
  const title = (outcome?.title ?? "").toLowerCase();
  if (title.includes("leader") || title.includes("pass") || title.includes("eligible")) {
    return { label: "Strong Position", bgColor: "#10b981", textColor: "#10b981" };
  }
  if (title.includes("caution") || title.includes("gap") || title.includes("review") || title.includes("ready")) {
    return { label: "Needs Attention", bgColor: "#f59e0b", textColor: "#d97706" };
  }
  if (title.includes("fail") || title.includes("foundation") || title.includes("beginner")) {
    return { label: "Action Required", bgColor: "#ef4444", textColor: "#dc2626" };
  }

  return { label: "Complete", bgColor: "#6366f1", textColor: "#4f46e5" };
}
