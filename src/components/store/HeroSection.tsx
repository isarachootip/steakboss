import Link from "next/link";
import type { LandingContentInput } from "@/schemas/content.schema";
import { formatBaht } from "@/lib/format";

export function HeroSection({
  landing,
  freeShipThreshold,
}: {
  landing: LandingContentInput;
  freeShipThreshold: number;
}) {
  const headlineLines = landing.headline.split(/\r?\n/).filter(Boolean);

  return (
    <section className="relative min-h-[72vh] flex items-end overflow-hidden bg-[#0d0b0a]">
      <img
        src={landing.heroImgUrl}
        alt={landing.heroImgAlt}
        className="absolute inset-0 w-full h-full object-cover object-[70%_50%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b0a]/95 via-[#0d0b0a]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b0a]/90 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 space-y-5">
        <p className="font-display text-xl sm:text-2xl text-sb-pink2 font-semibold">
          {landing.eyebrow}
        </p>
        <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl leading-[1.05]">
          {headlineLines.map((line, idx) => (
            <span key={idx}>
              {idx > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>
        <p className="max-w-lg text-base sm:text-lg text-[#e9ddd5]">
          {landing.subheadline}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={landing.primaryCtaHref} className="sb-btn">
            {landing.primaryCtaLabel}
          </Link>
          <Link href={landing.secondaryCtaHref} className="sb-btn-ghost">
            {landing.secondaryCtaLabel}
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold pt-2">
          {landing.badges.map((badge, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-sb-pink" /> {badge}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <i className="w-2 h-2 rounded-full bg-sb-pink" /> ส่งฟรีเมื่อครบ{" "}
            {formatBaht(freeShipThreshold)}
          </span>
        </div>
      </div>

      <div className="hidden md:block absolute right-8 bottom-10 z-10 w-44 bg-[#f1eeea] rounded-2xl p-2 shadow-2xl rotate-3">
        <img
          src={landing.packCardImgUrl}
          alt={landing.packCardCaption}
          className="rounded-xl w-full"
        />
        <p className="font-display font-bold text-xs text-[#3a1020] text-center pt-1.5">
          {landing.packCardCaption}
        </p>
      </div>
    </section>
  );
}
