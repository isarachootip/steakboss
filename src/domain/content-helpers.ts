import type { CookingGuideDto } from "@/schemas/content.schema";

export type ResolvedVideo =
  | {
      kind: "youtube";
      embedUrl: string;
      externalUrl: string;
      platformLabel: "YouTube";
    }
  | {
      kind: "external";
      externalUrl: string;
      platformLabel: "TikTok" | "Instagram Reels" | "Facebook" | "วิดีโอแนะนำ";
    };

const YT_ID_REGEX = /^[a-zA-Z0-9_-]{6,20}$/;

export function resolveVideoEmbed(rawUrl: string): ResolvedVideo | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    if (YT_ID_REGEX.test(id)) {
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        externalUrl: trimmed,
        platformLabel: "YouTube",
      };
    }
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const vParam = parsed.searchParams.get("v") ?? "";
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const pathId =
      pathParts[0] === "shorts" || pathParts[0] === "embed"
        ? (pathParts[1] ?? "")
        : "";
    const id = vParam || pathId;
    if (YT_ID_REGEX.test(id)) {
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        externalUrl: trimmed,
        platformLabel: "YouTube",
      };
    }
  }

  if (host.endsWith("tiktok.com")) {
    return { kind: "external", externalUrl: trimmed, platformLabel: "TikTok" };
  }
  if (host.endsWith("instagram.com")) {
    return { kind: "external", externalUrl: trimmed, platformLabel: "Instagram Reels" };
  }
  if (host.endsWith("facebook.com") || host === "fb.watch") {
    return { kind: "external", externalUrl: trimmed, platformLabel: "Facebook" };
  }

  return { kind: "external", externalUrl: trimmed, platformLabel: "วิดีโอแนะนำ" };
}

const KEYWORD_RULES: ReadonlyArray<{ pattern: RegExp; targetHints: RegExp }> = [
  {
    pattern: /หม้อทอด|ไร้น้ำมัน|air\s*fryer|แอร์ฟราย/,
    targetHints: /air-fryer|หม้อทอด/,
  },
  {
    pattern: /ละลาย|น้ำแข็ง|แช่น้ำ|ฟรีซก่อน|เอาออกจากฟรีซ/,
    targetHints: /thaw|ละลาย/,
  },
  {
    pattern: /ไมโครเวฟ|เวฟ|เตาอบ|อยู่หอ|microwave|oven/,
    targetHints: /microwave|oven|ไมโครเวฟ|เตาอบ/,
  },
  {
    pattern: /กระทะ|ย่าง|ทอด|ปรุง|ทำยังไง|กี่นาที|ไฟเท่าไหร่/,
    targetHints: /pan|grill|กระทะ|ย่าง/,
  },
];

export function matchGuideForChatQuery(
  query: string,
  guides: readonly CookingGuideDto[]
): CookingGuideDto | null {
  if (guides.length === 0) return null;
  const q = query.toLowerCase();

  for (const g of guides) {
    const label = g.equipmentLabel.toLowerCase();
    if (label.length >= 3 && q.includes(label)) {
      return g;
    }
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(q)) {
      const matched = guides.find((g) =>
        rule.targetHints.test(`${g.slug} ${g.title} ${g.equipmentLabel}`.toLowerCase())
      );
      return matched ?? guides[0] ?? null;
    }
  }

  return null;
}

export function formatGuideChatReply(
  guide: CookingGuideDto,
  appBaseUrl?: string
): string {
  const specs = [guide.tempLabel, guide.durationLabel].filter(Boolean).join(" · ");
  const header = specs ? `${guide.title} (${specs})` : guide.title;
  const stepLines = guide.steps
    .slice(0, 3)
    .map((step, idx) => `${idx + 1}. ${step.title}: ${step.description}`)
    .join("\n");
  const cleanBase = (appBaseUrl || "").replace(/\/+$/, "");
  const linkPath = `${cleanBase}/guides/${guide.slug}`;
  return `${header}\n${stepLines}\nดูคู่มือเต็ม: ${linkPath} ครับ`;
}
