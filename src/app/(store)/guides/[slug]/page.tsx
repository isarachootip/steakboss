import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublishedGuideBySlug,
  listPublishedGuides,
} from "@/services/content.service";
import { GuideDetailContent } from "@/components/store/GuideDetailContent";

export const dynamic = "force-dynamic";

export async function generateMetadata(context: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await context.params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) {
    return { title: "ไม่พบคู่มือ | Steakboss" };
  }
  return {
    title: `${guide.title} | Steakboss`,
    description: guide.summary,
    openGraph: {
      title: guide.title,
      description: guide.summary,
      ...(guide.coverImgUrl ? { images: [guide.coverImgUrl] } : {}),
    },
  };
}

export default async function GuideDetailPage(context: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await context.params;
  const [guide, allGuides] = await Promise.all([
    getPublishedGuideBySlug(slug),
    listPublishedGuides(),
  ]);

  if (!guide) {
    notFound();
  }

  const others = allGuides.filter((g) => g.id !== guide.id).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14">
      <GuideDetailContent guide={guide} />

      {others.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-sb-line">
          <h2 className="font-display font-extrabold text-2xl">
            คู่มือการปรุงวิธีอื่น ๆ ที่น่าสนใจ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {others.map((o) => (
              <Link
                key={o.id}
                href={`/guides/${o.slug}`}
                className="sb-panel space-y-1.5 hover:border-sb-pink transition"
              >
                <span className="text-xs font-display font-bold text-sb-pink2">
                  {o.equipmentLabel}
                </span>
                <h3 className="font-display font-bold text-base leading-snug">
                  {o.title}
                </h3>
                <p className="text-xs text-sb-mute">
                  {[o.tempLabel, o.durationLabel].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
